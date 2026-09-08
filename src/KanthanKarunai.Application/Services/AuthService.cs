using System;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using KanthanKarunai.Application.DTOs;
using KanthanKarunai.Application.Interfaces;
using KanthanKarunai.Domain.Entities;
using KanthanKarunai.Domain.Enums;

namespace KanthanKarunai.Application.Services;

public class AuthService : IAuthService
{
    private readonly IApplicationDbContext _dbContext;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IJwtTokenGenerator _jwtTokenGenerator;
    private readonly IAuditLogService _auditLogService;

    public AuthService(
        IApplicationDbContext dbContext,
        IPasswordHasher passwordHasher,
        IJwtTokenGenerator jwtTokenGenerator,
        IAuditLogService auditLogService)
    {
        _dbContext = dbContext;
        _passwordHasher = passwordHasher;
        _jwtTokenGenerator = jwtTokenGenerator;
        _auditLogService = auditLogService;
    }

    public async Task<LoginResponse> LoginAsync(LoginRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Username) || string.IsNullOrWhiteSpace(request.Password))
        {
            return new LoginResponse(false, "", "", "", "", 0, null, DateTime.MinValue, "Username and password are required.");
        }

        var normalizedUsername = request.Username.Trim();
        var rawPassword = request.Password.Trim();
        var decodedPassword = TryDecodeBase64(rawPassword);

        // 1. Admin Hardcoded credentials support: Username: Admin / Password: Admin@123 (or base64 encoded)
        bool isAdminHardcoded = normalizedUsername.Equals("Admin", StringComparison.OrdinalIgnoreCase) &&
                                (rawPassword == "Admin@123" || decodedPassword == "Admin@123" || rawPassword == "QWRtaW5AMTIz");

        var user = await _dbContext.Users.FirstOrDefaultAsync(u => u.Username.ToLower() == normalizedUsername.ToLower());

        if (isAdminHardcoded)
        {
            if (user == null)
            {
                // Create the Admin user if it doesn't exist yet
                user = new User
                {
                    Username = "Admin",
                    PasswordHash = _passwordHasher.HashPassword("Admin@123"),
                    FullName = "System Administrator",
                    Role = UserRole.Admin,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                _dbContext.Users.Add(user);
                await _dbContext.SaveChangesAsync();
            }
            else if (!user.IsActive)
            {
                user.IsActive = true;
                user.Role = UserRole.Admin;
                await _dbContext.SaveChangesAsync();
            }
        }
        else
        {
            if (user == null || !user.IsActive)
            {
                return new LoginResponse(false, "", "", "", "", 0, null, DateTime.MinValue, "Invalid username or password");
            }

            // Verify with raw password, decoded password, or direct hash match
            var isPasswordValid = _passwordHasher.VerifyPassword(rawPassword, user.PasswordHash) ||
                                  _passwordHasher.VerifyPassword(decodedPassword, user.PasswordHash);

            if (!isPasswordValid)
            {
                return new LoginResponse(false, "", "", "", "", 0, null, DateTime.MinValue, "Invalid username or password");
            }
        }

        var tokenResult = _jwtTokenGenerator.GenerateToken(user);
        
        // Log user login in audit log
        await _auditLogService.LogAsync($"{user.Role} Login", "users", user.Id.ToString(), null, new { Username = user.Username });

        // Normalize role to PascalCase for consistent frontend handling
        var normalizedRole = user.Role switch
        {
            UserRole.Admin    => "Admin",
            UserRole.Staff    => "Staff",
            UserRole.Customer => "Customer",
            UserRole.Driver   => "Driver",
            _ => user.Role.ToString()
        };

        return new LoginResponse(true, tokenResult.Token, user.Username, user.FullName, normalizedRole, user.Id, user.CustomerId, tokenResult.ExpiresAt, "Login successful");
    }

    private static string TryDecodeBase64(string input)
    {
        try
        {
            var bytes = Convert.FromBase64String(input);
            var decoded = Encoding.UTF8.GetString(bytes);
            if (!string.IsNullOrWhiteSpace(decoded) && decoded.All(c => !char.IsControl(c) || c == '\n' || c == '\r' || c == '\t'))
            {
                return decoded;
            }
        }
        catch
        {
            // Not a valid Base64 string
        }
        return input;
    }
}
