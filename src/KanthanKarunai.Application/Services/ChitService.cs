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

public class ChitService : IChitService
{
    private readonly IApplicationDbContext _dbContext;
    private readonly IAuditLogService _auditLogService;

    public ChitService(IApplicationDbContext dbContext, IAuditLogService auditLogService)
    {
        _dbContext = dbContext;
        _auditLogService = auditLogService;
    }

    public decimal CalculateAdjustedMonthlyPayment(decimal normalMonthlyPayment, decimal amountTaken, decimal interestRate)
    {
        if (amountTaken <= 0 || interestRate <= 0) return normalMonthlyPayment;
        decimal monthlyInterest = Math.Round(amountTaken * (interestRate / 100m), 2);
        return normalMonthlyPayment + monthlyInterest;
    }

    public async Task<IEnumerable<ChitDto>> GetChitsAsync()
    {
        var chits = await _dbContext.Chits
            .Include(c => c.Customer)
            .Include(c => c.PaymentSchedules)
            .OrderByDescending(c => c.CreatedAt)
            .ToListAsync();

        return chits.Select(c => MapToDto(c));
    }

    public async Task<ChitDto?> GetChitByIdAsync(int id)
    {
        var c = await _dbContext.Chits
            .Include(c => c.Customer)
            .Include(c => c.PaymentSchedules)
            .FirstOrDefaultAsync(c => c.Id == id);

        if (c == null) return null;

        return MapToDto(c);
    }

    public async Task<ChitDto> CreateChitAsync(CreateChitDto dto)
    {
        var customer = await _dbContext.Customers.FindAsync(dto.CustomerId);
        if (customer == null)
        {
            throw new ArgumentException("Customer not found.");
        }

        decimal chitAmount = dto.ChitAmount.HasValue && dto.ChitAmount.Value > 0
            ? dto.ChitAmount.Value
            : (dto.TotalChitAmount.HasValue && dto.TotalChitAmount.Value > 0 ? dto.TotalChitAmount.Value : 0);

        decimal monthlyPayment = dto.MonthlyPayment > 0 ? dto.MonthlyPayment : (dto.PaymentAmount ?? 0);
        if (monthlyPayment <= 0)
        {
            throw new ArgumentException("Monthly payment amount must be greater than zero.");
        }

        // Auto-calculate Total Months = Chit Amount / Monthly Payment
        int duration = dto.Duration.HasValue && dto.Duration.Value > 0
            ? dto.Duration.Value
            : (chitAmount > 0 ? (int)Math.Ceiling(chitAmount / monthlyPayment) : 20);

        if (duration <= 0) duration = 20;

        if (chitAmount <= 0)
        {
            chitAmount = monthlyPayment * duration;
        }

        // Parse StartDate from StartMonth or StartDate
        DateTime startDate = DateTime.UtcNow.Date;
        if (!string.IsNullOrWhiteSpace(dto.StartMonth))
        {
            if (DateTime.TryParse(dto.StartMonth, out var parsedMonth))
            {
                startDate = new DateTime(parsedMonth.Year, parsedMonth.Month, 1);
            }
            else if (DateTime.TryParseExact(dto.StartMonth, new[] { "yyyy-MM", "MMMM yyyy", "MMM yyyy", "yyyy-MM-dd" }, 
                     System.Globalization.CultureInfo.InvariantCulture, System.Globalization.DateTimeStyles.None, out var exactMonth))
            {
                startDate = new DateTime(exactMonth.Year, exactMonth.Month, 1);
            }
        }
        else if (dto.StartDate.HasValue)
        {
            startDate = new DateTime(dto.StartDate.Value.Year, dto.StartDate.Value.Month, dto.StartDate.Value.Day);
        }

        // Calculate End Date
        DateTime endDate = startDate;
        switch (dto.PaymentFrequency)
        {
            case PaymentFrequency.DAILY:
                endDate = startDate.AddDays(duration - 1);
                break;
            case PaymentFrequency.WEEKLY:
                endDate = startDate.AddDays((duration - 1) * 7);
                break;
            case PaymentFrequency.MONTHLY:
                endDate = startDate.AddMonths(duration - 1);
                break;
        }

        string chitName = !string.IsNullOrWhiteSpace(dto.ChitName) 
            ? dto.ChitName.Trim() 
            : $"{customer.Name} - ₹{chitAmount:N0} Chit";

        var chit = new Chit
        {
            CustomerId = dto.CustomerId,
            ChitName = chitName,
            PaymentFrequency = dto.PaymentFrequency,
            PaymentAmount = monthlyPayment,
            TotalChitAmount = chitAmount,
            Duration = duration,
            StartDate = DateTime.SpecifyKind(startDate, DateTimeKind.Utc),
            EndDate = DateTime.SpecifyKind(endDate, DateTimeKind.Utc),
            Status = ChitStatus.ACTIVE,
            Notes = dto.Notes,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _dbContext.Chits.Add(chit);
        await _dbContext.SaveChangesAsync();

        // Generate initial schedule with normal monthly payment
        var schedules = new List<PaymentSchedule>();
        for (int i = 1; i <= duration; i++)
        {
            DateTime dueDate = startDate;
            switch (dto.PaymentFrequency)
            {
                case PaymentFrequency.DAILY:
                    dueDate = startDate.AddDays(i - 1);
                    break;
                case PaymentFrequency.WEEKLY:
                    dueDate = startDate.AddDays((i - 1) * 7);
                    break;
                case PaymentFrequency.MONTHLY:
                    dueDate = startDate.AddMonths(i - 1);
                    break;
            }

            schedules.Add(new PaymentSchedule
            {
                ChitId = chit.Id,
                CustomerId = dto.CustomerId,
                InstallmentNo = i,
                DueDate = DateTime.SpecifyKind(dueDate, DateTimeKind.Utc),
                ExpectedAmount = monthlyPayment,
                PaidAmount = 0,
                PendingAmount = monthlyPayment,
                AdvanceAmount = 0,
                Status = PaymentStatus.PENDING,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            });
        }

        _dbContext.PaymentSchedules.AddRange(schedules);
        await _dbContext.SaveChangesAsync();

        await _auditLogService.LogAsync("Chit Created", "chits", chit.Id.ToString(), null, chit);

        chit.Customer = customer;
        chit.PaymentSchedules = schedules;
        return MapToDto(chit);
    }

    public async Task<ChitDto> RecordAmountTakenAsync(RecordAmountTakenDto dto)
    {
        var chit = await _dbContext.Chits
            .Include(c => c.Customer)
            .Include(c => c.PaymentSchedules)
            .FirstOrDefaultAsync(c => c.Id == dto.ChitId);

        if (chit == null)
        {
            throw new ArgumentException("Chit package not found.");
        }

        if (dto.AmountTaken <= 0)
        {
            throw new ArgumentException("Amount taken must be greater than zero.");
        }

        if (dto.AmountTakenMonth < 1 || dto.AmountTakenMonth > chit.Duration)
        {
            throw new ArgumentException($"Amount taken month must be between 1 and {chit.Duration}.");
        }

        decimal rate = dto.InterestRate.HasValue && dto.InterestRate.Value > 0 ? dto.InterestRate.Value : 1.0m;
        decimal adjustedMonthly = CalculateAdjustedMonthlyPayment(chit.PaymentAmount, dto.AmountTaken, rate);

        DateTime takenDate = dto.AmountTakenDate.HasValue 
            ? DateTime.SpecifyKind(dto.AmountTakenDate.Value, DateTimeKind.Utc) 
            : DateTime.UtcNow;

        var oldState = new
        {
            chit.AmountTaken,
            chit.AmountTakenMonth,
            chit.AmountTakenDate,
            chit.InterestRate,
            chit.AdjustedMonthlyPayment
        };

        chit.AmountTaken = dto.AmountTaken;
        chit.AmountTakenMonth = dto.AmountTakenMonth;
        chit.AmountTakenDate = takenDate;
        chit.InterestRate = rate;
        chit.AdjustedMonthlyPayment = adjustedMonthly;
        chit.UpdatedAt = DateTime.UtcNow;

        // Update future payment schedules (InstallmentNo > AmountTakenMonth)
        if (chit.PaymentSchedules != null && chit.PaymentSchedules.Any())
        {
            foreach (var schedule in chit.PaymentSchedules)
            {
                if (schedule.InstallmentNo > dto.AmountTakenMonth)
                {
                    schedule.ExpectedAmount = adjustedMonthly;
                    schedule.PendingAmount = Math.Max(0, adjustedMonthly - schedule.PaidAmount);
                    if (schedule.PaidAmount >= adjustedMonthly)
                    {
                        schedule.Status = PaymentStatus.PAID;
                    }
                    else if (schedule.PaidAmount > 0)
                    {
                        schedule.Status = PaymentStatus.PARTIAL;
                    }
                    else
                    {
                        schedule.Status = PaymentStatus.PENDING;
                    }
                    schedule.UpdatedAt = DateTime.UtcNow;
                }
            }
        }

        await _dbContext.SaveChangesAsync();
        await _auditLogService.LogAsync("Chit Amount Taken Recorded", "chits", chit.Id.ToString(), oldState, chit);

        return MapToDto(chit);
    }

    public AmountTakenPreviewDto PreviewAmountTaken(int chitId, decimal amountTaken, int amountTakenMonth, decimal interestRate = 1.0m)
    {
        var chit = _dbContext.Chits
            .Include(c => c.PaymentSchedules)
            .FirstOrDefault(c => c.Id == chitId);

        if (chit == null)
        {
            throw new ArgumentException("Chit package not found.");
        }

        decimal rate = interestRate > 0 ? interestRate : 1.0m;
        decimal monthlyInterest = Math.Round(amountTaken * (rate / 100m), 2);
        decimal adjustedMonthly = chit.PaymentAmount + monthlyInterest;

        int completed = amountTakenMonth;
        int remaining = Math.Max(0, chit.Duration - completed);
        decimal remainingCollection = remaining * adjustedMonthly;

        return new AmountTakenPreviewDto
        {
            ChitId = chitId,
            ChitAmount = chit.TotalChitAmount,
            Duration = chit.Duration,
            MonthlyPayment = chit.PaymentAmount,
            AmountTaken = amountTaken,
            AmountTakenMonth = amountTakenMonth,
            InterestRate = rate,
            MonthlyInterestAmount = monthlyInterest,
            AdjustedMonthlyPayment = adjustedMonthly,
            CompletedMonths = completed,
            RemainingMonths = remaining,
            RemainingCollection = remainingCollection
        };
    }

    public async Task<IEnumerable<PendingChitDueItemDto>> GetPendingChitDuesAsync(string? query = null)
    {
        var chits = await _dbContext.Chits
            .Include(c => c.Customer)
            .Include(c => c.PaymentSchedules)
            .Where(c => c.Status == ChitStatus.ACTIVE)
            .OrderByDescending(c => c.CreatedAt)
            .ToListAsync();

        if (!string.IsNullOrWhiteSpace(query))
        {
            var lower = query.ToLower();
            chits = chits.Where(c => c.Customer != null &&
                                    (c.Customer.Name.ToLower().Contains(lower) ||
                                     c.Customer.CustomerCode.ToLower().Contains(lower) ||
                                     c.Customer.MobileNo.Contains(lower))).ToList();
        }

        var now = DateTime.UtcNow;
        var currentMonthEnd = new DateTime(now.Year, now.Month, DateTime.DaysInMonth(now.Year, now.Month), 23, 59, 59, DateTimeKind.Utc);

        return chits.Select(c =>
        {
            var schedules = c.PaymentSchedules ?? new List<PaymentSchedule>();
            int completedMonths = schedules.Count(s => s.Status == PaymentStatus.PAID || s.PaidAmount >= s.ExpectedAmount);
            int remainingMonths = Math.Max(0, c.Duration - completedMonths);

            // Determine current monthly due
            decimal currentMonthlyDue = c.AdjustedMonthlyPayment.HasValue && c.AmountTakenMonth.HasValue
                ? (completedMonths >= c.AmountTakenMonth.Value ? c.AdjustedMonthlyPayment.Value : c.PaymentAmount)
                : c.PaymentAmount;

            // Pending amount till current month
            decimal expectedTillNow = schedules.Where(s => s.DueDate <= currentMonthEnd).Sum(s => s.ExpectedAmount);
            decimal totalPaid = schedules.Sum(s => s.PaidAmount);
            decimal pendingDue = Math.Max(0, expectedTillNow - totalPaid);

            // Next payment amount
            var nextUnpaid = schedules.Where(s => s.Status != PaymentStatus.PAID).OrderBy(s => s.InstallmentNo).FirstOrDefault();
            decimal nextPayment = nextUnpaid != null ? nextUnpaid.ExpectedAmount : currentMonthlyDue;

            return new PendingChitDueItemDto
            {
                ChitId = c.Id,
                CustomerId = c.CustomerId,
                CustomerName = c.Customer?.Name ?? "Customer",
                CustomerCode = c.Customer?.CustomerCode ?? "-",
                CustomerMobile = c.Customer?.MobileNo ?? "-",
                ChitAmount = c.TotalChitAmount,
                Duration = c.Duration,
                MonthlyBeforeAmountTaken = c.PaymentAmount,
                AmountTaken = c.AmountTaken,
                AmountTakenMonth = c.AmountTakenMonth,
                CompletedMonths = completedMonths,
                RemainingMonths = remainingMonths,
                MonthlyAfterAmountTaken = c.AdjustedMonthlyPayment,
                CurrentMonthlyDue = currentMonthlyDue,
                PendingChitDue = pendingDue > 0 ? pendingDue : currentMonthlyDue,
                NextPayment = nextPayment,
                Status = c.Status.ToString()
            };
        });
    }

    public async Task<IEnumerable<PaymentScheduleDto>> GetScheduleAsync(int chitId)
    {
        var chit = await _dbContext.Chits
            .Include(c => c.Customer)
            .Include(c => c.PaymentSchedules)
            .FirstOrDefaultAsync(c => c.Id == chitId);

        if (chit == null) return Enumerable.Empty<PaymentScheduleDto>();

        var schedules = chit.PaymentSchedules.OrderBy(ps => ps.InstallmentNo).ToList();
        var now = DateTime.UtcNow;
        var currentMonthEnd = new DateTime(now.Year, now.Month, DateTime.DaysInMonth(now.Year, now.Month), 23, 59, 59, DateTimeKind.Utc);

        return schedules.Select(ps =>
        {
            var isUpcoming = ps.DueDate > currentMonthEnd && ps.PaidAmount == 0;
            var isPaid = ps.PaidAmount >= ps.ExpectedAmount;
            var status = isPaid 
                ? PaymentStatus.PAID 
                : (isUpcoming ? PaymentStatus.PENDING : (ps.PaidAmount > 0 ? PaymentStatus.PARTIAL : PaymentStatus.PENDING));

            var pendingAmount = isPaid ? 0 : (isUpcoming ? 0 : Math.Max(0, ps.ExpectedAmount - ps.PaidAmount));

            decimal normalDue = chit.PaymentAmount;
            decimal interestPortion = (chit.AmountTakenMonth.HasValue && ps.InstallmentNo > chit.AmountTakenMonth.Value)
                ? (ps.ExpectedAmount - normalDue)
                : 0m;

            string amountTakenInfo = "No";
            if (chit.AmountTakenMonth.HasValue)
            {
                if (ps.InstallmentNo == chit.AmountTakenMonth.Value)
                {
                    amountTakenInfo = $"₹{chit.AmountTaken:N0}";
                }
                else if (ps.InstallmentNo > chit.AmountTakenMonth.Value)
                {
                    amountTakenInfo = "Yes";
                }
            }

            return new PaymentScheduleDto
            {
                Id = ps.Id,
                ChitId = ps.ChitId,
                ChitName = chit.ChitName,
                CustomerId = ps.CustomerId,
                CustomerName = chit.Customer?.Name,
                CustomerCode = chit.Customer?.CustomerCode,
                CustomerMobile = chit.Customer?.MobileNo,
                InstallmentNo = ps.InstallmentNo,
                DueDate = ps.DueDate,
                ExpectedAmount = ps.ExpectedAmount,
                NormalDue = normalDue,
                InterestPortion = interestPortion,
                AmountTakenInfo = amountTakenInfo,
                PaidAmount = ps.PaidAmount,
                PendingAmount = pendingAmount,
                AdvanceAmount = ps.AdvanceAmount,
                Status = status,
                PaidDate = ps.PaidDate,
                OverdueDays = !isPaid && now > ps.DueDate && pendingAmount > 0
                    ? (now - ps.DueDate).Days
                    : 0
            };
        });
    }

    private static ChitDto MapToDto(Chit c)
    {
        var schedules = c.PaymentSchedules ?? new List<PaymentSchedule>();
        decimal totalPaid = schedules.Sum(s => s.PaidAmount);

        // Completed Months
        int completedMonths = schedules.Count(s => s.Status == PaymentStatus.PAID || s.PaidAmount >= s.ExpectedAmount);
        int remainingMonths = Math.Max(0, c.Duration - completedMonths);

        // Remaining collection across unpaid installments
        decimal remainingCollection = schedules
            .Where(s => s.Status != PaymentStatus.PAID && s.PaidAmount < s.ExpectedAmount)
            .Sum(s => s.ExpectedAmount - s.PaidAmount);

        if (remainingCollection == 0 && remainingMonths > 0)
        {
            decimal monthly = c.AdjustedMonthlyPayment ?? c.PaymentAmount;
            remainingCollection = remainingMonths * monthly;
        }

        var now = DateTime.UtcNow;
        var currentMonthEnd = new DateTime(now.Year, now.Month, DateTime.DaysInMonth(now.Year, now.Month), 23, 59, 59, DateTimeKind.Utc);

        // Expected amount till current month
        decimal expectedTillCurrentMonth = schedules
            .Where(s => s.DueDate <= currentMonthEnd)
            .Sum(s => s.ExpectedAmount);

        decimal pendingChitDue = Math.Max(0, expectedTillCurrentMonth - totalPaid);

        // Next pending / upcoming schedule
        var nextSchedule = schedules
            .Where(s => s.Status == PaymentStatus.PENDING || s.Status == PaymentStatus.PARTIAL)
            .OrderBy(s => s.InstallmentNo)
            .FirstOrDefault();

        decimal currentMonthlyDue = c.AdjustedMonthlyPayment.HasValue && c.AmountTakenMonth.HasValue
            ? (completedMonths >= c.AmountTakenMonth.Value ? c.AdjustedMonthlyPayment.Value : c.PaymentAmount)
            : c.PaymentAmount;

        decimal nextPaymentAmount = nextSchedule != null ? nextSchedule.ExpectedAmount : currentMonthlyDue;

        return new ChitDto
        {
            Id = c.Id,
            CustomerId = c.CustomerId,
            CustomerName = c.Customer?.Name,
            CustomerCode = c.Customer?.CustomerCode,
            CustomerMobile = c.Customer?.MobileNo,
            ChitName = c.ChitName,
            PaymentFrequency = c.PaymentFrequency,
            PaymentAmount = c.PaymentAmount,
            TotalChitAmount = c.TotalChitAmount,
            Duration = c.Duration,
            StartDate = c.StartDate,
            StartMonth = c.StartDate.ToString("MMMM yyyy"),
            EndDate = c.EndDate,
            AmountTaken = c.AmountTaken,
            AmountTakenMonth = c.AmountTakenMonth,
            AmountTakenDate = c.AmountTakenDate,
            InterestRate = c.InterestRate,
            AdjustedMonthlyPayment = c.AdjustedMonthlyPayment,
            CompletedMonths = completedMonths,
            RemainingMonths = remainingMonths,
            CurrentMonthlyDue = currentMonthlyDue,
            RemainingCollection = remainingCollection,
            TotalPaid = totalPaid,
            PaidAmount = totalPaid,
            RemainingChitAmount = Math.Max(0, c.TotalChitAmount - totalPaid),
            RemainingAmount = Math.Max(0, c.TotalChitAmount - totalPaid),
            ExpectedTillCurrentMonth = expectedTillCurrentMonth,
            PendingChitDue = pendingChitDue > 0 ? pendingChitDue : (schedules.Any(s => s.DueDate <= currentMonthEnd) ? 0 : currentMonthlyDue),
            PendingAmount = pendingChitDue,
            NextPaymentAmount = nextPaymentAmount,
            NextPaymentMonth = nextSchedule != null ? nextSchedule.DueDate.ToString("MMMM yyyy") : (c.Status == ChitStatus.COMPLETED || remainingCollection == 0 ? "Completed" : "N/A"),
            NextPaymentDueDate = nextSchedule?.DueDate,
            Status = (remainingCollection == 0 && totalPaid > 0) ? ChitStatus.COMPLETED : c.Status,
            Notes = c.Notes,
            CreatedAt = c.CreatedAt
        };
    }
}
