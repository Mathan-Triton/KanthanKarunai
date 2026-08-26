using System;
using KanthanKarunai.Domain.Enums;

namespace KanthanKarunai.Domain.Entities;

public class GetChitPayment
{
    public int Id { get; set; }
    public int GetChitId { get; set; }
    public int CustomerId { get; set; }
    public DateTime PaymentDate { get; set; }
    public decimal PaymentAmount { get; set; }
    public decimal InterestAmount { get; set; }
    public decimal PrincipalPaidAmount { get; set; }
    public decimal RemainingPrincipal { get; set; }
    public PaymentMethod PaymentMethod { get; set; } = PaymentMethod.CASH;
    public required string ReceiptNo { get; set; }
    public string? Remarks { get; set; }
    public int CollectedBy { get; set; }
    public DateTime CreatedAt { get; set; }

    // Navigation properties
    public virtual GetChit? GetChit { get; set; }
    public virtual Customer? Customer { get; set; }
    public virtual User? Collector { get; set; }
}
