using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using KanthanKarunai.Application.DTOs;
using KanthanKarunai.Application.Interfaces;

namespace KanthanKarunai.API.Controllers;

[Authorize]
public class PaymentsController : BaseApiController
{
    private readonly IPaymentService _paymentService;

    public PaymentsController(IPaymentService paymentService)
    {
        _paymentService = paymentService;
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<IEnumerable<PaymentDto>>>> GetPayments()
    {
        var payments = await _paymentService.GetPaymentsAsync();
        return Ok(ApiResponse<IEnumerable<PaymentDto>>.SuccessResponse(payments, "Payments fetched successfully"));
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<ApiResponse<PaymentDto>>> GetPaymentById(int id)
    {
        var payment = await _paymentService.GetPaymentByIdAsync(id);
        if (payment == null)
        {
            return NotFound(ApiResponse<PaymentDto>.ErrorResponse("Payment record not found"));
        }

        return Ok(ApiResponse<PaymentDto>.SuccessResponse(payment, "Payment fetched successfully"));
    }

    [HttpPost]
    [Authorize(Roles = "Admin,Staff")]
    public async Task<ActionResult<ApiResponse<PaymentDto>>> CreatePayment([FromBody] CreatePaymentDto dto)
    {
        try
        {
            var payment = await _paymentService.CreatePaymentAsync(dto);
            return CreatedAtAction(nameof(GetPaymentById), new { id = payment.Id },
                ApiResponse<PaymentDto>.SuccessResponse(payment, "Payment recorded and receipt generated"));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<PaymentDto>.ErrorResponse(ex.Message));
        }
        catch (Exception ex)
        {
            var msg = ex.InnerException != null ? $"{ex.Message} -> {ex.InnerException.Message}" : ex.Message;
            return StatusCode(500, ApiResponse<PaymentDto>.ErrorResponse($"Error recording payment: {msg}"));
        }
    }

    [HttpGet("pending")]
    [HttpGet("pending-payments")]
    [Authorize(Roles = "Admin,Staff")]
    public async Task<ActionResult<ApiResponse<IEnumerable<PaymentScheduleDto>>>> GetPendingPayments(
        [FromQuery] string? query,
        [FromQuery] string? frequency)
    {
        var pending = await _paymentService.GetPendingPaymentsAsync(query, frequency);
        return Ok(ApiResponse<IEnumerable<PaymentScheduleDto>>.SuccessResponse(pending, "Pending installments fetched"));
    }

    [HttpGet("pending-summary")]
    [Authorize(Roles = "Admin,Staff")]
    public async Task<ActionResult<ApiResponse<IEnumerable<CustomerPendingPaymentDto>>>> GetCustomerPendingPaymentsSummary(
        [FromQuery] string? query)
    {
        var summary = await _paymentService.GetCustomerPendingPaymentsSummaryAsync(query);
        return Ok(ApiResponse<IEnumerable<CustomerPendingPaymentDto>>.SuccessResponse(summary, "Customer pending payment summary fetched"));
    }

    [HttpGet("customer/{customerId:int}")]
    public async Task<ActionResult<ApiResponse<IEnumerable<PaymentDto>>>> GetCustomerPayments(int customerId)
    {
        var payments = await _paymentService.GetCustomerPaymentsAsync(customerId);
        return Ok(ApiResponse<IEnumerable<PaymentDto>>.SuccessResponse(payments, "Customer payments fetched"));
    }
}
