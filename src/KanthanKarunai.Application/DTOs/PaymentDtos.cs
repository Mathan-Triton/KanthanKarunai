using System;
using KanthanKarunai.Domain.Enums;

namespace KanthanKarunai.Application.DTOs;

public class PaymentDto
{
    public int Id { get; set; }
    public int CustomerId { get; set; }
    public string? CustomerName { get; set; }
    public string? CustomerCode { get; set; }
    public string? CustomerMobile { get; set; }
    public int ChitId { get; set; }
    public string? ChitName { get; set; }
    public int PaymentScheduleId { get; set; }
    public int InstallmentNo { get; set; }
    public DateTime PaymentDate { get; set; }
    public decimal Amount { get; set; }
    public string? PaymentMonth { get; set; }
    public string PaymentType { get; set; } = "INSTALLMENT";
    public PaymentMethod PaymentMethod { get; set; }
    public required string ReceiptNo { get; set; }
    public string? Notes { get; set; }
    public string? Remarks => Notes;
    public int CollectedBy { get; set; }
    public string? CollectedByName { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class CreatePaymentDto
{
    public int CustomerId { get; set; }
    public int? ChitId { get; set; }
    public string? PaymentMonth { get; set; } // e.g. "August 2026", "2026-08"
    public DateTime PaymentDate { get; set; } = DateTime.UtcNow;
    public decimal Amount { get; set; }
    public PaymentMethod PaymentMethod { get; set; } = PaymentMethod.CASH;
    public string? Notes { get; set; }
    public string? Remarks { get; set; }
    public bool AllowDuplicate { get; set; } = false;
}

