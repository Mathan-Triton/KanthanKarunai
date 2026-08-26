using System;
using KanthanKarunai.Domain.Enums;

namespace KanthanKarunai.Application.DTOs;

public class PaymentScheduleDto
{
    public int Id { get; set; }
    public int ChitId { get; set; }
    public string? ChitName { get; set; }
    public int CustomerId { get; set; }
    public string? CustomerName { get; set; }
    public string? CustomerCode { get; set; }
    public string? CustomerMobile { get; set; }
    public int InstallmentNo { get; set; }
    public DateTime DueDate { get; set; }
    public string DueMonth => DueDate.ToString("MMMM yyyy");
    public decimal ExpectedAmount { get; set; }
    public decimal NormalDue { get; set; }
    public decimal InterestPortion { get; set; }
    public string? AmountTakenInfo { get; set; }
    public decimal FinalMonthlyDue => ExpectedAmount;
    public decimal PaidAmount { get; set; }
    public decimal PendingAmount { get; set; }
    public decimal AdvanceAmount { get; set; }
    public PaymentStatus Status { get; set; }
    public string StatusText => DueDate.Date > DateTime.UtcNow.Date && Status == PaymentStatus.PENDING ? "Upcoming" : (Status == PaymentStatus.PAID ? "Paid" : "Pending");
    public DateTime? PaidDate { get; set; }
    public int OverdueDays { get; set; }
}

public class CustomerPendingPaymentDto
{
    public int CustomerId { get; set; }
    public required string CustomerName { get; set; }
    public required string CustomerCode { get; set; }
    public string? MobileNo { get; set; }
    public int ChitId { get; set; }
    public required string ChitName { get; set; }
    public decimal MonthlyPayment { get; set; }
    public decimal TotalPaidAmount { get; set; }
    public decimal TotalPendingAmount { get; set; }
    public decimal CurrentMonthPending { get; set; }
    public decimal UpcomingMonthPayment { get; set; }
    public string? CurrentPendingMonth { get; set; }
    public string? NextPendingMonth { get; set; }
    public string PaymentStatus { get; set; } = "Pending";
    public List<PaymentScheduleDto> Schedules { get; set; } = new();
}

