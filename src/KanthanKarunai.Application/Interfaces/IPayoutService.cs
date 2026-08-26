using System.Collections.Generic;
using System.Threading.Tasks;
using KanthanKarunai.Application.DTOs;

namespace KanthanKarunai.Application.Interfaces;

public interface IPayoutService
{
    Task<IEnumerable<ChitPayoutDto>> GetPayoutsByChitAsync(int chitId);
    Task<ChitPayoutDto> CreatePayoutAsync(CreateChitPayoutDto dto);
}
