using System;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using KanthanKarunai.Application.Interfaces;
using KanthanKarunai.Domain.Entities;
using KanthanKarunai.Infrastructure.Data;

namespace KanthanKarunai.Infrastructure.Services;

public class AuditLogService : IAuditLogService
{
    private readonly ApplicationDbContext _dbContext;
    private readonly ICurrentUserService _currentUserService;

    public AuditLogService(ApplicationDbContext dbContext, ICurrentUserService currentUserService)
    {
        _dbContext = dbContext;
        _currentUserService = currentUserService;
    }

    public async Task LogAsync(string action, string tableName, string recordId, object? oldValue, object? newValue)
    {
        try
        {
            var options = new JsonSerializerOptions 
            { 
                ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles,
                DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull
            };
            var oldJson = oldValue != null ? JsonSerializer.Serialize(oldValue, options) : null;
            var newJson = newValue != null ? JsonSerializer.Serialize(newValue, options) : null;

            int? validUserId = null;
            if (_currentUserService.UserId.HasValue)
            {
                var userExists = await _dbContext.Users.AnyAsync(u => u.Id == _currentUserService.UserId.Value);
                if (userExists)
                {
                    validUserId = _currentUserService.UserId.Value;
                }
            }

            var auditLog = new AuditLog
            {
                UserId = validUserId,
                Action = action,
                TableName = tableName,
                RecordId = recordId,
                OldValue = oldJson,
                NewValue = newJson,
                CreatedAt = DateTime.UtcNow
            };

            _dbContext.AuditLogs.Add(auditLog);
            await _dbContext.SaveChangesAsync();
        }
        catch
        {
            // Audit logging failures must not abort core business transactions
        }
    }
}
