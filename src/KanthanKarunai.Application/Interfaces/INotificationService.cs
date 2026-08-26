using System.Collections.Generic;
using System.Threading.Tasks;
using KanthanKarunai.Application.DTOs;

namespace KanthanKarunai.Application.Interfaces;

public interface INotificationService
{
    Task SendChitPaymentNotificationAsync(int customerId, int paymentId, string customerName, string mobileNo, decimal amount, string paymentMonth);
    Task SendLoanPaymentNotificationAsync(int customerId, int loanPaymentId, string customerName, string mobileNo, decimal amount, string paymentMonth, decimal remainingBalance);
    Task<IEnumerable<NotificationLogDto>> GetNotificationLogsAsync(int? customerId = null);
}
