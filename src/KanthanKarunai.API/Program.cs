using System;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using KanthanKarunai.API.Middleware;
using KanthanKarunai.Infrastructure;
using KanthanKarunai.Infrastructure.Data;

var builder = WebApplication.CreateBuilder(args);

// 1. Add services to the container.
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
        options.JsonSerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
    });

builder.Services.AddEndpointsApiExplorer();

// 2. Swagger Configuration with JWT support
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo 
    { 
        Title = "Kanthan Karunai Chit Fund API", 
        Version = "v1",
        Description = "API endpoints for Kanthan Karunai Chit Fund Management System"
    });

    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT Authorization header using the Bearer scheme. Enter 'Bearer' [space] and then your token in the text input below. Example: 'Bearer 12345abcdef'",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });

    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

// 3. Register Clean Architecture Infrastructure Services (DbContext, Auth, CurrentUser, App Services)
builder.Services.AddInfrastructureServices(builder.Configuration);

// 4. JWT Authentication configuration
var secret = builder.Configuration["JwtSettings:Secret"] ?? "KanthanKarunaiSuperSecretKeyForJWTAuthToken1234567890!";
var issuer = builder.Configuration["JwtSettings:Issuer"] ?? "KanthanKarunaiAPI";
var audience = builder.Configuration["JwtSettings:Audience"] ?? "KanthanKarunaiWeb";

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = false,
        ValidateAudience = false,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret)),
        ClockSkew = TimeSpan.Zero,
        RoleClaimType = System.Security.Claims.ClaimTypes.Role,
        NameClaimType = System.Security.Claims.ClaimTypes.NameIdentifier
    };
    options.Events = new Microsoft.AspNetCore.Authentication.JwtBearer.JwtBearerEvents
    {
        OnAuthenticationFailed = context =>
        {
            var logger = context.HttpContext.RequestServices.GetService(typeof(Microsoft.Extensions.Logging.ILogger<Program>)) as Microsoft.Extensions.Logging.ILogger<Program>;
            logger?.LogWarning("[AUTH FAILED] Path: {Path} | Error: {Error}", context.Request.Path, context.Exception.Message);
            return System.Threading.Tasks.Task.CompletedTask;
        },
        OnForbidden = context =>
        {
            var user = context.HttpContext.User;
            var logger = context.HttpContext.RequestServices.GetService(typeof(Microsoft.Extensions.Logging.ILogger<Program>)) as Microsoft.Extensions.Logging.ILogger<Program>;
            var role = user.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value ?? "(none)";
            var name = user.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? "(none)";
            logger?.LogWarning("[403 FORBIDDEN] Path: {Path} | User: {User} | Role: {Role}", context.Request.Path, name, role);
            return System.Threading.Tasks.Task.CompletedTask;
        }
    };
});

// 5. CORS policy for React Frontend integration
builder.Services.AddCors(options =>
{
    options.AddPolicy("CorsPolicy", policy =>
    {
        policy.WithOrigins(
                "http://localhost:5173",
                "http://127.0.0.1:5173",
                "http://localhost:5211",
                "http://127.0.0.1:5211")
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

// 6. Register role normalization claims transformer
// Normalizes ADMIN/admin -> Admin, STAFF -> Staff, etc. for ALL incoming tokens
// This means existing browser tokens with wrong casing work without re-login
builder.Services.AddTransient<IClaimsTransformation, RoleNormalizationTransformer>();

var app = builder.Build();

// 6. Run migrations and seed data
using (var scope = app.Services.CreateScope())
{
    try
    {
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        await DatabaseSeeder.SeedAsync(context);
        Console.WriteLine("Database migration and seeding completed successfully.");
    }
    catch (Exception ex)
    {
        Console.WriteLine($"An error occurred during database seeding/migration: {ex.Message}");
    }
}

// 7. Configure HTTP request pipeline
app.UseMiddleware<ExceptionHandlingMiddleware>();

if (app.Environment.IsDevelopment() || true) // Enable Swagger in all environments for testing ease
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "Kanthan Karunai Chit Fund API v1");
    });
}

app.UseCors("CorsPolicy");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();
