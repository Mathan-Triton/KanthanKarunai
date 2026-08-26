using System;
using KanthanKarunai.Domain.Enums;

namespace KanthanKarunai.Application.DTOs;

public class ChitDto
{
    public int Id { get; set; }
    public int CustomerId { get; set; }
    public string? CustomerName { get; set; }
    public string? CustomerCode { get; set; }
    public string? CustomerMobile { get; set; }
    public required string ChitName { get; set; }
    public PaymentFrequency PaymentFrequency { get; set; }
    public decimal PaymentAmount { get; set; }
    public decimal MonthlyPayment => PaymentAmount;
    public decimal TotalChitAmount { get; set; }
    public int Duration { get; set; }
    public DateTime StartDate { get; set; }
    public string? StartMonth { get; set; }
    public DateTime EndDate { get; set; }
    public decimal PaidAmount { get; set; }
    public decimal PendingAmount { get; set; }
    public string? NextPaymentMonth { get; set; }
    public DateTime? NextPaymentDueDate { get; set; }
    public ChitStatus Status { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class CreateChitDto
{
    public int CustomerId { get; set; }
    public string? ChitName { get; set; }
    public PaymentFrequency PaymentFrequency { get; set; } = PaymentFrequency.MONTHLY;
    public decimal MonthlyPayment { get; set; }
    public decimal? PaymentAmount { get; set; }
    public decimal? TotalChitAmount { get; set; }
    public int? Duration { get; set; }
    public string? StartMonth { get; set; } // e.g. "2026-08", "August 2026"
    public DateTime? StartDate { get; set; }
    public string? Notes { get; set; }
}

