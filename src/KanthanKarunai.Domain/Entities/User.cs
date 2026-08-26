using System.Collections.Generic;
using KanthanKarunai.Domain.Enums;

namespace KanthanKarunai.Domain.Entities;

public class User : BaseEntity
{
    public required string Username { get; set; }
    public required string PasswordHash { get; set; }
    public required string FullName { get; set; }
    public UserRole Role { get; set; } = UserRole.Admin;
    public bool IsActive { get; set; } = true;
    public int? CustomerId { get; set; }
    public virtual Customer? Customer { get; set; }

    // Navigation properties
    public virtual ICollection<Payment> Payments { get; set; } = new List<Payment>();
    public virtual ICollection<Expense> Expenses { get; set; } = new List<Expense>();
    public virtual ICollection<AuditLog> AuditLogs { get; set; } = new List<AuditLog>();
    
    // Loan Navigation properties
    public virtual ICollection<CustomerLoan> CreatedLoans { get; set; } = new List<CustomerLoan>();
    public virtual ICollection<LoanPayment> CollectedLoanPayments { get; set; } = new List<LoanPayment>();
}
