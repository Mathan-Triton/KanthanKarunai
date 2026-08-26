using System;
using KanthanKarunai.Domain.Enums;

namespace KanthanKarunai.Application.DTOs;

public class CreateLoanDto
{
    public int CustomerId { get; set; }
    public decimal PrincipalAmount { get; set; }
    public decimal? LoanAmount { get; set; }
    public decimal InterestAmount { get; set; }
    public decimal ServiceCharge { get; set; }
    public decimal OtherCharges { get; set; }
    
    public PaymentFrequency RepaymentFrequency { get; set; } = PaymentFrequency.MONTHLY;
    
    public decimal MonthlyPaymentAmount { get; set; }
    public decimal? InstallmentAmount { get; set; }
    public string? LoanStartMonth { get; set; } // e.g. "August 2026", "2026-08"
    public DateTime? LoanDate { get; set; }
    public DateTime? FirstDueDate { get; set; }
    public string? Notes { get; set; }
}

public class LoanDto
{
    public int Id { get; set; }
    public int CustomerId { get; set; }
    public string? CustomerName { get; set; }
    public string? CustomerCode { get; set; }
    public string? CustomerMobile { get; set; }
    
    public required string LoanNumber { get; set; }
    public DateTime LoanDate { get; set; }
    public string? StartMonth { get; set; }
    
    public decimal PrincipalAmount { get; set; }
    public decimal LoanAmount => PrincipalAmount;
    public decimal InterestAmount { get; set; }
    public decimal ServiceCharge { get; set; }
    public decimal OtherCharges { get; set; }
    public decimal TotalLoanAmount => PrincipalAmount + InterestAmount + ServiceCharge + OtherCharges;
    public decimal TotalRecoverable => TotalLoanAmount;
    
    public PaymentFrequency RepaymentFrequency { get; set; }
    
    public decimal MonthlyPayment => InstallmentAmount;
    public decimal InstallmentAmount { get; set; }
    public int NumberOfInstallments { get; set; }
    public int NumberOfMonths => NumberOfInstallments;
    public DateTime FirstDueDate { get; set; }
    
    public decimal TotalPaid { get; set; }
    public decimal TotalPending { get; set; }
    public decimal RemainingAmount { get; set; }
    public decimal PendingAmount => RemainingAmount;
    
    public string? CurrentPendingMonth { get; set; }
    public string? NextPaymentMonth { get; set; }
    public DateTime? NextPaymentDueDate { get; set; }
    
    public ChitStatus Status { get; set; }
    public string LoanStatusText => Status.ToString();
    
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class LoanRepaymentScheduleDto
{
    public int Id { get; set; }
    public int LoanId { get; set; }
    public string? LoanNumber { get; set; }
    
    public int CustomerId { get; set; }
    public string? CustomerName { get; set; }
    public string? CustomerCode { get; set; }
    public string? CustomerMobile { get; set; }
    
    public int InstallmentNo { get; set; }
    public DateTime DueDate { get; set; }
    public string DueMonth => DueDate.ToString("MMMM yyyy");
    
    public decimal ExpectedAmount { get; set; }
    public decimal PaidAmount { get; set; }
    public decimal PendingAmount { get; set; }
    public decimal AdvanceAmount { get; set; }
    
    public PaymentStatus Status { get; set; }
    public string StatusText => DueDate.Date > DateTime.UtcNow.Date && Status == PaymentStatus.PENDING ? "Upcoming" : (Status == PaymentStatus.PAID ? "Paid" : "Pending");
    public DateTime? PaidDate { get; set; }
    
    public int OverdueDays { get; set; }
}

public class CreateLoanPaymentDto
{
    public int LoanId { get; set; }
    public int? CustomerId { get; set; }
    public string? PaymentMonth { get; set; } // e.g. "August 2026", "2026-08"
    public DateTime PaymentDate { get; set; } = DateTime.UtcNow;
    public decimal Amount { get; set; }
    public PaymentMethod PaymentMethod { get; set; } = PaymentMethod.CASH;
    public string? Notes { get; set; }
    public string? Remarks => Notes;
}

public class LoanPaymentDto
{
    public int Id { get; set; }
    public int LoanId { get; set; }
    public string? LoanNumber { get; set; }
    
    public int CustomerId { get; set; }
    public string? CustomerName { get; set; }
    public string? CustomerCode { get; set; }
    public string? CustomerMobile { get; set; }
    
    public int ScheduleId { get; set; }
    public int InstallmentNo { get; set; }
    
    public DateTime PaymentDate { get; set; }
    public decimal Amount { get; set; }
    public string? PaymentMonth { get; set; }
    public PaymentMethod PaymentMethod { get; set; }
    
    public required string ReceiptNo { get; set; }
    public string? Notes { get; set; }
    public string? Remarks => Notes;
    
    public int CollectedBy { get; set; }
    public string? CollectedByName { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class UpdateLoanStatusDto
{
    public ChitStatus Status { get; set; }
    public string? Notes { get; set; }
}

