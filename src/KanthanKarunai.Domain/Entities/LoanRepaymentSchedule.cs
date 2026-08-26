using System;
using KanthanKarunai.Domain.Enums;

namespace KanthanKarunai.Domain.Entities;

public class LoanRepaymentSchedule
{
    public int Id { get; set; }
    
    public int LoanId { get; set; }
    public CustomerLoan Loan { get; set; } = null!;
    
    public int CustomerId { get; set; }
    public Customer Customer { get; set; } = null!;
    
    public int InstallmentNo { get; set; }
    public DateTime DueDate { get; set; }
    
    public decimal ExpectedAmount { get; set; }
    public decimal PaidAmount { get; set; }
    public decimal PendingAmount { get; set; }
    public decimal AdvanceAmount { get; set; }
    
    public PaymentStatus Status { get; set; } = PaymentStatus.PENDING;
    
    public DateTime? PaidDate { get; set; }
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
