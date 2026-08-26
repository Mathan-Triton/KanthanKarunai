using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using KanthanKarunai.Application.DTOs;
using KanthanKarunai.Application.Interfaces;

namespace KanthanKarunai.API.Controllers;

[Authorize(Roles = "Admin")]
public class NotificationsController : BaseApiController
{
    private readonly INotificationService _notificationService;

    public NotificationsController(INotificationService notificationService)
    {
        _notificationService = notificationService;
    }

    [HttpGet]
    [Authorize(Roles = "Admin,Staff")]
    public async Task<ActionResult<ApiResponse<IEnumerable<NotificationLogDto>>>> GetNotifications([FromQuery] int? customerId)
    {
        var logs = await _notificationService.GetNotificationLogsAsync(customerId);
        return Ok(ApiResponse<IEnumerable<NotificationLogDto>>.SuccessResponse(logs, "Notifications fetched successfully"));
    }

    [HttpGet("customer/{customerId:int}")]
    public async Task<ActionResult<ApiResponse<IEnumerable<NotificationLogDto>>>> GetCustomerNotifications(int customerId)
    {
        var logs = await _notificationService.GetNotificationLogsAsync(customerId);
        return Ok(ApiResponse<IEnumerable<NotificationLogDto>>.SuccessResponse(logs, "Customer notifications fetched successfully"));
    }
}
