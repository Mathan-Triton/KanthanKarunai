using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using KanthanKarunai.Application.Interfaces;
using KanthanKarunai.Application.Services;
using KanthanKarunai.Infrastructure.Authentication;
using KanthanKarunai.Infrastructure.Data;
using KanthanKarunai.Infrastructure.Services;

namespace KanthanKarunai.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructureServices(this IServiceCollection services, IConfiguration configuration)
    {
        // 1. DbContext registration (PostgreSQL)
        var connectionString = configuration.GetConnectionString("DefaultConnection") 
                               ?? "Host=localhost;Port=5432;Database=KanthanKarunai;Username=postgres;Password=postgres";
        
        services.AddDbContext<ApplicationDbContext>(options =>
            options.UseNpgsql(connectionString));

        services.AddScoped<IApplicationDbContext>(provider => 
            provider.GetRequiredService<ApplicationDbContext>());

        // 2. HTTP context accessor for user claims extraction

        services.AddHttpContextAccessor();

        // 3. Security services
        services.AddScoped<IPasswordHasher, BCryptPasswordHasher>();
        services.AddScoped<IJwtTokenGenerator, JwtTokenGenerator>();
        services.AddScoped<ICurrentUserService, CurrentUserService>();
        services.AddScoped<IAuditLogService, AuditLogService>();

        // 4. Application services
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<ICustomerService, CustomerService>();
        services.AddScoped<IChitService, ChitService>();
        services.AddScoped<IPaymentService, PaymentService>();
        services.AddScoped<IPayoutService, PayoutService>();
        services.AddScoped<IExpenseService, ExpenseService>();
        services.AddScoped<IDashboardService, DashboardService>();
        services.AddScoped<IReportService, ReportService>();
        services.AddScoped<ILoanService, LoanService>();
        services.AddScoped<IGetChitService, GetChitService>();
        services.AddScoped<INotificationService, FirebaseNotificationService>();

        return services;
    }
}
