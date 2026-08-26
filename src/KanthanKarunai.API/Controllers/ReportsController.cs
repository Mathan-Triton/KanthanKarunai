using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using KanthanKarunai.Application.DTOs;
using KanthanKarunai.Application.Interfaces;
using KanthanKarunai.Infrastructure.Data;

namespace KanthanKarunai.API.Controllers;

[Authorize]
public class ReportsController : BaseApiController
{
    private readonly IReportService _reportService;
    private readonly ApplicationDbContext _dbContext;

    public ReportsController(IReportService reportService, ApplicationDbContext dbContext)
    {
        _reportService = reportService;
        _dbContext = dbContext;
    }

    [HttpGet("collections")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<ApiResponse<IEnumerable<PaymentDto>>>> GetCollectionsReport(
        [FromQuery] DateTime? startDate,
        [FromQuery] DateTime? endDate,
        [FromQuery] string? frequency,
        [FromQuery] int? customerId)
    {
        var report = await _reportService.GetCollectionsReportAsync(startDate, endDate, frequency, customerId);
        return Ok(ApiResponse<IEnumerable<PaymentDto>>.SuccessResponse(report, "Collections report generated"));
    }

    [HttpGet("pending")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<ApiResponse<IEnumerable<PaymentScheduleDto>>>> GetPendingReport(
        [FromQuery] DateTime? asOfDate,
        [FromQuery] string? frequency,
        [FromQuery] int? customerId)
    {
        var report = await _reportService.GetPendingReportAsync(asOfDate, frequency, customerId);
        return Ok(ApiResponse<IEnumerable<PaymentScheduleDto>>.SuccessResponse(report, "Pending payments report generated"));
    }

    [HttpGet("payouts")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<ApiResponse<IEnumerable<ChitPayoutDto>>>> GetPayoutsReport(
        [FromQuery] DateTime? startDate,
        [FromQuery] DateTime? endDate,
        [FromQuery] int? customerId)
    {
        var report = await _reportService.GetPayoutsReportAsync(startDate, endDate, customerId);
        return Ok(ApiResponse<IEnumerable<ChitPayoutDto>>.SuccessResponse(report, "Payouts report generated"));
    }

    [HttpGet("customer/{id:int}")]
    [Authorize(Roles = "Admin,Customer")]
    public async Task<ActionResult<ApiResponse<CustomerStatementDto>>> GetCustomerStatement(int id)
    {
        if (User.IsInRole("Customer"))
        {
            var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (!int.TryParse(userIdClaim, out var userId))
            {
                return StatusCode(403, ApiResponse<CustomerStatementDto>.ErrorResponse("Unauthorized."));
            }

            var dbUser = await _dbContext.Users.FindAsync(userId);
            if (dbUser == null || dbUser.CustomerId != id)
            {
                return StatusCode(403, ApiResponse<CustomerStatementDto>.ErrorResponse("You can only view your own statement."));
            }
        }

        var statement = await _reportService.GetCustomerStatementAsync(id);
        if (statement == null)
        {
            return NotFound(ApiResponse<CustomerStatementDto>.ErrorResponse("Customer not found"));
        }

        return Ok(ApiResponse<CustomerStatementDto>.SuccessResponse(statement, "Customer statement generated"));
    }
}
