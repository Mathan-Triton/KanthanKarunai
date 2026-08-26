using System.Collections.Generic;
using System.Threading.Tasks;
using KanthanKarunai.Application.DTOs;

namespace KanthanKarunai.Application.Interfaces;

public interface ICustomerService
{
    Task<(IEnumerable<CustomerDto> Customers, int TotalCount)> GetCustomersAsync(
        string? query, string? status, string? frequency, int page, int pageSize);
    Task<CustomerDto?> GetCustomerByIdAsync(int id);
    Task<CustomerSummaryDto?> GetCustomerSummaryAsync(int id);
    Task<CustomerDto> CreateCustomerAsync(CreateCustomerDto dto);
    Task<CustomerDto?> UpdateCustomerAsync(int id, UpdateCustomerDto dto);
    Task<bool> DeactivateCustomerAsync(int id);
}
