using System.Collections.Generic;
using System.Threading.Tasks;
using KanthanKarunai.Application.DTOs;

namespace KanthanKarunai.Application.Interfaces;

public interface IGetChitService
{
    Task<IEnumerable<GetChitDto>> GetGetChitsAsync(string? query = null, string? status = null);
    Task<GetChitDto?> GetGetChitByIdAsync(int id);
    Task<IEnumerable<CustomerGetChitGroupDto>> GetGroupedByCustomerAsync(string? query = null);
    Task<CustomerGetChitGroupDto?> GetCustomerGetChitsAsync(int customerId);
    Task<IEnumerable<PendingGetChitDueDto>> GetPendingDuesAsync(string? query = null);
    Task<GetChitDto> CreateGetChitAsync(CreateGetChitDto dto);
    Task<GetChitPaymentDto> RecordPaymentAsync(RecordGetChitPaymentDto dto);
    PaymentAllocationPreviewDto PreviewPaymentAllocation(int getChitId, decimal paymentAmount);
    Task<IEnumerable<GetChitPaymentDto>> GetPaymentHistoryAsync(int getChitId);
    
    // Calculation Helpers
    decimal CalculateMonthlyInterest(decimal outstandingPrincipal, decimal interestRate);
    decimal CalculateNextMonthDue(decimal outstandingPrincipal, decimal interestRate);
    (decimal interestAllocated, decimal principalAllocated, decimal newOutstanding) AllocatePayment(decimal outstandingPrincipal, decimal interestRate, decimal paymentAmount);
}
