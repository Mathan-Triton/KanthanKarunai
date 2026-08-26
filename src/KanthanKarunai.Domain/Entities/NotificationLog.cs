using System;

namespace KanthanKarunai.Domain.Entities;

public class NotificationLog
{
    public int Id { get; set; }
    public int CustomerId { get; set; }
    public Customer? Customer { get; set; }
    
    public int? PaymentId { get; set; }
    public int? LoanPaymentId { get; set; }
    
    public string NotificationType { get; set; } = "ChitPayment"; // ChitPayment, LoanPayment, General
    public string Message { get; set; } = string.Empty;
    public DateTime SentDate { get; set; } = DateTime.UtcNow;
    public string Status { get; set; } = "SENT"; // SENT, FAILED
    public string? ErrorMessage { get; set; }
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
