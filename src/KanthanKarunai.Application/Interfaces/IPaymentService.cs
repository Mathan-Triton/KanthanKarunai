using System.Collections.Generic;
using System.Threading.Tasks;
using KanthanKarunai.Application.DTOs;

namespace KanthanKarunai.Application.Interfaces;

public interface IPaymentService
{
    Task<IEnumerable<PaymentDto>> GetPaymentsAsync();
    Task<PaymentDto?> GetPaymentByIdAsync(int id);
    Task<PaymentDto> CreatePaymentAsync(CreatePaymentDto dto);
    Task<IEnumerable<PaymentDto>> GetCustomerPaymentsAsync(int customerId);
    Task<IEnumerable<PaymentScheduleDto>> GetPendingPaymentsAsync(string? query, string? frequency);
    Task<IEnumerable<CustomerPendingPaymentDto>> GetCustomerPendingPaymentsSummaryAsync(string? query);
}
