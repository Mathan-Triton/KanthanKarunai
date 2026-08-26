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

public class ReportService : IReportService
{
    private readonly IApplicationDbContext _dbContext;

    public ReportService(IApplicationDbContext dbContext)
    {
        _dbContext = dbContext;
    }


    public async Task<IEnumerable<PaymentDto>> GetCollectionsReportAsync(
        DateTime? startDate, DateTime? endDate, string? frequency, int? customerId)
    {
        var query = _dbContext.Payments
            .Include(p => p.Customer)
            .Include(p => p.Chit)
            .Include(p => p.PaymentSchedule)
            .Include(p => p.Collector)
            .AsQueryable();

        if (startDate.HasValue)
        {
            query = query.Where(p => p.PaymentDate >= startDate.Value.ToUniversalTime());
        }

        if (endDate.HasValue)
        {
            query = query.Where(p => p.PaymentDate <= endDate.Value.ToUniversalTime());
        }

        if (customerId.HasValue)
        {
            query = query.Where(p => p.CustomerId == customerId.Value);
        }

        if (!string.IsNullOrWhiteSpace(frequency))
        {
            query = query.Where(p => p.Chit != null && p.Chit.PaymentFrequency.ToString() == frequency);
        }

        var results = await query.OrderByDescending(p => p.PaymentDate).ToListAsync();

        return results.Select(p => new PaymentDto
        {
            Id = p.Id,
            CustomerId = p.CustomerId,
            CustomerName = p.Customer?.Name,
            CustomerCode = p.Customer?.CustomerCode,
            ChitId = p.ChitId,
            ChitName = p.Chit?.ChitName,
            PaymentScheduleId = p.PaymentScheduleId,
            InstallmentNo = p.PaymentSchedule?.InstallmentNo ?? 0,
            PaymentDate = p.PaymentDate,
            Amount = p.Amount,
            PaymentType = p.PaymentType,
            PaymentMethod = p.PaymentMethod,
            ReceiptNo = p.ReceiptNo,
            Notes = p.Notes,
            CollectedBy = p.CollectedBy,
            CollectedByName = p.Collector?.FullName,
            CreatedAt = p.CreatedAt
        });
    }

    public async Task<IEnumerable<PaymentScheduleDto>> GetPendingReportAsync(
        DateTime? asOfDate, string? frequency, int? customerId)
    {
        var query = _dbContext.PaymentSchedules
            .Include(ps => ps.Customer)
            .Include(ps => ps.Chit)
            .Where(ps => ps.Status == PaymentStatus.PENDING || ps.Status == PaymentStatus.PARTIAL)
            .AsQueryable();

        if (asOfDate.HasValue)
        {
            query = query.Where(ps => ps.DueDate <= asOfDate.Value.ToUniversalTime());
        }

        if (customerId.HasValue)
        {
            query = query.Where(ps => ps.CustomerId == customerId.Value);
        }

        if (!string.IsNullOrWhiteSpace(frequency))
        {
            query = query.Where(ps => ps.Chit != null && ps.Chit.PaymentFrequency.ToString() == frequency);
        }

        var results = await query.OrderBy(ps => ps.DueDate).ToListAsync();

        return results.Select(ps => new PaymentScheduleDto
        {
            Id = ps.Id,
            ChitId = ps.ChitId,
            ChitName = ps.Chit?.ChitName,
            CustomerId = ps.CustomerId,
            CustomerName = ps.Customer?.Name,
            CustomerCode = ps.Customer?.CustomerCode,
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

    public async Task<IEnumerable<ChitPayoutDto>> GetPayoutsReportAsync(
        DateTime? startDate, DateTime? endDate, int? customerId)
    {
        var query = _dbContext.ChitPayouts
            .Include(p => p.Customer)
            .Include(p => p.Chit)
            .Include(p => p.Creator)
            .AsQueryable();

        if (startDate.HasValue)
        {
            query = query.Where(p => p.PayoutDate >= startDate.Value.ToUniversalTime());
        }

        if (endDate.HasValue)
        {
            query = query.Where(p => p.PayoutDate <= endDate.Value.ToUniversalTime());
        }

        if (customerId.HasValue)
        {
            query = query.Where(p => p.CustomerId == customerId.Value);
        }

        var results = await query.OrderByDescending(p => p.PayoutDate).ToListAsync();

        return results.Select(p => new ChitPayoutDto
        {
            Id = p.Id,
            CustomerId = p.CustomerId,
            CustomerName = p.Customer?.Name,
            CustomerCode = p.Customer?.CustomerCode,
            ChitId = p.ChitId,
            ChitName = p.Chit?.ChitName,
            PayoutDate = p.PayoutDate,
            GrossAmount = p.GrossAmount,
            DeductionAmount = p.DeductionAmount,
            OtherCharges = p.OtherCharges,
            NetAmount = p.NetAmount,
            PaymentMethod = p.PaymentMethod,
            ReferenceNo = p.ReferenceNo,
            Notes = p.Notes,
            CreatedBy = p.CreatedBy,
            CreatedByName = p.Creator?.FullName,
            CreatedAt = p.CreatedAt
        });
    }

    public async Task<CustomerStatementDto?> GetCustomerStatementAsync(int customerId)
    {
        var customer = await _dbContext.Customers.FindAsync(customerId);
        if (customer == null) return null;

        var schedules = await _dbContext.PaymentSchedules
            .Where(ps => ps.CustomerId == customerId)
            .ToListAsync();

        var payments = await _dbContext.Payments
            .Include(p => p.Chit)
            .Include(p => p.PaymentSchedule)
            .Where(p => p.CustomerId == customerId)
            .ToListAsync();

        var payouts = await _dbContext.ChitPayouts
            .Include(p => p.Chit)
            .Where(p => p.CustomerId == customerId)
            .ToListAsync();

        var statement = new CustomerStatementDto
        {
            CustomerCode = customer.CustomerCode,
            Name = customer.Name,
            MobileNo = customer.MobileNo,
            Address = customer.Address,
            JoinDate = customer.JoinDate,
            Status = customer.Status,

            TotalExpected = schedules.Sum(s => s.ExpectedAmount),
            TotalPaid = payments.Sum(p => p.Amount),
            TotalPending = schedules.Sum(s => s.PendingAmount),
            TotalAdvance = schedules.Sum(s => s.AdvanceAmount),
            TotalPayout = payouts.Sum(p => p.GrossAmount),
            TotalDeduction = payouts.Sum(p => p.DeductionAmount + p.OtherCharges),
            NetPayoutReceived = payouts.Sum(p => p.NetAmount)
        };

        // Construct Rows
        var rows = new List<StatementRowDto>();

        // Add Payments
        foreach (var p in payments)
        {
            var chitName = p.Chit?.ChitName ?? "Chit";
            var instNo = p.PaymentSchedule?.InstallmentNo ?? 0;
            var description = $"{chitName} - Installment {instNo}";
            if (p.PaymentType == "ADVANCE")
            {
                description = $"{chitName} - Advance Payment";
            }

            rows.Add(new StatementRowDto
            {
                Date = p.PaymentDate,
                Description = description,
                Paid = p.Amount,
                Payout = null
            });
        }

        // Add Payouts
        foreach (var po in payouts)
        {
            var chitName = po.Chit?.ChitName ?? "Chit";
            rows.Add(new StatementRowDto
            {
                Date = po.PayoutDate,
                Description = $"{chitName} - Chit Payout (Net)",
                Paid = null,
                Payout = po.NetAmount
            });
        }

        // Sort by date ascending
        statement.Rows = rows.OrderBy(r => r.Date).ToList();

        return statement;
    }
}
