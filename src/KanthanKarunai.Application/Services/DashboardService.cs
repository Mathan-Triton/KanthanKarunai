using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using KanthanKarunai.Application.DTOs;
using KanthanKarunai.Application.Interfaces;
using KanthanKarunai.Domain.Enums;

namespace KanthanKarunai.Application.Services;

public class DashboardService : IDashboardService
{
    private readonly IApplicationDbContext _dbContext;

    public DashboardService(IApplicationDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<DashboardSummaryDto> GetSummaryAsync()
    {
        var utcNow = DateTime.UtcNow;
        var localNow = utcNow.AddHours(5.5); // IST = UTC+5:30

        var todayStartLocal = localNow.Date;
        var todayEndLocal = todayStartLocal.AddDays(1);

        var todayStartUtc = DateTime.SpecifyKind(todayStartLocal.AddHours(-5.5), DateTimeKind.Utc);
        var todayEndUtc = DateTime.SpecifyKind(todayEndLocal.AddHours(-5.5), DateTimeKind.Utc);

        int daysSinceMonday = ((int)localNow.DayOfWeek - 1 + 7) % 7;
        var weekStartLocal = todayStartLocal.AddDays(-daysSinceMonday);
        var weekStartUtc = DateTime.SpecifyKind(weekStartLocal.AddHours(-5.5), DateTimeKind.Utc);

        var monthStartLocal = new DateTime(localNow.Year, localNow.Month, 1);
        var monthStartUtc = DateTime.SpecifyKind(monthStartLocal.AddHours(-5.5), DateTimeKind.Utc);
        var monthEndLocal = monthStartLocal.AddMonths(1);
        var monthEndUtc = DateTime.SpecifyKind(monthEndLocal.AddHours(-5.5), DateTimeKind.Utc);

        // 1. Customer & Account Counts
        int totalCustomers = await _dbContext.Customers.CountAsync();
        int activeCustomers = await _dbContext.Customers.CountAsync(c => c.Status == "ACTIVE");
        int activeChits = await _dbContext.Chits.CountAsync(c => c.Status == ChitStatus.ACTIVE);
        int activeLoans = await _dbContext.CustomerLoans.CountAsync(l => l.Status == ChitStatus.ACTIVE);

        // 2. Collections (Chit + Loan)
        decimal todayChitCollection = await _dbContext.Payments
            .Where(p => p.PaymentDate >= todayStartUtc && p.PaymentDate < todayEndUtc)
            .SumAsync(p => (decimal?)p.Amount) ?? 0;

        decimal todayLoanCollection = await _dbContext.LoanPayments
            .Where(p => p.PaymentDate >= todayStartUtc && p.PaymentDate < todayEndUtc)
            .SumAsync(p => (decimal?)p.Amount) ?? 0;

        decimal todayCollection = todayChitCollection + todayLoanCollection;

        decimal weeklyChitCollection = await _dbContext.Payments
            .Where(p => p.PaymentDate >= weekStartUtc)
            .SumAsync(p => (decimal?)p.Amount) ?? 0;

        decimal weeklyLoanCollection = await _dbContext.LoanPayments
            .Where(p => p.PaymentDate >= weekStartUtc)
            .SumAsync(p => (decimal?)p.Amount) ?? 0;

        decimal weeklyCollection = weeklyChitCollection + weeklyLoanCollection;

        decimal monthlyChitCollection = await _dbContext.Payments
            .Where(p => p.PaymentDate >= monthStartUtc)
            .SumAsync(p => (decimal?)p.Amount) ?? 0;

        decimal monthlyLoanCollection = await _dbContext.LoanPayments
            .Where(p => p.PaymentDate >= monthStartUtc)
            .SumAsync(p => (decimal?)p.Amount) ?? 0;

        decimal monthlyCollection = monthlyChitCollection + monthlyLoanCollection;

        // 3. Pending payments & Outstandings
        decimal pendingChitPayments = await _dbContext.PaymentSchedules
            .Where(ps => ps.DueDate < monthEndUtc && (ps.Status == PaymentStatus.PENDING || ps.Status == PaymentStatus.PARTIAL))
            .SumAsync(ps => (decimal?)ps.PendingAmount) ?? 0;

        decimal pendingLoanPayments = await _dbContext.LoanRepaymentSchedules
            .Where(ps => ps.DueDate < monthEndUtc && (ps.Status == PaymentStatus.PENDING || ps.Status == PaymentStatus.PARTIAL))
            .SumAsync(ps => (decimal?)ps.PendingAmount) ?? 0;

        decimal totalOutstandingLoanAmount = await _dbContext.CustomerLoans
            .Where(l => l.Status == ChitStatus.ACTIVE)
            .SumAsync(l => (decimal?)l.RemainingAmount) ?? 0;

        decimal todayPending = await _dbContext.PaymentSchedules
            .Where(ps => ps.DueDate >= todayStartUtc && ps.DueDate < todayEndUtc && (ps.Status == PaymentStatus.PENDING || ps.Status == PaymentStatus.PARTIAL))
            .SumAsync(ps => (decimal?)ps.PendingAmount) ?? 0;

        decimal totalChitAmount = await _dbContext.Chits
            .Where(c => c.Status == ChitStatus.ACTIVE)
            .SumAsync(c => (decimal?)c.TotalChitAmount) ?? 0;

        decimal totalChitPayout = await _dbContext.ChitPayouts
            .SumAsync(p => (decimal?)p.NetAmount) ?? 0;

        decimal overallPending = await _dbContext.PaymentSchedules
            .SumAsync(ps => (decimal?)ps.PendingAmount) ?? 0;

        decimal totalExpenses = await _dbContext.Expenses
            .SumAsync(e => (decimal?)e.Amount) ?? 0;

        decimal totalAllTimeCollection = (await _dbContext.Payments.SumAsync(p => (decimal?)p.Amount) ?? 0)
                                       + (await _dbContext.LoanPayments.SumAsync(p => (decimal?)p.Amount) ?? 0);

        decimal netCashFlow = totalAllTimeCollection - totalExpenses;

        // 4. Today's collections list
        var todayChitList = await _dbContext.Payments
            .Include(p => p.Customer)
            .Where(p => p.PaymentDate >= todayStartUtc && p.PaymentDate < todayEndUtc)
            .Select(p => new TodayCollectionItemDto
            {
                CustomerName = p.Customer != null ? p.Customer.Name : "Unknown",
                PaymentAmount = p.Amount,
                PaymentMethod = p.PaymentMethod.ToString(),
                PaymentTime = p.PaymentDate,
                ReceiptNumber = p.ReceiptNo
            })
            .ToListAsync();

        var todayLoanList = await _dbContext.LoanPayments
            .Include(p => p.Customer)
            .Where(p => p.PaymentDate >= todayStartUtc && p.PaymentDate < todayEndUtc)
            .Select(p => new TodayCollectionItemDto
            {
                CustomerName = p.Customer != null ? p.Customer.Name : "Unknown",
                PaymentAmount = p.Amount,
                PaymentMethod = p.PaymentMethod.ToString(),
                PaymentTime = p.PaymentDate,
                ReceiptNumber = p.ReceiptNo
            })
            .ToListAsync();

        var todayCollections = todayChitList.Concat(todayLoanList)
            .OrderByDescending(p => p.PaymentTime)
            .ToList();

        foreach (var tc in todayCollections)
        {
            tc.PaymentTime = DateTime.SpecifyKind(tc.PaymentTime, DateTimeKind.Utc).AddHours(5.5);
        }

        // 5. Recent 10 Payments (Chit + Loan)
        var recentChitPayments = await _dbContext.Payments
            .Include(p => p.Customer)
            .OrderByDescending(p => p.PaymentDate)
            .Take(10)
            .Select(p => new DashboardRecentPaymentDto
            {
                Id = p.Id,
                CustomerId = p.CustomerId,
                CustomerName = p.Customer != null ? p.Customer.Name : "Unknown",
                PaymentType = "CHIT",
                Amount = p.Amount,
                PaymentMethod = p.PaymentMethod.ToString(),
                PaymentDate = p.PaymentDate,
                ReceiptNo = p.ReceiptNo
            })
            .ToListAsync();

        var recentLoanPayments = await _dbContext.LoanPayments
            .Include(p => p.Customer)
            .OrderByDescending(p => p.PaymentDate)
            .Take(10)
            .Select(p => new DashboardRecentPaymentDto
            {
                Id = p.Id,
                CustomerId = p.CustomerId,
                CustomerName = p.Customer != null ? p.Customer.Name : "Unknown",
                PaymentType = "LOAN",
                Amount = p.Amount,
                PaymentMethod = p.PaymentMethod.ToString(),
                PaymentDate = p.PaymentDate,
                ReceiptNo = p.ReceiptNo
            })
            .ToListAsync();

        var recentPayments = recentChitPayments.Concat(recentLoanPayments)
            .OrderByDescending(p => p.PaymentDate)
            .Take(10)
            .ToList();

        foreach (var rp in recentPayments)
        {
            rp.PaymentDate = DateTime.SpecifyKind(rp.PaymentDate, DateTimeKind.Utc).AddHours(5.5);
        }

        // 6. Last 7 Days chart
        var dailyCharts = new List<ChartItemDto>();
        for (int i = 6; i >= 0; i--)
        {
            var dayLocal = todayStartLocal.AddDays(-i);
            var dayStartUtc = DateTime.SpecifyKind(dayLocal.AddHours(-5.5), DateTimeKind.Utc);
            var dayEndUtc = DateTime.SpecifyKind(dayLocal.AddDays(1).AddHours(-5.5), DateTimeKind.Utc);

            decimal dayChit = await _dbContext.Payments
                .Where(p => p.PaymentDate >= dayStartUtc && p.PaymentDate < dayEndUtc)
                .SumAsync(p => (decimal?)p.Amount) ?? 0;

            decimal dayLoan = await _dbContext.LoanPayments
                .Where(p => p.PaymentDate >= dayStartUtc && p.PaymentDate < dayEndUtc)
                .SumAsync(p => (decimal?)p.Amount) ?? 0;

            dailyCharts.Add(new ChartItemDto
            {
                Label = dayLocal.ToString("dd MMM"),
                Value = dayChit + dayLoan
            });
        }

        // 7. Last 6 Months chart
        var monthlyCharts = new List<ChartItemDto>();
        for (int i = 5; i >= 0; i--)
        {
            var mStartLocal = new DateTime(localNow.Year, localNow.Month, 1).AddMonths(-i);
            var mEndLocal = mStartLocal.AddMonths(1);

            var mStartUtc = DateTime.SpecifyKind(mStartLocal.AddHours(-5.5), DateTimeKind.Utc);
            var mEndUtc = DateTime.SpecifyKind(mEndLocal.AddHours(-5.5), DateTimeKind.Utc);

            decimal mChit = await _dbContext.Payments
                .Where(p => p.PaymentDate >= mStartUtc && p.PaymentDate < mEndUtc)
                .SumAsync(p => (decimal?)p.Amount) ?? 0;

            decimal mLoan = await _dbContext.LoanPayments
                .Where(p => p.PaymentDate >= mStartUtc && p.PaymentDate < mEndUtc)
                .SumAsync(p => (decimal?)p.Amount) ?? 0;

            monthlyCharts.Add(new ChartItemDto
            {
                Label = mStartLocal.ToString("MMM yyyy"),
                Value = mChit + mLoan
            });
        }

        // 8. Payment Frequency distribution
        var frequencyDistribution = await _dbContext.Chits
            .Where(c => c.Status == ChitStatus.ACTIVE)
            .GroupBy(c => c.PaymentFrequency)
            .Select(g => new FrequencyDistributionDto
            {
                Frequency = g.Key.ToString(),
                Count = g.Count()
            })
            .ToListAsync();

        return new DashboardSummaryDto
        {
            TotalCustomers = totalCustomers,
            ActiveCustomers = activeCustomers,
            ActiveChits = activeChits,
            ActiveLoans = activeLoans,
            TodayCollection = todayCollection,
            TodayPending = todayPending,
            WeeklyCollection = weeklyCollection,
            MonthlyCollection = monthlyCollection,
            PendingChitPayments = pendingChitPayments,
            PendingLoanPayments = pendingLoanPayments,
            TotalOutstandingLoanAmount = totalOutstandingLoanAmount,
            TotalChitAmount = totalChitAmount,
            TotalChitPayout = totalChitPayout,
            PendingAmount = overallPending,
            TotalExpenses = totalExpenses,
            NetCashFlow = netCashFlow,
            TodayCollectionList = todayCollections,
            RecentPayments = recentPayments,
            DailyCollectionChart = dailyCharts,
            MonthlyCollectionChart = monthlyCharts,
            PaymentFrequencyDistribution = frequencyDistribution
        };
    }
}
