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
}
