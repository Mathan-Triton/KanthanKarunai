using System;
using KanthanKarunai.Domain.Enums;

namespace KanthanKarunai.Domain.Entities;

public class LoanPayment
{
    public int Id { get; set; }
    
    public int LoanId { get; set; }
    public CustomerLoan Loan { get; set; } = null!;
    
    public int CustomerId { get; set; }
    public Customer Customer { get; set; } = null!;
    
    public int ScheduleId { get; set; }
    public LoanRepaymentSchedule Schedule { get; set; } = null!;
    
    public DateTime PaymentDate { get; set; }
    public decimal Amount { get; set; }
    public string? PaymentMonth { get; set; } // e.g. "August 2026"
    public PaymentMethod PaymentMethod { get; set; }
    
    public required string ReceiptNo { get; set; }
    public string? Notes { get; set; }
    
    public int CollectedBy { get; set; }
    public User Collector { get; set; } = null!;
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
