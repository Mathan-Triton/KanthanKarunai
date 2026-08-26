using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using KanthanKarunai.Domain.Entities;

namespace KanthanKarunai.Application.Interfaces;

public interface IApplicationDbContext
{
    DbSet<User> Users { get; }
    DbSet<Customer> Customers { get; }
    DbSet<Chit> Chits { get; }
    DbSet<PaymentSchedule> PaymentSchedules { get; }
    DbSet<Payment> Payments { get; }
    DbSet<ChitPayout> ChitPayouts { get; }
    DbSet<Expense> Expenses { get; }
    DbSet<AuditLog> AuditLogs { get; }
    
    DbSet<CustomerLoan> CustomerLoans { get; }
    DbSet<LoanRepaymentSchedule> LoanRepaymentSchedules { get; }
    DbSet<LoanPayment> LoanPayments { get; }
    DbSet<NotificationLog> NotificationLogs { get; }
    
    DatabaseFacade Database { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
