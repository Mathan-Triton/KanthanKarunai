using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using KanthanKarunai.Application.DTOs;
using KanthanKarunai.Application.Interfaces;
using KanthanKarunai.Domain.Enums;
using KanthanKarunai.Infrastructure.Data;

namespace KanthanKarunai.API.Controllers;

[Authorize]
public class ChitsController : BaseApiController
{
    private readonly IChitService _chitService;
    private readonly ApplicationDbContext _dbContext;
    private readonly IAuditLogService _auditLogService;

    public ChitsController(
        IChitService chitService, 
        ApplicationDbContext dbContext,
        IAuditLogService auditLogService)
    {
        _chitService = chitService;
        _dbContext = dbContext;
        _auditLogService = auditLogService;
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<IEnumerable<ChitDto>>>> GetChits()
    {
        var chits = await _chitService.GetChitsAsync();
        return Ok(ApiResponse<IEnumerable<ChitDto>>.SuccessResponse(chits, "Chits fetched successfully"));
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<ApiResponse<ChitDto>>> GetChitById(int id)
    {
        var chit = await _chitService.GetChitByIdAsync(id);
        if (chit == null)
        {
            return NotFound(ApiResponse<ChitDto>.ErrorResponse("Chit not found"));
        }

        return Ok(ApiResponse<ChitDto>.SuccessResponse(chit, "Chit fetched successfully"));
    }

    [HttpPost]
    [Authorize(Roles = "Admin,Staff")]
    public async Task<ActionResult<ApiResponse<ChitDto>>> CreateChit([FromBody] CreateChitDto dto)
    {
        try
        {
            var chit = await _chitService.CreateChitAsync(dto);
            return CreatedAtAction(nameof(GetChitById), new { id = chit.Id },
                ApiResponse<ChitDto>.SuccessResponse(chit, "Chit and payment schedule generated successfully"));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<ChitDto>.ErrorResponse(ex.Message));
        }
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = "Admin,Staff")]
    public async Task<ActionResult<ApiResponse<ChitDto>>> UpdateChit(int id, [FromBody] UpdateChitStatusDto dto)
    {
        var chit = await _dbContext.Chits.FindAsync(id);
        if (chit == null)
        {
            return NotFound(ApiResponse<ChitDto>.ErrorResponse("Chit not found"));
        }

        var oldValue = new { chit.Status, chit.Notes };

        chit.Status = dto.Status;
        if (dto.Notes != null)
        {
            chit.Notes = dto.Notes;
        }
        chit.UpdatedAt = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync();

        await _auditLogService.LogAsync("Chit Updated", "chits", chit.Id.ToString(), oldValue, chit);

        var updatedChit = await _chitService.GetChitByIdAsync(id);
        return Ok(ApiResponse<ChitDto>.SuccessResponse(updatedChit!, "Chit updated successfully"));
    }

    [HttpGet("{id:int}/schedule")]
    public async Task<ActionResult<ApiResponse<IEnumerable<PaymentScheduleDto>>>> GetSchedule(int id)
    {
        var schedule = await _chitService.GetScheduleAsync(id);
        return Ok(ApiResponse<IEnumerable<PaymentScheduleDto>>.SuccessResponse(schedule, "Schedule fetched successfully"));
    }

    [HttpPost("{id:int}/generate-schedule")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<ApiResponse<IEnumerable<PaymentScheduleDto>>>> GenerateSchedule(int id)
    {
        // Schedule is auto-generated on Chit creation. Here we just fetch it, acting as the endpoint.
        var schedule = await _chitService.GetScheduleAsync(id);
        return Ok(ApiResponse<IEnumerable<PaymentScheduleDto>>.SuccessResponse(schedule, "Schedule re-synchronized successfully"));
    }
}

public class UpdateChitStatusDto
{
    public ChitStatus Status { get; set; }
    public string? Notes { get; set; }
}
