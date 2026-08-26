using System;
using KanthanKarunai.Domain.Enums;

namespace KanthanKarunai.Application.DTOs;

public class UserDto
{
    public int Id { get; set; }
    public required string Username { get; set; }
    public required string FullName { get; set; }
    public required string Role { get; set; }
    public int? CustomerId { get; set; }
    public string? CustomerName { get; set; }
    public string? CustomerCode { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class CreateUserDto
{
    public required string Username { get; set; }
    public required string FullName { get; set; }
    public required string Password { get; set; }
    public required string ConfirmPassword { get; set; }
    public int? CustomerId { get; set; }
}

public class ResetPasswordDto
{
    public required string NewPassword { get; set; }
}

public class ChangeRoleDto
{
    public required string Role { get; set; }
}
