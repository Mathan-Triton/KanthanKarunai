using System;

namespace KanthanKarunai.Application.DTOs;

public class NotificationLogDto
{
    public int Id { get; set; }
    public int CustomerId { get; set; }
    public string? CustomerName { get; set; }
    public string? CustomerCode { get; set; }
    public string? MobileNo { get; set; }
    public int? PaymentId { get; set; }
    public int? LoanPaymentId { get; set; }
    public required string NotificationType { get; set; }
    public required string Message { get; set; }
    public DateTime SentDate { get; set; }
    public required string Status { get; set; }
    public string? ErrorMessage { get; set; }
    public DateTime CreatedAt { get; set; }
}
