using System;
using KanthanKarunai.Domain.Enums;

namespace KanthanKarunai.Domain.Entities;

public class ChitPayout
{
    public int Id { get; set; }
    public int CustomerId { get; set; }
    public int ChitId { get; set; }
    public DateTime PayoutDate { get; set; }
    public decimal GrossAmount { get; set; }
    public decimal DeductionAmount { get; set; }
    public decimal OtherCharges { get; set; }
    public decimal NetAmount { get; set; }
    public PaymentMethod PaymentMethod { get; set; }
    public string? ReferenceNo { get; set; }
    public string? Notes { get; set; }
    public int CreatedBy { get; set; } // User Id
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public virtual Customer? Customer { get; set; }
    public virtual Chit? Chit { get; set; }
    public virtual User? Creator { get; set; }
}
