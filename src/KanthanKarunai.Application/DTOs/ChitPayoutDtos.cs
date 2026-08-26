using System;
using KanthanKarunai.Domain.Enums;

namespace KanthanKarunai.Application.DTOs;

public class ChitPayoutDto
{
    public int Id { get; set; }
    public int CustomerId { get; set; }
    public string? CustomerName { get; set; }
    public string? CustomerCode { get; set; }
    public int ChitId { get; set; }
    public string? ChitName { get; set; }
    public DateTime PayoutDate { get; set; }
    public decimal GrossAmount { get; set; }
    public decimal DeductionAmount { get; set; }
    public decimal OtherCharges { get; set; }
    public decimal NetAmount { get; set; }
    public PaymentMethod PaymentMethod { get; set; }
    public string? ReferenceNo { get; set; }
    public string? Notes { get; set; }
    public int CreatedBy { get; set; }
    public string? CreatedByName { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class CreateChitPayoutDto
{
    public int CustomerId { get; set; }
    public int ChitId { get; set; }
    public DateTime PayoutDate { get; set; } = DateTime.UtcNow;
    public decimal GrossAmount { get; set; }
    public decimal DeductionAmount { get; set; }
    public decimal OtherCharges { get; set; }
    public PaymentMethod PaymentMethod { get; set; }
    public string? ReferenceNo { get; set; }
    public string? Notes { get; set; }
}
