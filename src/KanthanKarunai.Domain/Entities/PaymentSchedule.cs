using System;
using System.Collections.Generic;
using KanthanKarunai.Domain.Enums;

namespace KanthanKarunai.Domain.Entities;

public class PaymentSchedule : BaseEntity
{
    public int ChitId { get; set; }
    public int CustomerId { get; set; }
    public int InstallmentNo { get; set; }
    public DateTime DueDate { get; set; }
    public decimal ExpectedAmount { get; set; }
    public decimal PaidAmount { get; set; } = 0;
    public decimal PendingAmount { get; set; }
    public decimal AdvanceAmount { get; set; } = 0;
    public PaymentStatus Status { get; set; } = PaymentStatus.PENDING;
    public DateTime? PaidDate { get; set; }

    // Navigation properties
    public virtual Chit? Chit { get; set; }
    public virtual Customer? Customer { get; set; }
    public virtual ICollection<Payment> Payments { get; set; } = new List<Payment>();
}
