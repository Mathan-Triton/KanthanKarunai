using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using KanthanKarunai.Application.DTOs;
using KanthanKarunai.Application.Interfaces;
using KanthanKarunai.Domain.Entities;
using KanthanKarunai.Domain.Enums;

namespace KanthanKarunai.Application.Services;

public class LoanService : ILoanService
{
    private readonly IApplicationDbContext _dbContext;
    private readonly ICurrentUserService _currentUserService;
    private readonly IAuditLogService _auditLogService;
    private readonly INotificationService _notificationService;

    public LoanService(
        IApplicationDbContext dbContext,
        ICurrentUserService currentUserService,
        IAuditLogService auditLogService,
        INotificationService notificationService)
    {
        _dbContext = dbContext;
        _currentUserService = currentUserService;
        _auditLogService = auditLogService;
        _notificationService = notificationService;
    }

    public async Task<IEnumerable<LoanDto>> GetLoansAsync()
    {
        var loans = await _dbContext.CustomerLoans
            .Include(l => l.Customer)
            .Include(l => l.Schedules)
            .OrderByDescending(l => l.CreatedAt)
            .ToListAsync();

        return loans.Select(l => MapToDto(l));
    }

    public async Task<LoanDto?> GetLoanByIdAsync(int id)
    {
        var loan = await _dbContext.CustomerLoans
            .Include(l => l.Customer)
            .Include(l => l.Schedules)
            .FirstOrDefaultAsync(l => l.Id == id);
            
        return loan != null ? MapToDto(loan) : null;
    }

    public async Task<IEnumerable<LoanDto>> GetCustomerLoansAsync(int customerId)
    {
        var loans = await _dbContext.CustomerLoans
            .Include(l => l.Customer)
            .Include(l => l.Schedules)
            .Where(l => l.CustomerId == customerId)
            .OrderByDescending(l => l.CreatedAt)
            .ToListAsync();

        return loans.Select(l => MapToDto(l));
    }

    public async Task<LoanDto> CreateLoanAsync(CreateLoanDto dto)
    {
        var customer = await _dbContext.Customers.FindAsync(dto.CustomerId);
        if (customer == null) throw new ArgumentException("Customer not found.");

        decimal principalAmount = dto.PrincipalAmount > 0 ? dto.PrincipalAmount : (dto.LoanAmount ?? 0);
        if (principalAmount <= 0) throw new ArgumentException("Principal loan amount must be greater than zero.");

        decimal monthlyPayment = dto.MonthlyPaymentAmount > 0 ? dto.MonthlyPaymentAmount : (dto.InstallmentAmount ?? 0);
        if (monthlyPayment <= 0) throw new ArgumentException("Monthly payment amount must be greater than zero.");

        int creatorId = await GetFallbackAdminIdAsync();

        // Parse Start Month / Loan Date
        DateTime loanDate = DateTime.UtcNow.Date;
        if (!string.IsNullOrWhiteSpace(dto.LoanStartMonth))
        {
            if (DateTime.TryParse(dto.LoanStartMonth, out var parsedMonth))
            {
                loanDate = new DateTime(parsedMonth.Year, parsedMonth.Month, 1);
            }
            else if (DateTime.TryParseExact(dto.LoanStartMonth, new[] { "yyyy-MM", "MMMM yyyy", "MMM yyyy", "yyyy-MM-dd" }, 
                     System.Globalization.CultureInfo.InvariantCulture, System.Globalization.DateTimeStyles.None, out var exactMonth))
            {
                loanDate = new DateTime(exactMonth.Year, exactMonth.Month, 1);
            }
        }
        else if (dto.LoanDate.HasValue)
        {
            loanDate = dto.LoanDate.Value.Date;
        }

        DateTime firstDueDate = dto.FirstDueDate.HasValue ? dto.FirstDueDate.Value.Date : loanDate;

        using var transaction = await _dbContext.Database.BeginTransactionAsync();
        try
        {
            var totalRecoverable = principalAmount + dto.InterestAmount + dto.ServiceCharge + dto.OtherCharges;
            
            // Calculate number of installments needed = Total Loan / Monthly Payment
            int numberOfInstallments = (int)Math.Ceiling(totalRecoverable / monthlyPayment);
            if (numberOfInstallments <= 0) numberOfInstallments = 1;

            // Generate Loan Number (LOAN-YYYYMMDD-XXXX)
            var todayStr = DateTime.UtcNow.AddHours(5.5).ToString("yyyyMMdd");
            var prefix = $"LOAN-{todayStr}-";
            int nextIndex = 1;
            string loanNumber = $"{prefix}{nextIndex:D4}";
            while (await _dbContext.CustomerLoans.AnyAsync(l => l.LoanNumber == loanNumber))
            {
                nextIndex++;
                loanNumber = $"{prefix}{nextIndex:D4}";
            }

            var loan = new CustomerLoan
            {
                CustomerId = dto.CustomerId,
                LoanNumber = loanNumber,
                LoanDate = DateTime.SpecifyKind(loanDate, DateTimeKind.Utc),
                LoanAmount = principalAmount,
                InterestAmount = dto.InterestAmount,
                ServiceCharge = dto.ServiceCharge,
                OtherCharges = dto.OtherCharges,
                TotalRecoverable = totalRecoverable,
                RepaymentFrequency = dto.RepaymentFrequency,
                InstallmentAmount = monthlyPayment,
                NumberOfInstallments = numberOfInstallments,
                FirstDueDate = DateTime.SpecifyKind(firstDueDate, DateTimeKind.Utc),
                TotalPaid = 0,
                TotalPending = totalRecoverable,
                RemainingAmount = totalRecoverable,
                Status = ChitStatus.ACTIVE,
                Notes = dto.Notes,
                CreatedBy = creatorId,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _dbContext.CustomerLoans.Add(loan);
            await _dbContext.SaveChangesAsync();

            // Generate Repayment Schedule
            decimal remainingBalance = totalRecoverable;
            var dueDate = firstDueDate;
            var schedules = new List<LoanRepaymentSchedule>();

            for (int i = 1; i <= numberOfInstallments; i++)
            {
                decimal expectedAmount = monthlyPayment;
                if (remainingBalance < monthlyPayment)
                {
                    expectedAmount = remainingBalance;
                }

                var schedule = new LoanRepaymentSchedule
                {
                    LoanId = loan.Id,
                    CustomerId = loan.CustomerId,
                    InstallmentNo = i,
                    DueDate = DateTime.SpecifyKind(dueDate, DateTimeKind.Utc),
                    ExpectedAmount = expectedAmount,
                    PaidAmount = 0,
                    PendingAmount = expectedAmount,
                    AdvanceAmount = 0,
                    Status = PaymentStatus.PENDING,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                _dbContext.LoanRepaymentSchedules.Add(schedule);
                schedules.Add(schedule);
                remainingBalance -= expectedAmount;

                if (dto.RepaymentFrequency == PaymentFrequency.MONTHLY)
                {
                    dueDate = dueDate.AddMonths(1);
                }
                else if (dto.RepaymentFrequency == PaymentFrequency.WEEKLY)
                {
                    dueDate = dueDate.AddDays(7);
                }
                else if (dto.RepaymentFrequency == PaymentFrequency.DAILY)
                {
                    dueDate = dueDate.AddDays(1);
                }
            }

            await _dbContext.SaveChangesAsync();
            await _auditLogService.LogAsync("Loan Created", "customer_loans", loan.Id.ToString(), null, loan);
            
            await transaction.CommitAsync();
            
            loan.Customer = customer;
            loan.Schedules = schedules;
            return MapToDto(loan);
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    public async Task<IEnumerable<LoanRepaymentScheduleDto>> GetPendingLoanPaymentsAsync(string? query)
    {
        var dbQuery = _dbContext.LoanRepaymentSchedules
            .Include(ps => ps.Customer)
            .Include(ps => ps.Loan)
            .Where(ps => ps.Status == PaymentStatus.PENDING || ps.Status == PaymentStatus.PARTIAL);

        if (!string.IsNullOrWhiteSpace(query))
        {
            var lowerQuery = query.ToLower();
            dbQuery = dbQuery.Where(ps => ps.Customer != null && 
                                         (ps.Customer.Name.ToLower().Contains(lowerQuery) || 
                                          ps.Customer.CustomerCode.ToLower().Contains(lowerQuery) ||
                                          ps.Customer.MobileNo.Contains(lowerQuery)));
        }

        var results = await dbQuery.OrderBy(ps => ps.DueDate).ToListAsync();
        return results.Select(ps => MapToScheduleDto(ps));
    }

    public async Task<IEnumerable<LoanRepaymentScheduleDto>> GetLoanScheduleAsync(int loanId)
    {
        var schedules = await _dbContext.LoanRepaymentSchedules
            .Include(ps => ps.Customer)
            .Include(ps => ps.Loan)
            .Where(ps => ps.LoanId == loanId)
            .OrderBy(ps => ps.InstallmentNo)
            .ToListAsync();
            
        return schedules.Select(ps => MapToScheduleDto(ps));
    }

    public async Task<IEnumerable<LoanPaymentDto>> GetLoanPaymentsAsync()
    {
        return await _dbContext.LoanPayments
            .Include(p => p.Customer)
            .Include(p => p.Loan)
            .Include(p => p.Schedule)
            .Include(p => p.Collector)
            .OrderByDescending(p => p.PaymentDate)
            .Select(p => MapToPaymentDto(p))
            .ToListAsync();
    }

    public async Task<LoanPaymentDto?> GetLoanPaymentByIdAsync(int id)
    {
        var payment = await _dbContext.LoanPayments
            .Include(p => p.Customer)
            .Include(p => p.Loan)
            .Include(p => p.Schedule)
            .Include(p => p.Collector)
            .FirstOrDefaultAsync(p => p.Id == id);
            
        return payment != null ? MapToPaymentDto(payment) : null;
    }

    public async Task<IEnumerable<LoanPaymentDto>> GetCustomerLoanPaymentsAsync(int customerId)
    {
        return await _dbContext.LoanPayments
            .Include(p => p.Customer)
            .Include(p => p.Loan)
            .Include(p => p.Schedule)
            .Include(p => p.Collector)
            .Where(p => p.CustomerId == customerId)
            .OrderByDescending(p => p.PaymentDate)
            .Select(p => MapToPaymentDto(p))
            .ToListAsync();
    }

    public async Task<LoanPaymentDto> CollectPaymentAsync(CreateLoanPaymentDto dto)
    {
        if (dto.Amount <= 0) throw new ArgumentException("Payment amount must be greater than zero.");

        int collectorId = await GetFallbackAdminIdAsync();

        using var transaction = await _dbContext.Database.BeginTransactionAsync();
        try
        {
            var loan = await _dbContext.CustomerLoans.Include(l => l.Customer).FirstOrDefaultAsync(l => l.Id == dto.LoanId);
            if (loan == null) throw new ArgumentException("Loan not found.");
            if (loan.Status == ChitStatus.COMPLETED) throw new ArgumentException("Loan is already completed.");

            // Generate LR Receipt Number
            var todayStr = DateTime.UtcNow.AddHours(5.5).ToString("yyyyMMdd");
            var prefix = $"LR-{todayStr}-";
            int nextIndex = 1;
            string receiptNo = $"{prefix}{nextIndex:D4}";
            while (await _dbContext.LoanPayments.AnyAsync(p => p.ReceiptNo == receiptNo))
            {
                nextIndex++;
                receiptNo = $"{prefix}{nextIndex:D4}";
            }

            var schedules = await _dbContext.LoanRepaymentSchedules
                .Where(ps => ps.LoanId == dto.LoanId && ps.PendingAmount > 0)
                .OrderBy(ps => ps.InstallmentNo)
                .ToListAsync();

            var paymentDateUtc = dto.PaymentDate.Kind == DateTimeKind.Utc
                ? dto.PaymentDate
                : DateTime.SpecifyKind(dto.PaymentDate, DateTimeKind.Utc);

            string monthStr = !string.IsNullOrWhiteSpace(dto.PaymentMonth)
                ? dto.PaymentMonth.Trim()
                : (schedules.FirstOrDefault()?.DueDate.ToString("MMMM yyyy") ?? dto.PaymentDate.ToString("MMMM yyyy"));

            decimal remainingPaymentAmount = dto.Amount;
            LoanPayment? lastCreatedPayment = null;

            if (schedules.Any())
            {
                foreach (var schedule in schedules)
                {
                    if (remainingPaymentAmount <= 0) break;

                    decimal pendingToPay = schedule.PendingAmount;
                    string schedMonth = schedule.DueDate.ToString("MMMM yyyy");

                    if (remainingPaymentAmount >= pendingToPay)
                    {
                        schedule.PaidAmount += pendingToPay;
                        schedule.PendingAmount = 0;
                        schedule.Status = PaymentStatus.PAID;
                        schedule.PaidDate = paymentDateUtc;
                        schedule.UpdatedAt = DateTime.UtcNow;

                        remainingPaymentAmount -= pendingToPay;

                        var payment = new LoanPayment
                        {
                            LoanId = dto.LoanId,
                            CustomerId = loan.CustomerId,
                            ScheduleId = schedule.Id,
                            PaymentDate = paymentDateUtc,
                            Amount = pendingToPay,
                            PaymentMonth = schedMonth,
                            PaymentMethod = dto.PaymentMethod,
                            ReceiptNo = receiptNo,
                            Notes = dto.Notes,
                            CollectedBy = collectorId,
                            CreatedAt = DateTime.UtcNow
                        };

                        _dbContext.LoanPayments.Add(payment);
                        lastCreatedPayment = payment;
                        await _dbContext.SaveChangesAsync();
                    }
                    else
                    {
                        schedule.PaidAmount += remainingPaymentAmount;
                        schedule.PendingAmount -= remainingPaymentAmount;
                        schedule.Status = PaymentStatus.PARTIAL;
                        schedule.PaidDate = paymentDateUtc;
                        schedule.UpdatedAt = DateTime.UtcNow;

                        var payment = new LoanPayment
                        {
                            LoanId = dto.LoanId,
                            CustomerId = loan.CustomerId,
                            ScheduleId = schedule.Id,
                            PaymentDate = paymentDateUtc,
                            Amount = remainingPaymentAmount,
                            PaymentMonth = schedMonth,
                            PaymentMethod = dto.PaymentMethod,
                            ReceiptNo = receiptNo,
                            Notes = dto.Notes,
                            CollectedBy = collectorId,
                            CreatedAt = DateTime.UtcNow
                        };

                        _dbContext.LoanPayments.Add(payment);
                        lastCreatedPayment = payment;
                        remainingPaymentAmount = 0;
                        await _dbContext.SaveChangesAsync();
                    }
                }
            }

            // Advance payment handling
            if (remainingPaymentAmount > 0)
            {
                var lastSchedule = await _dbContext.LoanRepaymentSchedules
                    .Where(ps => ps.LoanId == dto.LoanId)
                    .OrderByDescending(ps => ps.InstallmentNo)
                    .FirstOrDefaultAsync();

                if (lastSchedule != null)
                {
                    lastSchedule.PaidAmount += remainingPaymentAmount;
                    lastSchedule.AdvanceAmount += remainingPaymentAmount;
                    lastSchedule.PendingAmount = 0;
                    lastSchedule.Status = PaymentStatus.ADVANCE;
                    lastSchedule.PaidDate = paymentDateUtc;
                    lastSchedule.UpdatedAt = DateTime.UtcNow;

                    var payment = new LoanPayment
                    {
                        LoanId = dto.LoanId,
                        CustomerId = loan.CustomerId,
                        ScheduleId = lastSchedule.Id,
                        PaymentDate = paymentDateUtc,
                        Amount = remainingPaymentAmount,
                        PaymentMonth = monthStr,
                        PaymentMethod = dto.PaymentMethod,
                        ReceiptNo = receiptNo,
                        Notes = dto.Notes,
                        CollectedBy = collectorId,
                        CreatedAt = DateTime.UtcNow
                    };

                    _dbContext.LoanPayments.Add(payment);
                    lastCreatedPayment = payment;
                    await _dbContext.SaveChangesAsync();
                }
            }

            // Update Loan Totals
            loan.TotalPaid += dto.Amount;
            loan.RemainingAmount = Math.Max(0, loan.TotalRecoverable - loan.TotalPaid);
            loan.TotalPending = loan.RemainingAmount;

            if (loan.RemainingAmount <= 0)
            {
                loan.RemainingAmount = 0;
                loan.TotalPending = 0;
                loan.Status = ChitStatus.COMPLETED;
            }

            loan.UpdatedAt = DateTime.UtcNow;
            await _dbContext.SaveChangesAsync();

            await transaction.CommitAsync();

            if (lastCreatedPayment == null) throw new InvalidOperationException("Failed to record loan payment.");

            // Send Firebase notification to customer immediately after database commit!
            var customer = loan.Customer;
            if (customer != null)
            {
                _ = Task.Run(async () =>
                {
                    try
                    {
                        await _notificationService.SendLoanPaymentNotificationAsync(
                            customer.Id,
                            lastCreatedPayment.Id,
                            customer.Name,
                            customer.MobileNo,
                            dto.Amount,
                            monthStr,
                            loan.RemainingAmount);
                    }
                    catch
                    {
                        // Swallowed as per requirements
                    }
                });
            }

            // Reload for correct DTO mapping
            var savedPayment = await _dbContext.LoanPayments
                .Include(p => p.Customer)
                .Include(p => p.Loan)
                .Include(p => p.Schedule)
                .Include(p => p.Collector)
                .FirstAsync(p => p.Id == lastCreatedPayment.Id);
                
            return MapToPaymentDto(savedPayment);
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }
    
    private async Task<int> GetFallbackAdminIdAsync()
    {
        if (_currentUserService.UserId.HasValue)
        {
            var userExists = await _dbContext.Users.AnyAsync(u => u.Id == _currentUserService.UserId.Value);
            if (userExists) return _currentUserService.UserId.Value;
        }

        var fallbackUser = await _dbContext.Users.FirstOrDefaultAsync();
        return fallbackUser != null ? fallbackUser.Id : 1;
    }

    private static LoanDto MapToDto(CustomerLoan loan)
    {
        var schedules = loan.Schedules ?? new List<LoanRepaymentSchedule>();
        var nextSchedule = schedules
            .Where(s => s.Status == PaymentStatus.PENDING || s.Status == PaymentStatus.PARTIAL)
            .OrderBy(s => s.InstallmentNo)
            .FirstOrDefault();

        return new LoanDto
        {
            Id = loan.Id,
            CustomerId = loan.CustomerId,
            CustomerName = loan.Customer?.Name,
            CustomerCode = loan.Customer?.CustomerCode,
            CustomerMobile = loan.Customer?.MobileNo,
            LoanNumber = loan.LoanNumber,
            LoanDate = loan.LoanDate,
            StartMonth = loan.LoanDate.ToString("MMMM yyyy"),
            PrincipalAmount = loan.LoanAmount,
            InterestAmount = loan.InterestAmount,
            ServiceCharge = loan.ServiceCharge,
            OtherCharges = loan.OtherCharges,
            RepaymentFrequency = loan.RepaymentFrequency,
            InstallmentAmount = loan.InstallmentAmount,
            NumberOfInstallments = loan.NumberOfInstallments,
            FirstDueDate = loan.FirstDueDate,
            TotalPaid = loan.TotalPaid,
            TotalPending = loan.TotalPending,
            RemainingAmount = loan.RemainingAmount,
            CurrentPendingMonth = nextSchedule != null ? nextSchedule.DueDate.ToString("MMMM yyyy") : (loan.Status == ChitStatus.COMPLETED ? "Completed" : "N/A"),
            NextPaymentMonth = nextSchedule != null ? nextSchedule.DueDate.ToString("MMMM yyyy") : (loan.Status == ChitStatus.COMPLETED ? "Completed" : "N/A"),
            NextPaymentDueDate = nextSchedule?.DueDate,
            Status = loan.Status,
            Notes = loan.Notes,
            CreatedAt = loan.CreatedAt
        };
    }
    
    private static LoanRepaymentScheduleDto MapToScheduleDto(LoanRepaymentSchedule ps)
    {
        return new LoanRepaymentScheduleDto
        {
            Id = ps.Id,
            LoanId = ps.LoanId,
            LoanNumber = ps.Loan?.LoanNumber,
            CustomerId = ps.CustomerId,
            CustomerName = ps.Customer?.Name,
            CustomerCode = ps.Customer?.CustomerCode,
            CustomerMobile = ps.Customer?.MobileNo,
            InstallmentNo = ps.InstallmentNo,
            DueDate = ps.DueDate,
            ExpectedAmount = ps.ExpectedAmount,
            PaidAmount = ps.PaidAmount,
            PendingAmount = ps.PendingAmount,
            AdvanceAmount = ps.AdvanceAmount,
            Status = ps.Status,
            PaidDate = ps.PaidDate,
            OverdueDays = DateTime.UtcNow > ps.DueDate && ps.PendingAmount > 0 ? (DateTime.UtcNow - ps.DueDate).Days : 0
        };
    }

    private static LoanPaymentDto MapToPaymentDto(LoanPayment p)
    {
        return new LoanPaymentDto
        {
            Id = p.Id,
            LoanId = p.LoanId,
            LoanNumber = p.Loan?.LoanNumber,
            CustomerId = p.CustomerId,
            CustomerName = p.Customer?.Name,
            CustomerCode = p.Customer?.CustomerCode,
            CustomerMobile = p.Customer?.MobileNo,
            ScheduleId = p.ScheduleId,
            InstallmentNo = p.Schedule?.InstallmentNo ?? 0,
            PaymentDate = p.PaymentDate,
            PaymentMonth = p.PaymentMonth ?? p.PaymentDate.ToString("MMMM yyyy"),
            Amount = p.Amount,
            PaymentMethod = p.PaymentMethod,
            ReceiptNo = p.ReceiptNo,
            Notes = p.Notes,
            CollectedBy = p.CollectedBy,
            CollectedByName = p.Collector?.FullName,
            CreatedAt = p.CreatedAt
        };
    }
}
