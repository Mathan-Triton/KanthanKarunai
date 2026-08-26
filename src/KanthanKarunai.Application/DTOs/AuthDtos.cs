using System;

namespace KanthanKarunai.Application.DTOs;

public record LoginRequest(string Username, string Password);

public record LoginResponse(
    bool Success,
    string Token,
    string Username,
    string FullName,
    string Role,
    int UserId,
    int? CustomerId,
    DateTime ExpiresAt,
    string Message
);
