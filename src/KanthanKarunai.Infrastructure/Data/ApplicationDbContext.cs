using Microsoft.EntityFrameworkCore;
using KanthanKarunai.Application.Interfaces;
using KanthanKarunai.Domain.Entities;
using KanthanKarunai.Domain.Enums;

namespace KanthanKarunai.Infrastructure.Data;

public class ApplicationDbContext : DbContext, IApplicationDbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options)
    {
    }


    public DbSet<User> Users => Set<User>();
    public DbSet<Customer> Customers => Set<Customer>();
    public DbSet<Chit> Chits => Set<Chit>();
    public DbSet<PaymentSchedule> PaymentSchedules => Set<PaymentSchedule>();
    public DbSet<Payment> Payments => Set<Payment>();
    public DbSet<ChitPayout> ChitPayouts => Set<ChitPayout>();
    public DbSet<Expense> Expenses => Set<Expense>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
    
    public DbSet<CustomerLoan> CustomerLoans => Set<CustomerLoan>();
    public DbSet<LoanRepaymentSchedule> LoanRepaymentSchedules => Set<LoanRepaymentSchedule>();
    public DbSet<LoanPayment> LoanPayments => Set<LoanPayment>();
    public DbSet<NotificationLog> NotificationLogs => Set<NotificationLog>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // 1. Users table
        modelBuilder.Entity<User>(entity =>
        {
            entity.ToTable("users");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Username).HasColumnName("username").IsRequired().HasMaxLength(100);
            entity.HasIndex(e => e.Username).IsUnique();
            entity.Property(e => e.PasswordHash).HasColumnName("password_hash").IsRequired();
            entity.Property(e => e.FullName).HasColumnName("full_name").IsRequired().HasMaxLength(200);
            entity.Property(e => e.Role).HasColumnName("role").HasConversion(
                v => v.ToString(), // store as "Admin", "Staff", etc.
                v => (KanthanKarunai.Domain.Enums.UserRole)Enum.Parse(
                    typeof(KanthanKarunai.Domain.Enums.UserRole), v, ignoreCase: true)
            ).IsRequired();
            entity.Property(e => e.IsActive).HasColumnName("is_active").IsRequired().HasDefaultValue(true);
            entity.Property(e => e.CustomerId).HasColumnName("customer_id");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at").IsRequired();
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at").IsRequired();

            entity.HasOne(e => e.Customer)
                .WithMany()
                .HasForeignKey(e => e.CustomerId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // 2. Customers table
        modelBuilder.Entity<Customer>(entity =>
        {
            entity.ToTable("customers");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.CustomerCode).HasColumnName("customer_code").IsRequired().HasMaxLength(50);
            entity.HasIndex(e => e.CustomerCode).IsUnique();
            entity.Property(e => e.Name).HasColumnName("name").IsRequired().HasMaxLength(200);
            entity.HasIndex(e => e.Name);
            entity.Property(e => e.MobileNo).HasColumnName("mobile_no").IsRequired().HasMaxLength(15);
            entity.HasIndex(e => e.MobileNo);
            entity.Property(e => e.AlternativeMobile).HasColumnName("alternative_mobile").HasMaxLength(15);
            entity.Property(e => e.Address).HasColumnName("address");
            entity.Property(e => e.City).HasColumnName("city").HasMaxLength(100);
            entity.Property(e => e.AadhaarNumber).HasColumnName("aadhaar_number").HasMaxLength(20);
            entity.HasIndex(e => e.AadhaarNumber);
            entity.Property(e => e.JoinDate).HasColumnName("join_date").IsRequired();
            entity.Property(e => e.Status).HasColumnName("status").IsRequired().HasMaxLength(50).HasDefaultValue("ACTIVE");
            entity.Property(e => e.IsActive).HasColumnName("is_active").IsRequired().HasDefaultValue(true);
            entity.Property(e => e.CreatedAt).HasColumnName("created_at").IsRequired();
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at").IsRequired();
        });

        // 3. Chits table
        modelBuilder.Entity<Chit>(entity =>
        {
            entity.ToTable("chits");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.CustomerId).HasColumnName("customer_id").IsRequired();
            entity.Property(e => e.ChitName).HasColumnName("chit_name").IsRequired().HasMaxLength(200);
            entity.Property(e => e.PaymentFrequency).HasColumnName("payment_frequency").HasConversion<string>().IsRequired();
            entity.Property(e => e.PaymentAmount).HasColumnName("payment_amount").HasPrecision(18, 2).IsRequired();
            entity.Property(e => e.TotalChitAmount).HasColumnName("total_chit_amount").HasPrecision(18, 2).IsRequired();
            entity.Property(e => e.Duration).HasColumnName("duration").IsRequired();
            entity.Property(e => e.StartDate).HasColumnName("start_date").IsRequired();
            entity.Property(e => e.EndDate).HasColumnName("end_date").IsRequired();
            entity.Property(e => e.Status).HasColumnName("status").HasConversion<string>().IsRequired();
            entity.Property(e => e.Notes).HasColumnName("notes");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at").IsRequired();
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at").IsRequired();

            entity.HasOne(d => d.Customer)
                .WithMany(p => p.Chits)
                .HasForeignKey(d => d.CustomerId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // 4. PaymentSchedules table
        modelBuilder.Entity<PaymentSchedule>(entity =>
        {
            entity.ToTable("payment_schedules");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.ChitId).HasColumnName("chit_id").IsRequired();
            entity.Property(e => e.CustomerId).HasColumnName("customer_id").IsRequired();
            entity.Property(e => e.InstallmentNo).HasColumnName("installment_no").IsRequired();
            entity.Property(e => e.DueDate).HasColumnName("due_date").IsRequired();
            entity.HasIndex(e => e.DueDate);
            entity.Property(e => e.ExpectedAmount).HasColumnName("expected_amount").HasPrecision(18, 2).IsRequired();
            entity.Property(e => e.PaidAmount).HasColumnName("paid_amount").HasPrecision(18, 2).HasDefaultValue(0);
            entity.Property(e => e.PendingAmount).HasColumnName("pending_amount").HasPrecision(18, 2).IsRequired();
            entity.Property(e => e.AdvanceAmount).HasColumnName("advance_amount").HasPrecision(18, 2).HasDefaultValue(0);
            entity.Property(e => e.Status).HasColumnName("status").HasConversion<string>().IsRequired();
            entity.HasIndex(e => e.Status);
            entity.Property(e => e.PaidDate).HasColumnName("paid_date");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at").IsRequired();
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at").IsRequired();

            entity.HasOne(d => d.Chit)
                .WithMany(p => p.PaymentSchedules)
                .HasForeignKey(d => d.ChitId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(d => d.Customer)
                .WithMany(p => p.PaymentSchedules)
                .HasForeignKey(d => d.CustomerId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // 5. Payments table
        modelBuilder.Entity<Payment>(entity =>
        {
            entity.ToTable("payments");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.CustomerId).HasColumnName("customer_id").IsRequired();
            entity.Property(e => e.ChitId).HasColumnName("chit_id").IsRequired();
            entity.Property(e => e.PaymentScheduleId).HasColumnName("payment_schedule_id").IsRequired();
            entity.Property(e => e.PaymentDate).HasColumnName("payment_date").IsRequired();
            entity.HasIndex(e => e.PaymentDate);
            entity.Property(e => e.Amount).HasColumnName("amount").HasPrecision(18, 2).IsRequired();
            entity.Property(e => e.PaymentMonth).HasColumnName("payment_month").HasMaxLength(50);
            entity.Property(e => e.PaymentType).HasColumnName("payment_type").IsRequired().HasMaxLength(50).HasDefaultValue("INSTALLMENT");
            entity.Property(e => e.PaymentMethod).HasColumnName("payment_method").HasConversion<string>().IsRequired();
            entity.Property(e => e.ReceiptNo).HasColumnName("receipt_no").IsRequired().HasMaxLength(100);
            entity.HasIndex(e => e.ReceiptNo).IsUnique();
            entity.Property(e => e.Notes).HasColumnName("notes");
            entity.Property(e => e.CollectedBy).HasColumnName("collected_by").IsRequired();
            entity.Property(e => e.CreatedAt).HasColumnName("created_at").IsRequired();

            entity.HasOne(d => d.Customer)
                .WithMany(p => p.Payments)
                .HasForeignKey(d => d.CustomerId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(d => d.Chit)
                .WithMany(p => p.Payments)
                .HasForeignKey(d => d.ChitId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(d => d.PaymentSchedule)
                .WithMany(p => p.Payments)
                .HasForeignKey(d => d.PaymentScheduleId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(d => d.Collector)
                .WithMany(p => p.Payments)
                .HasForeignKey(d => d.CollectedBy)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // 6. ChitPayouts table
        modelBuilder.Entity<ChitPayout>(entity =>
        {
            entity.ToTable("chit_payouts");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.CustomerId).HasColumnName("customer_id").IsRequired();
            entity.Property(e => e.ChitId).HasColumnName("chit_id").IsRequired();
            entity.Property(e => e.PayoutDate).HasColumnName("payout_date").IsRequired();
            entity.Property(e => e.GrossAmount).HasColumnName("gross_amount").HasPrecision(18, 2).IsRequired();
            entity.Property(e => e.DeductionAmount).HasColumnName("deduction_amount").HasPrecision(18, 2).IsRequired();
            entity.Property(e => e.OtherCharges).HasColumnName("other_charges").HasPrecision(18, 2).IsRequired();
            entity.Property(e => e.NetAmount).HasColumnName("net_amount").HasPrecision(18, 2).IsRequired();
            entity.Property(e => e.PaymentMethod).HasColumnName("payment_method").HasConversion<string>().IsRequired();
            entity.Property(e => e.ReferenceNo).HasColumnName("reference_no").HasMaxLength(100);
            entity.Property(e => e.Notes).HasColumnName("notes");
            entity.Property(e => e.CreatedBy).HasColumnName("created_by").IsRequired();
            entity.Property(e => e.CreatedAt).HasColumnName("created_at").IsRequired();

            entity.HasOne(d => d.Customer)
                .WithMany(p => p.Payouts)
                .HasForeignKey(d => d.CustomerId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(d => d.Chit)
                .WithMany(p => p.Payouts)
                .HasForeignKey(d => d.ChitId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(d => d.Creator)
                .WithMany()
                .HasForeignKey(d => d.CreatedBy)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // 7. Expenses table
        modelBuilder.Entity<Expense>(entity =>
        {
            entity.ToTable("expenses");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.ExpenseDate).HasColumnName("expense_date").IsRequired();
            entity.Property(e => e.Category).HasColumnName("category").HasConversion<string>().IsRequired();
            entity.Property(e => e.Amount).HasColumnName("amount").HasPrecision(18, 2).IsRequired();
            entity.Property(e => e.PaymentMethod).HasColumnName("payment_method").HasConversion<string>().IsRequired();
            entity.Property(e => e.Description).HasColumnName("description");
            entity.Property(e => e.CreatedBy).HasColumnName("created_by").IsRequired();
            entity.Property(e => e.CreatedAt).HasColumnName("created_at").IsRequired();

            entity.HasOne(d => d.Creator)
                .WithMany(p => p.Expenses)
                .HasForeignKey(d => d.CreatedBy)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // 8. AuditLogs table
        modelBuilder.Entity<AuditLog>(entity =>
        {
            entity.ToTable("audit_logs");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.UserId).HasColumnName("user_id");
            entity.Property(e => e.Action).HasColumnName("action").IsRequired().HasMaxLength(50);
            entity.Property(e => e.TableName).HasColumnName("table_name").IsRequired().HasMaxLength(100);
            entity.Property(e => e.RecordId).HasColumnName("record_id").IsRequired().HasMaxLength(100);
            entity.Property(e => e.OldValue).HasColumnName("old_value");
            entity.Property(e => e.NewValue).HasColumnName("new_value");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at").IsRequired();

            entity.HasOne(d => d.User)
                .WithMany(p => p.AuditLogs)
                .HasForeignKey(d => d.UserId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        // 9. CustomerLoans table
        modelBuilder.Entity<CustomerLoan>(entity =>
        {
            entity.ToTable("customer_loans");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.CustomerId).HasColumnName("customer_id").IsRequired();
            entity.Property(e => e.LoanNumber).HasColumnName("loan_number").IsRequired().HasMaxLength(100);
            entity.HasIndex(e => e.LoanNumber).IsUnique();
            entity.Property(e => e.LoanDate).HasColumnName("loan_date").IsRequired();
            entity.Property(e => e.LoanAmount).HasColumnName("loan_amount").HasPrecision(18, 2).IsRequired();
            entity.Property(e => e.InterestAmount).HasColumnName("interest_amount").HasPrecision(18, 2).IsRequired();
            entity.Property(e => e.ServiceCharge).HasColumnName("service_charge").HasPrecision(18, 2).IsRequired();
            entity.Property(e => e.OtherCharges).HasColumnName("other_charges").HasPrecision(18, 2).IsRequired();
            entity.Property(e => e.TotalRecoverable).HasColumnName("total_recoverable").HasPrecision(18, 2).IsRequired();
            entity.Property(e => e.RepaymentFrequency).HasColumnName("repayment_frequency").HasConversion<string>().IsRequired();
            entity.Property(e => e.InstallmentAmount).HasColumnName("installment_amount").HasPrecision(18, 2).IsRequired();
            entity.Property(e => e.NumberOfInstallments).HasColumnName("number_of_installments").IsRequired();
            entity.Property(e => e.FirstDueDate).HasColumnName("first_due_date").IsRequired();
            entity.Property(e => e.TotalPaid).HasColumnName("total_paid").HasPrecision(18, 2).HasDefaultValue(0);
            entity.Property(e => e.TotalPending).HasColumnName("total_pending").HasPrecision(18, 2).IsRequired();
            entity.Property(e => e.RemainingAmount).HasColumnName("remaining_amount").HasPrecision(18, 2).IsRequired();
            entity.Property(e => e.Status).HasColumnName("status").HasConversion<string>().IsRequired();
            entity.Property(e => e.Notes).HasColumnName("notes");
            entity.Property(e => e.CreatedBy).HasColumnName("created_by").IsRequired();
            entity.Property(e => e.CreatedAt).HasColumnName("created_at").IsRequired();
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at").IsRequired();

            entity.HasOne(d => d.Customer)
                .WithMany(p => p.CustomerLoans)
                .HasForeignKey(d => d.CustomerId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(d => d.Creator)
                .WithMany(p => p.CreatedLoans)
                .HasForeignKey(d => d.CreatedBy)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // 10. LoanRepaymentSchedules table
        modelBuilder.Entity<LoanRepaymentSchedule>(entity =>
        {
            entity.ToTable("loan_repayment_schedules");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.LoanId).HasColumnName("loan_id").IsRequired();
            entity.Property(e => e.CustomerId).HasColumnName("customer_id").IsRequired();
            entity.Property(e => e.InstallmentNo).HasColumnName("installment_no").IsRequired();
            entity.Property(e => e.DueDate).HasColumnName("due_date").IsRequired();
            entity.HasIndex(e => e.DueDate);
            entity.Property(e => e.ExpectedAmount).HasColumnName("expected_amount").HasPrecision(18, 2).IsRequired();
            entity.Property(e => e.PaidAmount).HasColumnName("paid_amount").HasPrecision(18, 2).HasDefaultValue(0);
            entity.Property(e => e.PendingAmount).HasColumnName("pending_amount").HasPrecision(18, 2).IsRequired();
            entity.Property(e => e.AdvanceAmount).HasColumnName("advance_amount").HasPrecision(18, 2).HasDefaultValue(0);
            entity.Property(e => e.Status).HasColumnName("status").HasConversion<string>().IsRequired();
            entity.Property(e => e.PaidDate).HasColumnName("paid_date");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at").IsRequired();
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at").IsRequired();

            entity.HasOne(d => d.Loan)
                .WithMany(p => p.Schedules)
                .HasForeignKey(d => d.LoanId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(d => d.Customer)
                .WithMany(p => p.LoanRepaymentSchedules)
                .HasForeignKey(d => d.CustomerId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // 11. LoanPayments table
        modelBuilder.Entity<LoanPayment>(entity =>
        {
            entity.ToTable("loan_payments");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.LoanId).HasColumnName("loan_id").IsRequired();
            entity.Property(e => e.CustomerId).HasColumnName("customer_id").IsRequired();
            entity.Property(e => e.ScheduleId).HasColumnName("schedule_id").IsRequired();
            entity.Property(e => e.PaymentDate).HasColumnName("payment_date").IsRequired();
            entity.HasIndex(e => e.PaymentDate);
            entity.Property(e => e.Amount).HasColumnName("amount").HasPrecision(18, 2).IsRequired();
            entity.Property(e => e.PaymentMonth).HasColumnName("payment_month").HasMaxLength(50);
            entity.Property(e => e.PaymentMethod).HasColumnName("payment_method").HasConversion<string>().IsRequired();
            entity.Property(e => e.ReceiptNo).HasColumnName("receipt_no").IsRequired().HasMaxLength(100);
            entity.HasIndex(e => e.ReceiptNo).IsUnique();
            entity.Property(e => e.Notes).HasColumnName("notes");
            entity.Property(e => e.CollectedBy).HasColumnName("collected_by").IsRequired();
            entity.Property(e => e.CreatedAt).HasColumnName("created_at").IsRequired();

            entity.HasOne(d => d.Customer)
                .WithMany(p => p.LoanPayments)
                .HasForeignKey(d => d.CustomerId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(d => d.Loan)
                .WithMany(p => p.Payments)
                .HasForeignKey(d => d.LoanId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(d => d.Schedule)
                .WithMany()
                .HasForeignKey(d => d.ScheduleId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(d => d.Collector)
                .WithMany(p => p.CollectedLoanPayments)
                .HasForeignKey(d => d.CollectedBy)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // 12. NotificationLogs table
        modelBuilder.Entity<NotificationLog>(entity =>
        {
            entity.ToTable("notification_logs");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.CustomerId).HasColumnName("customer_id").IsRequired();
            entity.Property(e => e.PaymentId).HasColumnName("payment_id");
            entity.Property(e => e.LoanPaymentId).HasColumnName("loan_payment_id");
            entity.Property(e => e.NotificationType).HasColumnName("notification_type").IsRequired().HasMaxLength(50);
            entity.Property(e => e.Message).HasColumnName("message").IsRequired();
            entity.Property(e => e.SentDate).HasColumnName("sent_date").IsRequired();
            entity.Property(e => e.Status).HasColumnName("status").IsRequired().HasMaxLength(50);
            entity.Property(e => e.ErrorMessage).HasColumnName("error_message");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at").IsRequired();

            entity.HasOne(d => d.Customer)
                .WithMany()
                .HasForeignKey(d => d.CustomerId)
                .OnDelete(DeleteBehavior.Restrict);
        });
    }
}
