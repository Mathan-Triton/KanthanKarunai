using System;
using System.Collections.Generic;

namespace KanthanKarunai.Application.DTOs;

public class DashboardSummaryDto
{
    public int TotalCustomers { get; set; }
    public int ActiveCustomers { get; set; }
    public int ActiveChits { get; set; }
    public int ActiveLoans { get; set; }
    
    public decimal TodayCollection { get; set; }
    public decimal TodayPending { get; set; }
    public decimal WeeklyCollection { get; set; }
    public decimal MonthlyCollection { get; set; }
    public decimal ThisMonthCollections => MonthlyCollection;
    
    public decimal PendingChitPayments { get; set; }
    public decimal PendingLoanPayments { get; set; }
    public decimal TotalOutstandingLoanAmount { get; set; }
    
    public decimal TotalChitAmount { get; set; }
    public decimal TotalChitPayout { get; set; }
    public decimal PendingAmount { get; set; }
    public decimal TotalExpenses { get; set; }
    public decimal NetCashFlow { get; set; }

    public List<TodayCollectionItemDto> TodayCollectionList { get; set; } = new();
    public List<DashboardRecentPaymentDto> RecentPayments { get; set; } = new();
    public List<ChartItemDto> DailyCollectionChart { get; set; } = new();
    public List<ChartItemDto> MonthlyCollectionChart { get; set; } = new();
    public List<FrequencyDistributionDto> PaymentFrequencyDistribution { get; set; } = new();
}

public class DashboardRecentPaymentDto
{
    public int Id { get; set; }
    public int CustomerId { get; set; }
    public required string CustomerName { get; set; }
    public required string PaymentType { get; set; } // "CHIT" or "LOAN"
    public decimal Amount { get; set; }
    public decimal PaymentAmount => Amount;
    public DateTime PaymentDate { get; set; }
    public DateTime PaymentTime => PaymentDate;
    public string? PaymentMethod { get; set; }
    public required string ReceiptNo { get; set; }
    public string ReceiptNumber => ReceiptNo;
}

public class TodayCollectionItemDto
{
    public required string CustomerName { get; set; }
    public decimal PaymentAmount { get; set; }
    public string? PaymentMethod { get; set; }
    public DateTime PaymentTime { get; set; }
    public required string ReceiptNumber { get; set; }
}

public class ChartItemDto
{
    public required string Label { get; set; }
    public decimal Value { get; set; }
}

public class FrequencyDistributionDto
{
    public required string Frequency { get; set; } // DAILY, WEEKLY, MONTHLY
    public int Count { get; set; }
}
