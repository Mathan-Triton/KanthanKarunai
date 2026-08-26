using System;
using System.Collections.Generic;

namespace KanthanKarunai.Domain.Entities;

public class Customer : BaseEntity
{
    public required string CustomerCode { get; set; }
    public required string Name { get; set; }
    public required string MobileNo { get; set; }
    public string? AlternativeMobile { get; set; }
    public string? Address { get; set; }
    public string? City { get; set; }
    public string? AadhaarNumber { get; set; }
    public DateTime JoinDate { get; set; }
    public string Status { get; set; } = "ACTIVE"; // ACTIVE, INACTIVE
    public bool IsActive { get; set; } = true;

    // Navigation properties
    public virtual ICollection<Chit> Chits { get; set; } = new List<Chit>();
    public virtual ICollection<PaymentSchedule> PaymentSchedules { get; set; } = new List<PaymentSchedule>();
    public virtual ICollection<Payment> Payments { get; set; } = new List<Payment>();
    public virtual ICollection<ChitPayout> Payouts { get; set; } = new List<ChitPayout>();
    
    // Loan Navigation properties
    public virtual ICollection<CustomerLoan> CustomerLoans { get; set; } = new List<CustomerLoan>();
    public virtual ICollection<LoanRepaymentSchedule> LoanRepaymentSchedules { get; set; } = new List<LoanRepaymentSchedule>();
    public virtual ICollection<LoanPayment> LoanPayments { get; set; } = new List<LoanPayment>();

    // Get Chit Navigation properties
    public virtual ICollection<GetChit> GetChits { get; set; } = new List<GetChit>();
    public virtual ICollection<GetChitPayment> GetChitPayments { get; set; } = new List<GetChitPayment>();
}
