using System;

namespace KanthanKarunai.Application.DTOs;

public class CustomerDto
{
    public int Id { get; set; }
    public required string CustomerCode { get; set; }
    public required string Name { get; set; }
    public required string MobileNo { get; set; }
    public string? AlternativeMobile { get; set; }
    public string? Address { get; set; }
    public string? City { get; set; }
    public string? AadhaarNumber { get; set; }
    public DateTime JoinDate { get; set; }
    public string Status { get; set; } = "ACTIVE";
    public bool IsActive { get; set; } = true;
    public int ActiveChitCount { get; set; }
    public decimal PendingAmount { get; set; }
    public string? TemporaryPassword { get; set; }
}

public class CreateCustomerDto
{
    public required string Name { get; set; }
    public required string MobileNo { get; set; }
    public string? AlternativeMobile { get; set; }
    public string? Address { get; set; }
    public string? City { get; set; }
    public string? AadhaarNumber { get; set; }
    public DateTime JoinDate { get; set; } = DateTime.UtcNow;
    public bool CreateUserAccount { get; set; }
    public string? UserPassword { get; set; }

    // Chit Information parameters
    public string? ChitName { get; set; }
    public string? PaymentFrequency { get; set; } // "DAILY", "WEEKLY", "MONTHLY"
    public decimal? PaymentAmount { get; set; }
    public decimal? TotalChitAmount { get; set; }
    public int? Duration { get; set; }
    public DateTime? StartDate { get; set; }
    public string? ChitNotes { get; set; }
}

public class UpdateCustomerDto
{
    public required string Name { get; set; }
    public required string MobileNo { get; set; }
    public string? AlternativeMobile { get; set; }
    public string? Address { get; set; }
    public string? City { get; set; }
    public string? AadhaarNumber { get; set; }
    public DateTime JoinDate { get; set; }
    public string Status { get; set; } = "ACTIVE";
    public bool IsActive { get; set; } = true;
}

public class CustomerSummaryDto
{
    public int CustomerId { get; set; }
    public required string CustomerCode { get; set; }
    public required string Name { get; set; }
    public required string MobileNo { get; set; }
    public string? AlternativeMobile { get; set; }
    public string? Address { get; set; }
    public string? City { get; set; }
    public string? AadhaarNumber { get; set; }
    public DateTime JoinDate { get; set; }
    public string Status { get; set; } = "ACTIVE";

    // Chit Summary
    public int? ChitId { get; set; }
    public string? ChitName { get; set; }
    public decimal ChitAmount { get; set; }
    public decimal? AmountTaken { get; set; }
    public int? AmountTakenMonth { get; set; }
    public DateTime? AmountTakenDate { get; set; }
    public decimal OriginalMonthlyPayment { get; set; }
    public decimal CurrentMonthlyPayment { get; set; }

    // Separated Payments
    public decimal PaidThisMonth { get; set; }
    public decimal PendingThisMonth { get; set; }
    public decimal TotalPaidAmount { get; set; }
    public decimal CurrentPendingAmount { get; set; }

    public int Duration { get; set; }
    public int CompletedMonths { get; set; }
    public int RemainingMonths { get; set; }
    public decimal RemainingCollection { get; set; }

    // Payment History List
    public List<CustomerSummaryPaymentItemDto> PaymentHistory { get; set; } = new();
}

public class CustomerSummaryPaymentItemDto
{
    public int InstallmentNo { get; set; }
    public string MonthName { get; set; } = string.Empty;
    public DateTime DueDate { get; set; }
    public decimal Expected { get; set; }
    public decimal Paid { get; set; }
    public decimal Pending { get; set; }
    public string Status { get; set; } = "PENDING";
    public bool IsAmountTakenMonth { get; set; }
    public decimal? AmountTaken { get; set; }
}

