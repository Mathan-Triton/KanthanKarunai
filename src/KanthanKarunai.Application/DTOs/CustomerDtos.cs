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

