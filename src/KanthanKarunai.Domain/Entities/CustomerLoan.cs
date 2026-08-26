using System;
using System.Collections.Generic;
using KanthanKarunai.Domain.Enums;

namespace KanthanKarunai.Domain.Entities;

public class CustomerLoan
{
    public int Id { get; set; }
    public int CustomerId { get; set; }
    public Customer Customer { get; set; } = null!;

    public required string LoanNumber { get; set; }
    public DateTime LoanDate { get; set; }
    
    public decimal LoanAmount { get; set; }
    public decimal InterestAmount { get; set; }
    public decimal ServiceCharge { get; set; }
    public decimal OtherCharges { get; set; }
    
    // TotalRecoverable = LoanAmount + InterestAmount + ServiceCharge + OtherCharges
    public decimal TotalRecoverable { get; set; }
    
    public PaymentFrequency RepaymentFrequency { get; set; } = PaymentFrequency.MONTHLY;
    
    public decimal InstallmentAmount { get; set; }
    public int NumberOfInstallments { get; set; }
    public DateTime FirstDueDate { get; set; }
    
    public decimal TotalPaid { get; set; }
    public decimal TotalPending { get; set; }
    public decimal RemainingAmount { get; set; }
    
    public ChitStatus Status { get; set; } = ChitStatus.ACTIVE; // Reusing ChitStatus since it has ACTIVE, COMPLETED, CANCELLED
    
    public string? Notes { get; set; }
    
    public int CreatedBy { get; set; }
    public User Creator { get; set; } = null!;
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    
    public ICollection<LoanRepaymentSchedule> Schedules { get; set; } = new List<LoanRepaymentSchedule>();
    public ICollection<LoanPayment> Payments { get; set; } = new List<LoanPayment>();
}
