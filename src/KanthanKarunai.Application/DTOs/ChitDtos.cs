using System;
using System.Collections.Generic;
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
    public decimal ChitAmount => TotalChitAmount;
    public int Duration { get; set; }
    public int TotalMonths => Duration;
    public DateTime StartDate { get; set; }
    public string? StartMonth { get; set; }
    public DateTime EndDate { get; set; }

    // Amount Taken / Chit Payout fields
    public decimal? AmountTaken { get; set; }
    public int? AmountTakenMonth { get; set; }
    public DateTime? AmountTakenDate { get; set; }
    public decimal? InterestRate { get; set; }
    public decimal? AdjustedMonthlyPayment { get; set; }
    public decimal? MonthlyAfterAmountTaken => AdjustedMonthlyPayment;
    public decimal MonthlyBeforeAmountTaken => PaymentAmount;

    // Computed Progress & Collection Metrics
    public int CompletedMonths { get; set; }
    public int RemainingMonths { get; set; }
    public decimal CurrentMonthlyDue { get; set; }
    public decimal RemainingCollection { get; set; }
    public decimal TotalRemainingCollection => RemainingCollection;

    public decimal TotalPaid { get; set; }
    public decimal PaidAmount { get; set; }
    public decimal RemainingChitAmount { get; set; }
    public decimal RemainingAmount { get; set; }
    public decimal ExpectedTillCurrentMonth { get; set; }
    public decimal PendingChitDue { get; set; }
    public decimal PendingAmount { get; set; }
    public decimal NextPaymentAmount { get; set; }
    public decimal NextPayment => NextPaymentAmount;
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
    public decimal? ChitAmount { get; set; }
    public decimal? TotalChitAmount { get; set; }
    public int? Duration { get; set; }
    public string? StartMonth { get; set; } // e.g. "2026-08", "August 2026"
    public DateTime? StartDate { get; set; }
    public string? Notes { get; set; }
}

public class RecordAmountTakenDto
{
    public int ChitId { get; set; }
    public decimal AmountTaken { get; set; }
    public int AmountTakenMonth { get; set; }
    public DateTime? AmountTakenDate { get; set; }
    public decimal? InterestRate { get; set; } = 1.0m;
}

public class AmountTakenPreviewDto
{
    public int ChitId { get; set; }
    public decimal ChitAmount { get; set; }
    public int Duration { get; set; }
    public decimal MonthlyPayment { get; set; }
    public decimal AmountTaken { get; set; }
    public int AmountTakenMonth { get; set; }
    public decimal InterestRate { get; set; }
    public decimal MonthlyInterestAmount { get; set; }
    public decimal AdjustedMonthlyPayment { get; set; }
    public int CompletedMonths { get; set; }
    public int RemainingMonths { get; set; }
    public decimal RemainingCollection { get; set; }
}

public class PendingChitDueItemDto
{
    public int ChitId { get; set; }
    public int CustomerId { get; set; }
    public string? CustomerName { get; set; }
    public string? CustomerCode { get; set; }
    public string? CustomerMobile { get; set; }
    public decimal ChitAmount { get; set; }
    public int Duration { get; set; }
    public decimal MonthlyBeforeAmountTaken { get; set; }
    public decimal? AmountTaken { get; set; }
    public int? AmountTakenMonth { get; set; }
    public int CompletedMonths { get; set; }
    public int RemainingMonths { get; set; }
    public decimal? MonthlyAfterAmountTaken { get; set; }
    public decimal CurrentMonthlyDue { get; set; }
    public decimal PendingChitDue { get; set; }
    public decimal NextPayment { get; set; }
    public string Status { get; set; } = "Active";
}
