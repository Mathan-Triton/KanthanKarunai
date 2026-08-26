using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using KanthanKarunai.Application.DTOs;
using KanthanKarunai.Application.Interfaces;

namespace KanthanKarunai.API.Controllers;

[Authorize]
public class LoanPaymentsController : BaseApiController
{
    private readonly ILoanService _loanService;

    public LoanPaymentsController(ILoanService loanService)
    {
        _loanService = loanService;
    }

    [HttpGet]
    [Authorize(Roles = "Admin,Staff")]
    public async Task<ActionResult<ApiResponse<IEnumerable<LoanPaymentDto>>>> GetLoanPayments()
    {
        var payments = await _loanService.GetLoanPaymentsAsync();
        return Ok(ApiResponse<IEnumerable<LoanPaymentDto>>.SuccessResponse(payments, "Loan payments fetched successfully"));
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<ApiResponse<LoanPaymentDto>>> GetLoanPaymentById(int id)
    {
        var payment = await _loanService.GetLoanPaymentByIdAsync(id);
        if (payment == null) return NotFound(ApiResponse<LoanPaymentDto>.ErrorResponse("Loan payment not found"));
        return Ok(ApiResponse<LoanPaymentDto>.SuccessResponse(payment, "Loan payment fetched successfully"));
    }

    [HttpGet("pending")]
    [Authorize(Roles = "Admin,Staff")]
    public async Task<ActionResult<ApiResponse<IEnumerable<LoanRepaymentScheduleDto>>>> GetPendingLoanPayments([FromQuery] string? query)
    {
        var pending = await _loanService.GetPendingLoanPaymentsAsync(query);
        return Ok(ApiResponse<IEnumerable<LoanRepaymentScheduleDto>>.SuccessResponse(pending, "Pending loans fetched"));
    }

    [HttpGet("customer/{customerId:int}")]
    public async Task<ActionResult<ApiResponse<IEnumerable<LoanPaymentDto>>>> GetCustomerLoanPayments(int customerId)
    {
        var payments = await _loanService.GetCustomerLoanPaymentsAsync(customerId);
        return Ok(ApiResponse<IEnumerable<LoanPaymentDto>>.SuccessResponse(payments, "Customer loan payments fetched successfully"));
    }

    [HttpPost]
    [Authorize(Roles = "Admin,Staff")]
    public async Task<ActionResult<ApiResponse<LoanPaymentDto>>> CollectLoanPayment([FromBody] CreateLoanPaymentDto dto)
    {
        try
        {
            var payment = await _loanService.CollectPaymentAsync(dto);
            return CreatedAtAction(nameof(GetLoanPaymentById), new { id = payment.Id },
                ApiResponse<LoanPaymentDto>.SuccessResponse(payment, "Loan payment recorded successfully"));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<LoanPaymentDto>.ErrorResponse(ex.Message));
        }
        catch (Exception ex)
        {
            return StatusCode(500, ApiResponse<LoanPaymentDto>.ErrorResponse($"Error recording loan payment: {ex.Message}"));
        }
    }
}
