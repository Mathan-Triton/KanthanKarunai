using System;
using System.Collections.Generic;
using KanthanKarunai.Domain.Enums;

namespace KanthanKarunai.Domain.Entities;

public class Chit : BaseEntity
{
    public int CustomerId { get; set; }
    public required string ChitName { get; set; }
    public PaymentFrequency PaymentFrequency { get; set; }
    public decimal PaymentAmount { get; set; }
    public decimal TotalChitAmount { get; set; }
    public int Duration { get; set; } // e.g. 20 months, 20 weeks, 20 days
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public ChitStatus Status { get; set; } = ChitStatus.ACTIVE;
    public string? Notes { get; set; }

    // Navigation properties
    public virtual Customer? Customer { get; set; }
    public virtual ICollection<PaymentSchedule> PaymentSchedules { get; set; } = new List<PaymentSchedule>();
    public virtual ICollection<Payment> Payments { get; set; } = new List<Payment>();
    public virtual ICollection<ChitPayout> Payouts { get; set; } = new List<ChitPayout>();
}
