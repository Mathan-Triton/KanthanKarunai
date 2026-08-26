using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using KanthanKarunai.Application.DTOs;
using KanthanKarunai.Application.Interfaces;

namespace KanthanKarunai.API.Controllers;

[Authorize(Roles = "Admin,Staff")]
public class DashboardController : BaseApiController
{
    private readonly IDashboardService _dashboardService;

    public DashboardController(IDashboardService dashboardService)
    {
        _dashboardService = dashboardService;
    }

    [HttpGet("summary")]
    public async Task<ActionResult<ApiResponse<DashboardSummaryDto>>> GetSummary()
    {
        var summary = await _dashboardService.GetSummaryAsync();
        return Ok(ApiResponse<DashboardSummaryDto>.SuccessResponse(summary, "Dashboard summary loaded"));
    }

    [HttpGet("today")]
    public async Task<ActionResult<ApiResponse<object>>> GetTodayCollections()
    {
        var summary = await _dashboardService.GetSummaryAsync();
        return Ok(ApiResponse<object>.SuccessResponse(new
        {
            summary.TodayCollection,
            summary.TodayPending,
            summary.TodayCollectionList
        }, "Today's collection stats loaded"));
    }

    [HttpGet("weekly")]
    public async Task<ActionResult<ApiResponse<object>>> GetWeeklyCollections()
    {
        var summary = await _dashboardService.GetSummaryAsync();
        return Ok(ApiResponse<object>.SuccessResponse(new
        {
            summary.WeeklyCollection
        }, "Weekly collection stats loaded"));
    }

    [HttpGet("monthly")]
    public async Task<ActionResult<ApiResponse<object>>> GetMonthlyCollections()
    {
        var summary = await _dashboardService.GetSummaryAsync();
        return Ok(ApiResponse<object>.SuccessResponse(new
        {
            summary.MonthlyCollection
        }, "Monthly collection stats loaded"));
    }
}
