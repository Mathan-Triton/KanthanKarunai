using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using KanthanKarunai.Application.DTOs;
using KanthanKarunai.Application.Interfaces;

namespace KanthanKarunai.API.Controllers;

[Authorize]
public class GetChitsController : BaseApiController
{
    private readonly IGetChitService _getChitService;

    public GetChitsController(IGetChitService getChitService)
    {
        _getChitService = getChitService;
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<IEnumerable<GetChitDto>>>> GetGetChits([FromQuery] string? query, [FromQuery] string? status)
    {
        var chits = await _getChitService.GetGetChitsAsync(query, status);
        return Ok(ApiResponse<IEnumerable<GetChitDto>>.SuccessResponse(chits, "Get Chit records fetched successfully"));
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<ApiResponse<GetChitDto>>> GetGetChitById(int id)
    {
        var chit = await _getChitService.GetGetChitByIdAsync(id);
        if (chit == null)
        {
            return NotFound(ApiResponse<GetChitDto>.ErrorResponse("Get Chit record not found"));
        }
        return Ok(ApiResponse<GetChitDto>.SuccessResponse(chit, "Get Chit record fetched successfully"));
    }

    [HttpGet("grouped")]
    public async Task<ActionResult<ApiResponse<IEnumerable<CustomerGetChitGroupDto>>>> GetGroupedByCustomer([FromQuery] string? query)
    {
        var groups = await _getChitService.GetGroupedByCustomerAsync(query);
        return Ok(ApiResponse<IEnumerable<CustomerGetChitGroupDto>>.SuccessResponse(groups, "Customer Get Chit groups fetched successfully"));
    }

    [HttpGet("customer/{customerId:int}")]
    public async Task<ActionResult<ApiResponse<CustomerGetChitGroupDto>>> GetCustomerGetChits(int customerId)
    {
        var group = await _getChitService.GetCustomerGetChitsAsync(customerId);
        if (group == null)
        {
            return NotFound(ApiResponse<CustomerGetChitGroupDto>.ErrorResponse("Customer not found or has no Get Chit records"));
        }
        return Ok(ApiResponse<CustomerGetChitGroupDto>.SuccessResponse(group, "Customer Get Chit records fetched successfully"));
    }

    [HttpGet("pending-dues")]
    public async Task<ActionResult<ApiResponse<IEnumerable<PendingGetChitDueDto>>>> GetPendingDues([FromQuery] string? query)
    {
        var dues = await _getChitService.GetPendingDuesAsync(query);
        return Ok(ApiResponse<IEnumerable<PendingGetChitDueDto>>.SuccessResponse(dues, "Pending Get Chit dues fetched successfully"));
    }

    [HttpPost]
    [Authorize(Roles = "Admin,Staff")]
    public async Task<ActionResult<ApiResponse<GetChitDto>>> CreateGetChit([FromBody] CreateGetChitDto dto)
    {
        try
        {
            var chit = await _getChitService.CreateGetChitAsync(dto);
            return CreatedAtAction(nameof(GetGetChitById), new { id = chit.Id },
                ApiResponse<GetChitDto>.SuccessResponse(chit, "Get Chit transaction created successfully"));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<GetChitDto>.ErrorResponse(ex.Message));
        }
    }

    [HttpPost("{id:int}/payments")]
    [Authorize(Roles = "Admin,Staff")]
    public async Task<ActionResult<ApiResponse<GetChitPaymentDto>>> RecordPayment(int id, [FromBody] RecordGetChitPaymentDto dto)
    {
        try
        {
            dto.GetChitId = id;
            var payment = await _getChitService.RecordPaymentAsync(dto);
            return Ok(ApiResponse<GetChitPaymentDto>.SuccessResponse(payment, "Get Chit payment recorded successfully"));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<GetChitPaymentDto>.ErrorResponse(ex.Message));
        }
    }

    [HttpPost("{id:int}/preview-allocation")]
    public ActionResult<ApiResponse<PaymentAllocationPreviewDto>> PreviewAllocation(int id, [FromQuery] decimal amount)
    {
        try
        {
            var preview = _getChitService.PreviewPaymentAllocation(id, amount);
            return Ok(ApiResponse<PaymentAllocationPreviewDto>.SuccessResponse(preview, "Payment allocation preview generated"));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<PaymentAllocationPreviewDto>.ErrorResponse(ex.Message));
        }
    }

    [HttpGet("{id:int}/payments")]
    public async Task<ActionResult<ApiResponse<IEnumerable<GetChitPaymentDto>>>> GetPaymentHistory(int id)
    {
        var payments = await _getChitService.GetPaymentHistoryAsync(id);
        return Ok(ApiResponse<IEnumerable<GetChitPaymentDto>>.SuccessResponse(payments, "Payment history fetched successfully"));
    }
}
