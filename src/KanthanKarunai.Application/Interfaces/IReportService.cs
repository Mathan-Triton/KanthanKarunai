using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using KanthanKarunai.Application.DTOs;

namespace KanthanKarunai.Application.Interfaces;

public interface IReportService
{
    Task<IEnumerable<PaymentDto>> GetCollectionsReportAsync(DateTime? startDate, DateTime? endDate, string? frequency, int? customerId);
    Task<IEnumerable<PaymentScheduleDto>> GetPendingReportAsync(DateTime? asOfDate, string? frequency, int? customerId);
    Task<IEnumerable<ChitPayoutDto>> GetPayoutsReportAsync(DateTime? startDate, DateTime? endDate, int? customerId);
    Task<CustomerStatementDto?> GetCustomerStatementAsync(int customerId);
}
