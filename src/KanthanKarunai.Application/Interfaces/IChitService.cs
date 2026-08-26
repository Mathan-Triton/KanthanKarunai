using System.Collections.Generic;
using System.Threading.Tasks;
using KanthanKarunai.Application.DTOs;

namespace KanthanKarunai.Application.Interfaces;

public interface IChitService
{
    Task<IEnumerable<ChitDto>> GetChitsAsync();
    Task<ChitDto?> GetChitByIdAsync(int id);
    Task<ChitDto> CreateChitAsync(CreateChitDto dto);
    Task<IEnumerable<PaymentScheduleDto>> GetScheduleAsync(int chitId);
    Task<ChitDto> RecordAmountTakenAsync(RecordAmountTakenDto dto);
    AmountTakenPreviewDto PreviewAmountTaken(int chitId, decimal amountTaken, int amountTakenMonth, decimal interestRate = 1.0m);
    Task<IEnumerable<PendingChitDueItemDto>> GetPendingChitDuesAsync(string? query = null);
    decimal CalculateAdjustedMonthlyPayment(decimal normalMonthlyPayment, decimal amountTaken, decimal interestRate);
}
