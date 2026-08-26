using System;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using KanthanKarunai.Application.Interfaces;
using KanthanKarunai.Domain.Entities;

namespace KanthanKarunai.Infrastructure.Authentication;

public class JwtTokenGenerator : IJwtTokenGenerator
{
    private readonly IConfiguration _configuration;

    public JwtTokenGenerator(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    public TokenResult GenerateToken(User user)
    {
        var secret = _configuration["JwtSettings:Secret"] ?? "KanthanKarunaiSuperSecretKeyForJWTAuthToken1234567890!";
        var issuer = _configuration["JwtSettings:Issuer"] ?? "KanthanKarunaiAPI";
        var audience = _configuration["JwtSettings:Audience"] ?? "KanthanKarunaiWeb";
        var expiryMinutes = double.TryParse(_configuration["JwtSettings:ExpiryMinutes"], out var minutes) ? minutes : 1440; // Default 1 day

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        // Normalize role to PascalCase so [Authorize(Roles="Admin")] always matches
        // DB may store "ADMIN" or "admin" — we always emit the enum member name
        var roleString = user.Role switch
        {
            KanthanKarunai.Domain.Enums.UserRole.Admin    => "Admin",
            KanthanKarunai.Domain.Enums.UserRole.Staff    => "Staff",
            KanthanKarunai.Domain.Enums.UserRole.Customer => "Customer",
            KanthanKarunai.Domain.Enums.UserRole.Driver   => "Driver",
            _ => user.Role.ToString()
        };

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Username),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Name, user.FullName),
            new Claim(ClaimTypes.Role, roleString)
        };

        var expires = DateTime.UtcNow.AddMinutes(expiryMinutes);

        var token = new JwtSecurityToken(
            issuer: issuer,
            audience: audience,
            claims: claims,
            expires: expires,
            signingCredentials: creds
        );

        var tokenString = new JwtSecurityTokenHandler().WriteToken(token);
        return new TokenResult(tokenString, expires);
    }
}
