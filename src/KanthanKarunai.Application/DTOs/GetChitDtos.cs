using System;
using System.Collections.Generic;
using KanthanKarunai.Domain.Enums;

namespace KanthanKarunai.Application.DTOs;

public class GetChitDto
{
    public int Id { get; set; }
    public int CustomerId { get; set; }
    public string? CustomerName { get; set; }
    public string? CustomerCode { get; set; }
    public string? CustomerMobile { get; set; }
    public decimal PrincipalAmount { get; set; }
    public decimal InterestRate { get; set; } = 1.0m;
    public DateTime ReceivedDate { get; set; }
    public decimal OutstandingPrincipal { get; set; }
    public decimal MonthlyInterest { get; set; }
    public decimal CurrentDue { get; set; }
    public decimal NextMonthDue { get; set; }
    public decimal TotalInterestPaid { get; set; }
    public decimal TotalPrincipalPaid { get; set; }
    public decimal TotalPaid => TotalInterestPaid + TotalPrincipalPaid;
    public string Status { get; set; } = "ACTIVE";
    public string? Notes { get; set; }
    public string? CreatedByName { get; set; }
    public DateTime CreatedAt { get; set; }
    public List<GetChitPaymentDto> Payments { get; set; } = new();
}

public class CreateGetChitDto
{
    public int CustomerId { get; set; }
    public decimal PrincipalAmount { get; set; }
    public decimal AmountReceived { get => PrincipalAmount; set => PrincipalAmount = value; }
    public decimal? InterestRate { get; set; } = 1.0m;
    public DateTime? ReceivedDate { get; set; }
    public string? Notes { get; set; }
}

public class GetChitPaymentDto
{
    public int Id { get; set; }
    public int GetChitId { get; set; }
    public int CustomerId { get; set; }
    public string? CustomerName { get; set; }
    public string? CustomerCode { get; set; }
    public string? CustomerMobile { get; set; }
    public DateTime PaymentDate { get; set; }
    public decimal PaymentAmount { get; set; }
    public decimal InterestAmount { get; set; }
    public decimal PrincipalPaidAmount { get; set; }
    public decimal RemainingPrincipal { get; set; }
    public PaymentMethod PaymentMethod { get; set; }
    public required string ReceiptNo { get; set; }
    public string? Remarks { get; set; }
    public string? CollectedByName { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class RecordGetChitPaymentDto
{
    public int CustomerId { get; set; }
    public int GetChitId { get; set; }
    public DateTime PaymentDate { get; set; } = DateTime.UtcNow;
    public decimal PaymentAmount { get; set; }
    public PaymentMethod PaymentMethod { get; set; } = PaymentMethod.CASH;
    public string? Remarks { get; set; }
}

public class PaymentAllocationPreviewDto
{
    public int GetChitId { get; set; }
    public decimal PaymentAmount { get; set; }
    public decimal CurrentOutstandingPrincipal { get; set; }
    public decimal CurrentMonthlyInterest { get; set; }
    public decimal AllocatedInterest { get; set; }
    public decimal AllocatedPrincipal { get; set; }
    public decimal NewOutstandingPrincipal { get; set; }
    public decimal NextMonthInterest { get; set; }
    public decimal NextMonthDue { get; set; }
}

public class CustomerGetChitGroupDto
{
    public int CustomerId { get; set; }
    public string? CustomerName { get; set; }
    public string? CustomerCode { get; set; }
    public string? CustomerMobile { get; set; }
    public decimal TotalOriginalAmount { get; set; }
    public decimal TotalOutstandingPrincipal { get; set; }
    public decimal TotalMonthlyInterest { get; set; }
    public decimal TotalCurrentDue { get; set; }
    public decimal TotalPaid { get; set; }
    public int TransactionsCount { get; set; }
    public List<GetChitDto> Transactions { get; set; } = new();
}

public class PendingGetChitDueDto
{
    public int GetChitId { get; set; }
    public int CustomerId { get; set; }
    public string? CustomerName { get; set; }
    public string? CustomerCode { get; set; }
    public string? CustomerMobile { get; set; }
    public decimal OriginalAmount { get; set; }
    public decimal OutstandingPrincipal { get; set; }
    public decimal CurrentMonthInterest { get; set; }
    public decimal CurrentDue { get; set; }
    public decimal TotalPaid { get; set; }
    public decimal NextMonthDue { get; set; }
    public string Status { get; set; } = "Pending";
}
