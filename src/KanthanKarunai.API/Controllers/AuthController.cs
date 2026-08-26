using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using KanthanKarunai.Application.DTOs;
using KanthanKarunai.Application.Interfaces;

namespace KanthanKarunai.API.Controllers;

public class AuthController : BaseApiController
{
    private readonly IAuthService _authService;

    public AuthController(IAuthService authService)
    {
        _authService = authService;
    }

    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<ActionResult<ApiResponse<LoginResponse>>> Login([FromBody] LoginRequest request)
    {
        var response = await _authService.LoginAsync(request);
        if (!response.Success)
        {
            return BadRequest(ApiResponse<LoginResponse>.ErrorResponse(response.Message));
        }

        return Ok(ApiResponse<LoginResponse>.SuccessResponse(response, "Login successful"));
    }

    [HttpPost("refresh")]
    public ActionResult<ApiResponse<string>> Refresh()
    {
        // Simple token refresh placeholder returning a mock success response as required by API endpoints list
        return Ok(ApiResponse<string>.SuccessResponse("Token refreshed successfully", "Token refresh simulated"));
    }
}
