using System;

namespace KanthanKarunai.Domain.Entities;

public class AuditLog
{
    public int Id { get; set; }
    public int? UserId { get; set; } // Null if performed by system/anonymous
    public required string Action { get; set; } // Create, Update, Delete
    public required string TableName { get; set; }
    public required string RecordId { get; set; }
    public string? OldValue { get; set; } // JSON
    public string? NewValue { get; set; } // JSON
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public virtual User? User { get; set; }
}
