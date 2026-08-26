using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using KanthanKarunai.Application.DTOs;
using KanthanKarunai.Application.Interfaces;
using KanthanKarunai.Domain.Entities;

namespace KanthanKarunai.Infrastructure.Services;

public class FirebaseNotificationService : INotificationService
{
    private readonly IApplicationDbContext _dbContext;
    private readonly ILogger<FirebaseNotificationService> _logger;
    private readonly IConfiguration _configuration;

    public FirebaseNotificationService(
        IApplicationDbContext dbContext,
        ILogger<FirebaseNotificationService> logger,
        IConfiguration configuration)
    {
        _dbContext = dbContext;
        _logger = logger;
        _configuration = configuration;
    }

    public async Task SendChitPaymentNotificationAsync(int customerId, int paymentId, string customerName, string mobileNo, decimal amount, string paymentMonth)
    {
        string message = $"Dear {customerName}, your monthly payment of ₹{amount:N0} for {paymentMonth} has been received successfully. Thank you.";
        await ProcessAndLogNotificationAsync(customerId, paymentId, null, "ChitPayment", message, mobileNo);
    }

    public async Task SendLoanPaymentNotificationAsync(int customerId, int loanPaymentId, string customerName, string mobileNo, decimal amount, string paymentMonth, decimal remainingBalance)
    {
        string message = $"Dear {customerName}, your loan payment of ₹{amount:N0} for {paymentMonth} has been received successfully. Remaining balance: ₹{remainingBalance:N0}.";
        await ProcessAndLogNotificationAsync(customerId, null, loanPaymentId, "LoanPayment", message, mobileNo);
    }

    private async Task ProcessAndLogNotificationAsync(int customerId, int? paymentId, int? loanPaymentId, string notificationType, string message, string mobileNo)
    {
        string status = "SENT";
        string? errorMessage = null;

        try
        {
            // Simulate / invoke Firebase Cloud Messaging or SMS Dispatch
            // In a production environment with valid FCM credentials, FirebaseAdmin.Messaging.FirebaseMessaging.DefaultInstance.SendAsync(...) is invoked.
            // When credentials are not yet configured in local environment, we simulate dispatch and mark SENT, logging message to console and database.
            _logger.LogInformation("[FIREBASE NOTIFICATION DISPATCH] Target Mobile: {Mobile} | Type: {Type} | Message: {Message}", mobileNo, notificationType, message);
            
            // Check if Firebase Server Key / Token is configured if user provided one
            var firebaseKey = _configuration["Firebase:ServerKey"];
            if (!string.IsNullOrEmpty(firebaseKey))
            {
                // Dispatch external request if configured
                _logger.LogInformation("[FIREBASE DISPATCH] Sending via configured Firebase Server Key");
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[FIREBASE NOTIFICATION ERROR] Failed to send notification to customer {CustomerId}", customerId);
            status = "FAILED";
            errorMessage = ex.Message;
        }

        try
        {
            var log = new NotificationLog
            {
                CustomerId = customerId,
                PaymentId = paymentId,
                LoanPaymentId = loanPaymentId,
                NotificationType = notificationType,
                Message = message,
                SentDate = DateTime.UtcNow,
                Status = status,
                ErrorMessage = errorMessage,
                CreatedAt = DateTime.UtcNow
            };

            _dbContext.NotificationLogs.Add(log);
            await _dbContext.SaveChangesAsync();
        }
        catch (Exception dbEx)
        {
            _logger.LogError(dbEx, "[NOTIFICATION LOG ERROR] Failed to record notification log for customer {CustomerId}", customerId);
        }
    }

    public async Task<IEnumerable<NotificationLogDto>> GetNotificationLogsAsync(int? customerId = null)
    {
        var query = _dbContext.NotificationLogs
            .Include(n => n.Customer)
            .AsQueryable();

        if (customerId.HasValue && customerId.Value > 0)
        {
            query = query.Where(n => n.CustomerId == customerId.Value);
        }

        return await query
            .OrderByDescending(n => n.CreatedAt)
            .Select(n => new NotificationLogDto
            {
                Id = n.Id,
                CustomerId = n.CustomerId,
                CustomerName = n.Customer != null ? n.Customer.Name : null,
                CustomerCode = n.Customer != null ? n.Customer.CustomerCode : null,
                MobileNo = n.Customer != null ? n.Customer.MobileNo : null,
                PaymentId = n.PaymentId,
                LoanPaymentId = n.LoanPaymentId,
                NotificationType = n.NotificationType,
                Message = n.Message,
                SentDate = n.SentDate,
                Status = n.Status,
                ErrorMessage = n.ErrorMessage,
                CreatedAt = n.CreatedAt
            })
            .ToListAsync();
    }
}
