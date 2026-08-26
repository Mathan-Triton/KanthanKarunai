using System;
using KanthanKarunai.Domain.Enums;

namespace KanthanKarunai.Domain.Entities;

public class Payment
{
    public int Id { get; set; }
    public int CustomerId { get; set; }
    public int ChitId { get; set; }
    public int PaymentScheduleId { get; set; }
    public DateTime PaymentDate { get; set; }
    public decimal Amount { get; set; }
    public string? PaymentMonth { get; set; } // e.g. "August 2026"
    public string PaymentType { get; set; } = "INSTALLMENT"; // INSTALLMENT, FINE, ADVANCE
    public PaymentMethod PaymentMethod { get; set; }
    public required string ReceiptNo { get; set; }
    public string? Notes { get; set; }
    public int CollectedBy { get; set; } // User Id
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public virtual Customer? Customer { get; set; }
    public virtual Chit? Chit { get; set; }
    public virtual PaymentSchedule? PaymentSchedule { get; set; }
    public virtual User? Collector { get; set; }
}
