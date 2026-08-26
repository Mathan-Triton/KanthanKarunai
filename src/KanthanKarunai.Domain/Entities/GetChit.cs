using System;
using System.Collections.Generic;

namespace KanthanKarunai.Domain.Entities;

public class GetChit : BaseEntity
{
    public int CustomerId { get; set; }
    public decimal PrincipalAmount { get; set; }
    public decimal InterestRate { get; set; } = 1.0m; // Default 1% per month
    public DateTime ReceivedDate { get; set; }
    public decimal OutstandingPrincipal { get; set; }
    public decimal TotalInterestPaid { get; set; } = 0;
    public decimal TotalPrincipalPaid { get; set; } = 0;
    public string Status { get; set; } = "ACTIVE"; // ACTIVE, COMPLETED, CANCELLED
    public string? Notes { get; set; }
    public int CreatedBy { get; set; }

    // Navigation properties
    public virtual Customer? Customer { get; set; }
    public virtual User? Creator { get; set; }
    public virtual ICollection<GetChitPayment> Payments { get; set; } = new List<GetChitPayment>();
}
