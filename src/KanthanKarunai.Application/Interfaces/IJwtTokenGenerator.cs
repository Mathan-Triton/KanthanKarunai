using System;
using KanthanKarunai.Domain.Entities;

namespace KanthanKarunai.Application.Interfaces;

public record TokenResult(string Token, DateTime ExpiresAt);

public interface IJwtTokenGenerator
{
    TokenResult GenerateToken(User user);
}
