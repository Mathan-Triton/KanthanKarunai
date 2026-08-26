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

        decimal monthlyPayment = dto.MonthlyPayment > 0 ? dto.MonthlyPayment : (dto.PaymentAmount ?? 0);
        if (monthlyPayment <= 0)
        {
            throw new ArgumentException("Monthly payment amount must be greater than zero.");
        }

        int duration = dto.Duration ?? 20;
        if (duration <= 0) duration = 20;

        decimal totalAmount = dto.TotalChitAmount.HasValue && dto.TotalChitAmount.Value > 0 
            ? dto.TotalChitAmount.Value 
            : monthlyPayment * duration;

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
            : $"{customer.Name} - ₹{monthlyPayment:N0} Chit";

        var chit = new Chit
        {
            CustomerId = dto.CustomerId,
            ChitName = chitName,
            PaymentFrequency = dto.PaymentFrequency,
            PaymentAmount = monthlyPayment,
            TotalChitAmount = totalAmount,
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

        // Generate schedule
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

    private static ChitDto MapToDto(Chit c)
    {
        var schedules = c.PaymentSchedules ?? new List<PaymentSchedule>();
        decimal paidAmount = schedules.Sum(s => s.PaidAmount);
        decimal pendingAmount = schedules.Sum(s => s.PendingAmount);

        // Find next unpaid / pending installment
        var nextSchedule = schedules
            .Where(s => s.Status == PaymentStatus.PENDING || s.Status == PaymentStatus.PARTIAL)
            .OrderBy(s => s.InstallmentNo)
            .FirstOrDefault();

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
            PaidAmount = paidAmount,
            PendingAmount = pendingAmount,
            NextPaymentMonth = nextSchedule != null ? nextSchedule.DueDate.ToString("MMMM yyyy") : (c.Status == ChitStatus.COMPLETED ? "Completed" : "N/A"),
            NextPaymentDueDate = nextSchedule?.DueDate,
            Status = c.Status,
            Notes = c.Notes,
            CreatedAt = c.CreatedAt
        };
    }

    public async Task<IEnumerable<PaymentScheduleDto>> GetScheduleAsync(int chitId)
    {
        var schedules = await _dbContext.PaymentSchedules
            .Include(ps => ps.Customer)
            .Include(ps => ps.Chit)
            .Where(ps => ps.ChitId == chitId)
            .OrderBy(ps => ps.InstallmentNo)
            .ToListAsync();

        return schedules.Select(ps => new PaymentScheduleDto
        {
            Id = ps.Id,
            ChitId = ps.ChitId,
            ChitName = ps.Chit != null ? ps.Chit.ChitName : null,
            CustomerId = ps.CustomerId,
            CustomerName = ps.Customer != null ? ps.Customer.Name : null,
            CustomerCode = ps.Customer != null ? ps.Customer.CustomerCode : null,
            InstallmentNo = ps.InstallmentNo,
            DueDate = ps.DueDate,
            ExpectedAmount = ps.ExpectedAmount,
            PaidAmount = ps.PaidAmount,
            PendingAmount = ps.PendingAmount,
            AdvanceAmount = ps.AdvanceAmount,
            Status = ps.Status,
            PaidDate = ps.PaidDate,
            OverdueDays = (ps.Status == PaymentStatus.PENDING || ps.Status == PaymentStatus.PARTIAL) && DateTime.UtcNow > ps.DueDate
                ? (DateTime.UtcNow - ps.DueDate).Days
                : 0
        });
    }
}
