using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using KanthanKarunai.Application.DTOs;
using KanthanKarunai.Application.Interfaces;
using KanthanKarunai.Domain.Entities;
using KanthanKarunai.Domain.Enums;
using KanthanKarunai.Infrastructure.Data;

namespace KanthanKarunai.API.Controllers;

[Authorize(Roles = "Admin")]
public class UsersController : BaseApiController
{
    private readonly ApplicationDbContext _context;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IAuditLogService _auditLogService;

    public UsersController(
        ApplicationDbContext context,
        IPasswordHasher passwordHasher,
        IAuditLogService auditLogService)
    {
        _context = context;
        _passwordHasher = passwordHasher;
        _auditLogService = auditLogService;
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<IEnumerable<UserDto>>>> GetUsers(
        [FromQuery] string? role,
        [FromQuery] bool? isActive)
    {
        var query = _context.Users
            .Include(u => u.Customer)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(role))
        {
            if (Enum.TryParse<UserRole>(role, true, out var roleEnum))
            {
                query = query.Where(u => u.Role == roleEnum);
            }
        }

        if (isActive.HasValue)
        {
            query = query.Where(u => u.IsActive == isActive.Value);
        }

        var users = await query
            .OrderByDescending(u => u.CreatedAt)
            .Select(u => new UserDto
            {
                Id = u.Id,
                Username = u.Username,
                FullName = u.FullName,
                Role = u.Role.ToString(),
                CustomerId = u.CustomerId,
                CustomerName = u.Customer != null ? u.Customer.Name : null,
                CustomerCode = u.Customer != null ? u.Customer.CustomerCode : null,
                IsActive = u.IsActive,
                CreatedAt = u.CreatedAt
            })
            .ToListAsync();

        return Ok(ApiResponse<IEnumerable<UserDto>>.SuccessResponse(users, "Users fetched successfully"));
    }

    [HttpPost("staff")]
    public async Task<ActionResult<ApiResponse<UserDto>>> CreateStaff([FromBody] CreateUserDto dto)
    {
        return await CreateUserInternal(dto, UserRole.Staff);
    }

    [HttpPost("driver")]
    public async Task<ActionResult<ApiResponse<UserDto>>> CreateDriver([FromBody] CreateUserDto dto)
    {
        return await CreateUserInternal(dto, UserRole.Driver);
    }

    [HttpPost("customer")]
    public async Task<ActionResult<ApiResponse<UserDto>>> CreateCustomerUser([FromBody] CreateUserDto dto)
    {
        if (!dto.CustomerId.HasValue)
        {
            return BadRequest(ApiResponse<UserDto>.ErrorResponse("Customer ID is required for a Customer account."));
        }

        var customerExists = await _context.Customers.AnyAsync(c => c.Id == dto.CustomerId.Value);
        if (!customerExists)
        {
            return BadRequest(ApiResponse<UserDto>.ErrorResponse("The linked customer does not exist."));
        }

        return await CreateUserInternal(dto, UserRole.Customer);
    }

    [HttpPost("{id:int}/toggle-status")]
    public async Task<ActionResult<ApiResponse<UserDto>>> ToggleStatus(int id)
    {
        var user = await _context.Users.Include(u => u.Customer).FirstOrDefaultAsync(u => u.Id == id);
        if (user == null)
        {
            return NotFound(ApiResponse<UserDto>.ErrorResponse("User not found."));
        }

        if (user.Username.Equals("Mathan", StringComparison.OrdinalIgnoreCase))
        {
            return BadRequest(ApiResponse<UserDto>.ErrorResponse("Cannot deactivate the primary Admin account."));
        }

        var oldValue = new { user.IsActive };
        user.IsActive = !user.IsActive;
        user.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        await _auditLogService.LogAsync("User Updated", "users", user.Id.ToString(), oldValue, user);

        var result = new UserDto
        {
            Id = user.Id,
            Username = user.Username,
            FullName = user.FullName,
            Role = user.Role.ToString(),
            CustomerId = user.CustomerId,
            CustomerName = user.Customer != null ? user.Customer.Name : null,
            CustomerCode = user.Customer != null ? user.Customer.CustomerCode : null,
            IsActive = user.IsActive,
            CreatedAt = user.CreatedAt
        };

        return Ok(ApiResponse<UserDto>.SuccessResponse(result, $"User status changed to {(user.IsActive ? "Active" : "Inactive")}"));
    }

    [HttpPost("{id:int}/reset-password")]
    public async Task<ActionResult<ApiResponse<object>>> ResetPassword(int id, [FromBody] ResetPasswordDto dto)
    {
        var user = await _context.Users.FindAsync(id);
        if (user == null)
        {
            return NotFound(ApiResponse<object>.ErrorResponse("User not found."));
        }

        if (string.IsNullOrWhiteSpace(dto.NewPassword) || dto.NewPassword.Length < 6)
        {
            return BadRequest(ApiResponse<object>.ErrorResponse("Password must be at least 6 characters."));
        }

        user.PasswordHash = _passwordHasher.HashPassword(dto.NewPassword);
        user.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        await _auditLogService.LogAsync("User Password Reset", "users", user.Id.ToString(), null, new { Message = "Password reset successfully" });

        return Ok(ApiResponse<object>.SuccessResponse(new { }, "User password reset successfully"));
    }

    [HttpPost("{id:int}/change-role")]
    public async Task<ActionResult<ApiResponse<UserDto>>> ChangeRole(int id, [FromBody] ChangeRoleDto dto)
    {
        var user = await _context.Users.Include(u => u.Customer).FirstOrDefaultAsync(u => u.Id == id);
        if (user == null)
        {
            return NotFound(ApiResponse<UserDto>.ErrorResponse("User not found."));
        }

        if (user.Username.Equals("Mathan", StringComparison.OrdinalIgnoreCase))
        {
            return BadRequest(ApiResponse<UserDto>.ErrorResponse("Cannot change role of primary Admin account."));
        }

        if (!Enum.TryParse<UserRole>(dto.Role, true, out var newRole))
        {
            return BadRequest(ApiResponse<UserDto>.ErrorResponse("Invalid user role."));
        }

        var oldValue = new { user.Role };
        user.Role = newRole;
        user.UpdatedAt = DateTime.UtcNow;

        // If changed to non-customer, clear CustomerId
        if (newRole != UserRole.Customer)
        {
            user.CustomerId = null;
        }

        await _context.SaveChangesAsync();

        await _auditLogService.LogAsync("Role Changed", "users", user.Id.ToString(), oldValue, user);

        var result = new UserDto
        {
            Id = user.Id,
            Username = user.Username,
            FullName = user.FullName,
            Role = user.Role.ToString(),
            CustomerId = user.CustomerId,
            CustomerName = user.Customer != null ? user.Customer.Name : null,
            CustomerCode = user.Customer != null ? user.Customer.CustomerCode : null,
            IsActive = user.IsActive,
            CreatedAt = user.CreatedAt
        };

        return Ok(ApiResponse<UserDto>.SuccessResponse(result, "User role changed successfully."));
    }

    [HttpDelete("{id:int}")]
    public async Task<ActionResult<ApiResponse<object>>> DeleteUser(int id)
    {
        var user = await _context.Users.FindAsync(id);
        if (user == null)
        {
            return NotFound(ApiResponse<object>.ErrorResponse("User not found."));
        }

        if (user.Username.Equals("Mathan", StringComparison.OrdinalIgnoreCase))
        {
            return BadRequest(ApiResponse<object>.ErrorResponse("Cannot delete primary Admin account."));
        }

        _context.Users.Remove(user);
        await _context.SaveChangesAsync();

        await _auditLogService.LogAsync("User Deleted", "users", id.ToString(), user, null);

        return Ok(ApiResponse<object>.SuccessResponse(new { }, "User deleted successfully"));
    }

    private async Task<ActionResult<ApiResponse<UserDto>>> CreateUserInternal(CreateUserDto dto, UserRole role)
    {
        if (string.IsNullOrWhiteSpace(dto.Username) || string.IsNullOrWhiteSpace(dto.FullName))
        {
            return BadRequest(ApiResponse<UserDto>.ErrorResponse("Username and Full Name are required."));
        }

        if (dto.Password != dto.ConfirmPassword)
        {
            return BadRequest(ApiResponse<UserDto>.ErrorResponse("Passwords do not match."));
        }

        var exists = await _context.Users.AnyAsync(u => u.Username.ToLower() == dto.Username.ToLower());
        if (exists)
        {
            return BadRequest(ApiResponse<UserDto>.ErrorResponse($"A user with username {dto.Username} already exists."));
        }

        var user = new User
        {
            Username = dto.Username,
            PasswordHash = _passwordHasher.HashPassword(dto.Password),
            FullName = dto.FullName,
            Role = role,
            CustomerId = dto.CustomerId,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        await _auditLogService.LogAsync("User Created", "users", user.Id.ToString(), null, user);

        var userDto = new UserDto
        {
            Id = user.Id,
            Username = user.Username,
            FullName = user.FullName,
            Role = user.Role.ToString(),
            CustomerId = user.CustomerId,
            IsActive = user.IsActive,
            CreatedAt = user.CreatedAt
        };

        return Ok(ApiResponse<UserDto>.SuccessResponse(userDto, $"{role} user created successfully"));
    }
}
