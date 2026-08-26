using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using KanthanKarunai.Application.DTOs;
using KanthanKarunai.Application.Interfaces;

namespace KanthanKarunai.API.Controllers;

[Authorize]
public class PayoutsController : BaseApiController
{
    private readonly IPayoutService _payoutService;

    public PayoutsController(IPayoutService payoutService)
    {
        _payoutService = payoutService;
    }

    [HttpGet("/api/chits/{chitId:int}/payouts")]
    public async Task<ActionResult<ApiResponse<IEnumerable<ChitPayoutDto>>>> GetPayouts(int chitId)
    {
        var payouts = await _payoutService.GetPayoutsByChitAsync(chitId);
        return Ok(ApiResponse<IEnumerable<ChitPayoutDto>>.SuccessResponse(payouts, "Payouts fetched successfully"));
    }

    [HttpPost("/api/chits/{chitId:int}/payout")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<ApiResponse<ChitPayoutDto>>> CreatePayout(int chitId, [FromBody] CreateChitPayoutDto dto)
    {
        // Make sure ChitId from path matches body
        if (dto.ChitId != chitId)
        {
            dto.ChitId = chitId;
        }

        try
        {
            var payout = await _payoutService.CreatePayoutAsync(dto);
            return Ok(ApiResponse<ChitPayoutDto>.SuccessResponse(payout, "Chit payout recorded successfully"));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<ChitPayoutDto>.ErrorResponse(ex.Message));
        }
        catch (Exception ex)
        {
            return StatusCode(500, ApiResponse<ChitPayoutDto>.ErrorResponse($"Error recording payout: {ex.Message}"));
        }
    }
}
