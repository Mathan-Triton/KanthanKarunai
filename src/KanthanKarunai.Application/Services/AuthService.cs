using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using KanthanKarunai.Application.DTOs;
using KanthanKarunai.Application.Interfaces;

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
        var user = await _dbContext.Users.FirstOrDefaultAsync(u => u.Username == request.Username);
        if (user == null || !user.IsActive)
        {
            return new LoginResponse(false, "", "", "", "", 0, null, DateTime.MinValue, "Invalid username or password");
        }

        var isPasswordValid = _passwordHasher.VerifyPassword(request.Password, user.PasswordHash);
        if (!isPasswordValid)
        {
            return new LoginResponse(false, "", "", "", "", 0, null, DateTime.MinValue, "Invalid username or password");
        }

        var tokenResult = _jwtTokenGenerator.GenerateToken(user);
        
        // Log user login in audit log
        await _auditLogService.LogAsync($"{user.Role} Login", "users", user.Id.ToString(), null, new { Username = user.Username });

        // Normalize role to PascalCase for consistent frontend handling
        var normalizedRole = user.Role switch
        {
            KanthanKarunai.Domain.Enums.UserRole.Admin    => "Admin",
            KanthanKarunai.Domain.Enums.UserRole.Staff    => "Staff",
            KanthanKarunai.Domain.Enums.UserRole.Customer => "Customer",
            KanthanKarunai.Domain.Enums.UserRole.Driver   => "Driver",
            _ => user.Role.ToString()
        };

        return new LoginResponse(true, tokenResult.Token, user.Username, user.FullName, normalizedRole, user.Id, user.CustomerId, tokenResult.ExpiresAt, "Login successful");
    }
}
