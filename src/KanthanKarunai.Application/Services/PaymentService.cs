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

public class PaymentService : IPaymentService
{
    private readonly IApplicationDbContext _dbContext;
    private readonly ICurrentUserService _currentUserService;
    private readonly IAuditLogService _auditLogService;
    private readonly INotificationService _notificationService;

    public PaymentService(
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

    public async Task<IEnumerable<PaymentDto>> GetPaymentsAsync()
    {
        return await _dbContext.Payments
            .Include(p => p.Customer)
            .Include(p => p.Chit)
            .Include(p => p.Collector)
            .OrderByDescending(p => p.PaymentDate)
            .Select(p => new PaymentDto
            {
                Id = p.Id,
                CustomerId = p.CustomerId,
                CustomerName = p.Customer != null ? p.Customer.Name : null,
                CustomerCode = p.Customer != null ? p.Customer.CustomerCode : null,
                CustomerMobile = p.Customer != null ? p.Customer.MobileNo : null,
                ChitId = p.ChitId,
                ChitName = p.Chit != null ? p.Chit.ChitName : null,
                PaymentScheduleId = p.PaymentScheduleId,
                InstallmentNo = p.PaymentSchedule != null ? p.PaymentSchedule.InstallmentNo : 0,
                PaymentDate = p.PaymentDate,
                Amount = p.Amount,
                PaymentMonth = p.PaymentMonth,
                PaymentType = p.PaymentType,
                PaymentMethod = p.PaymentMethod,
                ReceiptNo = p.ReceiptNo,
                Notes = p.Notes,
                CollectedBy = p.CollectedBy,
                CollectedByName = p.Collector != null ? p.Collector.FullName : null,
                CreatedAt = p.CreatedAt
            })
            .ToListAsync();
    }

    public async Task<PaymentDto?> GetPaymentByIdAsync(int id)
    {
        var p = await _dbContext.Payments
            .Include(p => p.Customer)
            .Include(p => p.Chit)
            .Include(p => p.PaymentSchedule)
            .Include(p => p.Collector)
            .FirstOrDefaultAsync(p => p.Id == id);

        if (p == null) return null;

        return new PaymentDto
        {
            Id = p.Id,
            CustomerId = p.CustomerId,
            CustomerName = p.Customer != null ? p.Customer.Name : null,
            CustomerCode = p.Customer != null ? p.Customer.CustomerCode : null,
            CustomerMobile = p.Customer != null ? p.Customer.MobileNo : null,
            ChitId = p.ChitId,
            ChitName = p.Chit != null ? p.Chit.ChitName : null,
            PaymentScheduleId = p.PaymentScheduleId,
            InstallmentNo = p.PaymentSchedule != null ? p.PaymentSchedule.InstallmentNo : 0,
            PaymentDate = p.PaymentDate,
            Amount = p.Amount,
            PaymentMonth = p.PaymentMonth,
            PaymentType = p.PaymentType,
            PaymentMethod = p.PaymentMethod,
            ReceiptNo = p.ReceiptNo,
            Notes = p.Notes,
            CollectedBy = p.CollectedBy,
            CollectedByName = p.Collector != null ? p.Collector.FullName : null,
            CreatedAt = p.CreatedAt
        };
    }

    public async Task<IEnumerable<PaymentDto>> GetCustomerPaymentsAsync(int customerId)
    {
        return await _dbContext.Payments
            .Include(p => p.Customer)
            .Include(p => p.Chit)
            .Include(p => p.PaymentSchedule)
            .Include(p => p.Collector)
            .Where(p => p.CustomerId == customerId)
            .OrderByDescending(p => p.PaymentDate)
            .Select(p => new PaymentDto
            {
                Id = p.Id,
                CustomerId = p.CustomerId,
                CustomerName = p.Customer != null ? p.Customer.Name : null,
                CustomerCode = p.Customer != null ? p.Customer.CustomerCode : null,
                CustomerMobile = p.Customer != null ? p.Customer.MobileNo : null,
                ChitId = p.ChitId,
                ChitName = p.Chit != null ? p.Chit.ChitName : null,
                PaymentScheduleId = p.PaymentScheduleId,
                InstallmentNo = p.PaymentSchedule != null ? p.PaymentSchedule.InstallmentNo : 0,
                PaymentDate = p.PaymentDate,
                Amount = p.Amount,
                PaymentMonth = p.PaymentMonth,
                PaymentType = p.PaymentType,
                PaymentMethod = p.PaymentMethod,
                ReceiptNo = p.ReceiptNo,
                Notes = p.Notes,
                CollectedBy = p.CollectedBy,
                CollectedByName = p.Collector != null ? p.Collector.FullName : null,
                CreatedAt = p.CreatedAt
            })
            .ToListAsync();
    }

    public async Task<IEnumerable<PaymentScheduleDto>> GetPendingPaymentsAsync(string? query, string? frequency)
    {
        var dbQuery = _dbContext.PaymentSchedules
            .Include(ps => ps.Customer)
            .Include(ps => ps.Chit)
            .Where(ps => ps.Status == PaymentStatus.PENDING || ps.Status == PaymentStatus.PARTIAL);

        if (!string.IsNullOrWhiteSpace(query))
        {
            var lowerQuery = query.ToLower();
            dbQuery = dbQuery.Where(ps => ps.Customer != null && 
                                         (ps.Customer.Name.ToLower().Contains(lowerQuery) || 
                                          ps.Customer.CustomerCode.ToLower().Contains(lowerQuery) ||
                                          ps.Customer.MobileNo.Contains(lowerQuery)));
        }

        if (!string.IsNullOrWhiteSpace(frequency))
        {
            dbQuery = dbQuery.Where(ps => ps.Chit != null && ps.Chit.PaymentFrequency.ToString() == frequency);
        }

        var results = await dbQuery
            .OrderBy(ps => ps.DueDate)
            .ToListAsync();

        return results.Select(ps => new PaymentScheduleDto
        {
            Id = ps.Id,
            ChitId = ps.ChitId,
            ChitName = ps.Chit != null ? ps.Chit.ChitName : null,
            CustomerId = ps.CustomerId,
            CustomerName = ps.Customer != null ? ps.Customer.Name : null,
            CustomerCode = ps.Customer != null ? ps.Customer.CustomerCode : null,
            CustomerMobile = ps.Customer != null ? ps.Customer.MobileNo : null,
            InstallmentNo = ps.InstallmentNo,
            DueDate = ps.DueDate,
            ExpectedAmount = ps.ExpectedAmount,
            PaidAmount = ps.PaidAmount,
            PendingAmount = ps.PendingAmount,
            AdvanceAmount = ps.AdvanceAmount,
            Status = ps.Status,
            PaidDate = ps.PaidDate,
            OverdueDays = DateTime.UtcNow > ps.DueDate ? (DateTime.UtcNow - ps.DueDate).Days : 0
        });
    }

    public async Task<IEnumerable<CustomerPendingPaymentDto>> GetCustomerPendingPaymentsSummaryAsync(string? query)
    {
        var chitsQuery = _dbContext.Chits
            .Include(c => c.Customer)
            .Include(c => c.PaymentSchedules)
            .Where(c => c.Status == ChitStatus.ACTIVE && c.Customer != null && c.Customer.Status == "ACTIVE");

        if (!string.IsNullOrWhiteSpace(query))
        {
            var lowerQuery = query.ToLower();
            chitsQuery = chitsQuery.Where(c => c.Customer.Name.ToLower().Contains(lowerQuery) || 
                                               c.Customer.CustomerCode.ToLower().Contains(lowerQuery) ||
                                               c.Customer.MobileNo.Contains(lowerQuery));
        }

        var chits = await chitsQuery.OrderBy(c => c.Customer.Name).ToListAsync();
        var now = DateTime.UtcNow;

        var result = new List<CustomerPendingPaymentDto>();

        foreach (var chit in chits)
        {
            var customer = chit.Customer!;
            var schedules = chit.PaymentSchedules.OrderBy(s => s.InstallmentNo).ToList();

            decimal totalPaid = schedules.Sum(s => s.PaidAmount);
            decimal totalPending = schedules.Sum(s => s.PendingAmount);

            // Due on or before current month end
            var currentMonthEnd = new DateTime(now.Year, now.Month, DateTime.DaysInMonth(now.Year, now.Month), 23, 59, 59, DateTimeKind.Utc);
            decimal currentMonthPending = schedules
                .Where(s => s.DueDate <= currentMonthEnd && (s.Status == PaymentStatus.PENDING || s.Status == PaymentStatus.PARTIAL))
                .Sum(s => s.PendingAmount);

            // Upcoming months
            decimal upcomingMonthPayment = schedules
                .Where(s => s.DueDate > currentMonthEnd && (s.Status == PaymentStatus.PENDING || s.Status == PaymentStatus.PARTIAL))
                .Sum(s => s.ExpectedAmount);

            // Next pending month
            var nextPendingSchedule = schedules
                .Where(s => s.Status == PaymentStatus.PENDING || s.Status == PaymentStatus.PARTIAL)
                .OrderBy(s => s.InstallmentNo)
                .FirstOrDefault();

            string? nextPendingMonthStr = nextPendingSchedule?.DueDate.ToString("MMMM yyyy");
            string paymentStatus = totalPending == 0 ? "Paid" : (currentMonthPending > 0 ? "Pending" : "Upcoming");

            var dtoSchedules = schedules.Select(ps => new PaymentScheduleDto
            {
                Id = ps.Id,
                ChitId = ps.ChitId,
                ChitName = chit.ChitName,
                CustomerId = ps.CustomerId,
                CustomerName = customer.Name,
                CustomerCode = customer.CustomerCode,
                CustomerMobile = customer.MobileNo,
                InstallmentNo = ps.InstallmentNo,
                DueDate = ps.DueDate,
                ExpectedAmount = ps.ExpectedAmount,
                PaidAmount = ps.PaidAmount,
                PendingAmount = ps.PendingAmount,
                AdvanceAmount = ps.AdvanceAmount,
                Status = ps.Status,
                PaidDate = ps.PaidDate,
                OverdueDays = now > ps.DueDate && ps.PendingAmount > 0 ? (now - ps.DueDate).Days : 0
            }).ToList();

            result.Add(new CustomerPendingPaymentDto
            {
                CustomerId = customer.Id,
                CustomerName = customer.Name,
                CustomerCode = customer.CustomerCode,
                MobileNo = customer.MobileNo,
                ChitId = chit.Id,
                ChitName = chit.ChitName,
                MonthlyPayment = chit.PaymentAmount,
                TotalPaidAmount = totalPaid,
                TotalPendingAmount = totalPending,
                CurrentMonthPending = currentMonthPending,
                UpcomingMonthPayment = upcomingMonthPayment,
                CurrentPendingMonth = nextPendingMonthStr,
                NextPendingMonth = nextPendingMonthStr,
                PaymentStatus = paymentStatus,
                Schedules = dtoSchedules
            });
        }

        return result;
    }

    public async Task<PaymentDto> CreatePaymentAsync(CreatePaymentDto dto)
    {
        if (dto.Amount <= 0)
        {
            throw new ArgumentException("Payment amount must be greater than zero.");
        }

        var customer = await _dbContext.Customers.FindAsync(dto.CustomerId);
        if (customer == null)
        {
            throw new ArgumentException("Customer not found.");
        }

        // Find target Chit
        Chit? chit = null;
        if (dto.ChitId.HasValue && dto.ChitId.Value > 0)
        {
            chit = await _dbContext.Chits.FindAsync(dto.ChitId.Value);
        }
        else
        {
            chit = await _dbContext.Chits.FirstOrDefaultAsync(c => c.CustomerId == dto.CustomerId && c.Status == ChitStatus.ACTIVE);
        }

        if (chit == null)
        {
            throw new ArgumentException("Active chit not found for customer.");
        }

        // We wrap everything in a transaction to guarantee atomicity of the multiple installment updates.
        using var transaction = await _dbContext.Database.BeginTransactionAsync();
        try
        {
            // Get Collector Id robustly
            int collectorId = await GetValidCollectorIdAsync();

            // 1. Generate Receipt Number
            var istTime = DateTime.UtcNow.AddHours(5.5);
            var todayStr = istTime.ToString("yyyyMMdd");
            var prefix = $"KC-{todayStr}-";

            int nextIndex = 1;
            string receiptNo = $"{prefix}{nextIndex:D4}";
            while (await _dbContext.Payments.AnyAsync(p => p.ReceiptNo == receiptNo))
            {
                nextIndex++;
                receiptNo = $"{prefix}{nextIndex:D4}";
            }

            // 2. Fetch all unpaid schedule records for this chit sorted by installment number
            var schedules = await _dbContext.PaymentSchedules
                .Where(ps => ps.ChitId == chit.Id && ps.PendingAmount > 0)
                .OrderBy(ps => ps.InstallmentNo)
                .ToListAsync();

            // Determine Target Payment Month
            string monthStr = !string.IsNullOrWhiteSpace(dto.PaymentMonth) 
                ? dto.PaymentMonth.Trim() 
                : (schedules.FirstOrDefault()?.DueDate.ToString("MMMM yyyy") ?? dto.PaymentDate.ToString("MMMM yyyy"));

            // Duplicate payment check if not explicitly allowed
            if (!dto.AllowDuplicate && schedules.Any())
            {
                var firstSched = schedules.First();
                var alreadyPaidForMonth = await _dbContext.Payments
                    .AnyAsync(p => p.CustomerId == dto.CustomerId && p.ChitId == chit.Id && p.PaymentMonth == monthStr && p.PaymentScheduleId == firstSched.Id && p.Amount >= firstSched.ExpectedAmount);

                if (alreadyPaidForMonth)
                {
                    throw new ArgumentException($"A payment for {customer.Name} for month {monthStr} has already been recorded. Enable duplicate allowance if this is an additional payment.");
                }
            }

            decimal remainingPaymentAmount = dto.Amount;
            Payment? lastCreatedPayment = null;
            var paymentDateUtc = dto.PaymentDate.Kind == DateTimeKind.Utc
                ? dto.PaymentDate
                : DateTime.SpecifyKind(dto.PaymentDate, DateTimeKind.Utc);

            string notesToSave = !string.IsNullOrWhiteSpace(dto.Remarks) ? dto.Remarks : (dto.Notes ?? string.Empty);

            // Allocate payment amount across schedules
            if (schedules.Any())
            {
                foreach (var schedule in schedules)
                {
                    if (remainingPaymentAmount <= 0) break;

                    decimal pendingToPay = schedule.PendingAmount;
                    string schedMonth = schedule.DueDate.ToString("MMMM yyyy");

                    if (remainingPaymentAmount >= pendingToPay)
                    {
                        var oldScheduleState = new
                        {
                            schedule.PaidAmount,
                            schedule.PendingAmount,
                            schedule.AdvanceAmount,
                            schedule.Status,
                            schedule.PaidDate
                        };

                        schedule.PaidAmount += pendingToPay;
                        schedule.PendingAmount = 0;
                        schedule.Status = PaymentStatus.PAID;
                        schedule.PaidDate = paymentDateUtc;
                        schedule.UpdatedAt = DateTime.UtcNow;

                        remainingPaymentAmount -= pendingToPay;

                        var payment = new Payment
                        {
                            CustomerId = dto.CustomerId,
                            ChitId = chit.Id,
                            PaymentScheduleId = schedule.Id,
                            PaymentDate = paymentDateUtc,
                            Amount = pendingToPay,
                            PaymentMonth = schedMonth,
                            PaymentType = "INSTALLMENT",
                            PaymentMethod = dto.PaymentMethod,
                            ReceiptNo = receiptNo,
                            Notes = notesToSave,
                            CollectedBy = collectorId,
                            CreatedAt = DateTime.UtcNow
                        };

                        _dbContext.Payments.Add(payment);
                        lastCreatedPayment = payment;

                        await _dbContext.SaveChangesAsync();
                        await _auditLogService.LogAsync("Payment Schedule Updated", "payment_schedules", schedule.Id.ToString(), oldScheduleState, schedule);
                    }
                    else
                    {
                        var oldScheduleState = new
                        {
                            schedule.PaidAmount,
                            schedule.PendingAmount,
                            schedule.AdvanceAmount,
                            schedule.Status,
                            schedule.PaidDate
                        };

                        schedule.PaidAmount += remainingPaymentAmount;
                        schedule.PendingAmount -= remainingPaymentAmount;
                        schedule.Status = PaymentStatus.PARTIAL;
                        schedule.PaidDate = paymentDateUtc;
                        schedule.UpdatedAt = DateTime.UtcNow;

                        var payment = new Payment
                        {
                            CustomerId = dto.CustomerId,
                            ChitId = chit.Id,
                            PaymentScheduleId = schedule.Id,
                            PaymentDate = paymentDateUtc,
                            Amount = remainingPaymentAmount,
                            PaymentMonth = schedMonth,
                            PaymentType = "INSTALLMENT",
                            PaymentMethod = dto.PaymentMethod,
                            ReceiptNo = receiptNo,
                            Notes = notesToSave,
                            CollectedBy = collectorId,
                            CreatedAt = DateTime.UtcNow
                        };

                        _dbContext.Payments.Add(payment);
                        lastCreatedPayment = payment;
                        remainingPaymentAmount = 0;

                        await _dbContext.SaveChangesAsync();
                        await _auditLogService.LogAsync("Payment Schedule Updated", "payment_schedules", schedule.Id.ToString(), oldScheduleState, schedule);
                    }
                }
            }

            // 3. Excess Advance payment handling
            if (remainingPaymentAmount > 0)
            {
                var lastSchedule = await _dbContext.PaymentSchedules
                    .Where(ps => ps.ChitId == chit.Id)
                    .OrderByDescending(ps => ps.InstallmentNo)
                    .FirstOrDefaultAsync();

                if (lastSchedule != null)
                {
                    var oldScheduleState = new
                    {
                        lastSchedule.PaidAmount,
                        lastSchedule.PendingAmount,
                        lastSchedule.AdvanceAmount,
                        lastSchedule.Status,
                        lastSchedule.PaidDate
                    };

                    lastSchedule.PaidAmount += remainingPaymentAmount;
                    lastSchedule.AdvanceAmount += remainingPaymentAmount;
                    lastSchedule.PendingAmount = 0;
                    lastSchedule.Status = PaymentStatus.ADVANCE;
                    lastSchedule.PaidDate = paymentDateUtc;
                    lastSchedule.UpdatedAt = DateTime.UtcNow;

                    var payment = new Payment
                    {
                        CustomerId = dto.CustomerId,
                        ChitId = chit.Id,
                        PaymentScheduleId = lastSchedule.Id,
                        PaymentDate = paymentDateUtc,
                        Amount = remainingPaymentAmount,
                        PaymentMonth = monthStr,
                        PaymentType = "ADVANCE",
                        PaymentMethod = dto.PaymentMethod,
                        ReceiptNo = receiptNo,
                        Notes = notesToSave,
                        CollectedBy = collectorId,
                        CreatedAt = DateTime.UtcNow
                    };

                    _dbContext.Payments.Add(payment);
                    lastCreatedPayment = payment;

                    await _dbContext.SaveChangesAsync();
                    await _auditLogService.LogAsync("Payment Schedule Updated", "payment_schedules", lastSchedule.Id.ToString(), oldScheduleState, lastSchedule);
                }
            }

            if (lastCreatedPayment != null)
            {
                await _auditLogService.LogAsync("Payment Created", "payments", lastCreatedPayment.Id.ToString(), null, lastCreatedPayment);
            }

            await transaction.CommitAsync();

            if (lastCreatedPayment == null)
            {
                throw new InvalidOperationException("Failed to record payment.");
            }

            // 4. Send Firebase notification to customer immediately after successful database save!
            // Failure to send notification will NOT rollback payment.
            _ = Task.Run(async () =>
            {
                try
                {
                    await _notificationService.SendChitPaymentNotificationAsync(
                        customer.Id, 
                        lastCreatedPayment.Id, 
                        customer.Name, 
                        customer.MobileNo, 
                        dto.Amount, 
                        monthStr);
                }
                catch
                {
                    // Swallowed gracefully as per requirements
                }
            });

            return new PaymentDto
            {
                Id = lastCreatedPayment.Id,
                CustomerId = lastCreatedPayment.CustomerId,
                CustomerName = customer.Name,
                CustomerCode = customer.CustomerCode,
                CustomerMobile = customer.MobileNo,
                ChitId = lastCreatedPayment.ChitId,
                ChitName = chit.ChitName,
                PaymentScheduleId = lastCreatedPayment.PaymentScheduleId,
                PaymentDate = lastCreatedPayment.PaymentDate,
                Amount = dto.Amount,
                PaymentMonth = monthStr,
                PaymentType = lastCreatedPayment.PaymentType,
                PaymentMethod = lastCreatedPayment.PaymentMethod,
                ReceiptNo = lastCreatedPayment.ReceiptNo,
                Notes = lastCreatedPayment.Notes,
                CollectedBy = lastCreatedPayment.CollectedBy,
                CreatedAt = lastCreatedPayment.CreatedAt
            };
        }
        catch (Exception)
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    private async Task<int> GetValidCollectorIdAsync()
    {
        if (_currentUserService.UserId.HasValue)
        {
            var userExists = await _dbContext.Users.AnyAsync(u => u.Id == _currentUserService.UserId.Value);
            if (userExists) return _currentUserService.UserId.Value;
        }

        var fallbackUser = await _dbContext.Users.FirstOrDefaultAsync();
        return fallbackUser != null ? fallbackUser.Id : 1;
    }
}
