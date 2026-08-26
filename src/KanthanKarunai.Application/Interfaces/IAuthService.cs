using System.Threading.Tasks;
using KanthanKarunai.Application.DTOs;

namespace KanthanKarunai.Application.Interfaces;

public interface IAuthService
{
    Task<LoginResponse> LoginAsync(LoginRequest request);
}
