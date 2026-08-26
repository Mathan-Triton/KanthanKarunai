using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using KanthanKarunai.Application.DTOs;
using KanthanKarunai.Application.Interfaces;

namespace KanthanKarunai.API.Controllers;

[Authorize]
public class CustomersController : BaseApiController
{
    private readonly ICustomerService _customerService;
    private readonly IPaymentService _paymentService;

    public CustomersController(ICustomerService customerService, IPaymentService paymentService)
    {
        _customerService = customerService;
        _paymentService = paymentService;
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<IEnumerable<CustomerDto>>>> GetCustomers(
        [FromQuery] string? query, 
        [FromQuery] string? status, 
        [FromQuery] string? frequency, 
        [FromQuery] int page = 1, 
        [FromQuery] int pageSize = 100)
    {
        var (customers, totalCount) = await _customerService.GetCustomersAsync(query, status, frequency, page, pageSize);
        
        // Return custom headers or metadata if pagination is needed, or return in a wrapper. 
        // For simplicity, we send customers list directly.
        return Ok(ApiResponse<IEnumerable<CustomerDto>>.SuccessResponse(customers, $"Fetched {totalCount} customers"));
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<ApiResponse<CustomerDto>>> GetCustomerById(int id)
    {
        var customer = await _customerService.GetCustomerByIdAsync(id);
        if (customer == null)
        {
            return NotFound(ApiResponse<CustomerDto>.ErrorResponse("Customer not found"));
        }

        return Ok(ApiResponse<CustomerDto>.SuccessResponse(customer, "Customer fetched successfully"));
    }

    [HttpGet("search")]
    public async Task<ActionResult<ApiResponse<IEnumerable<CustomerDto>>>> SearchCustomers([FromQuery] string query)
    {
        var (customers, _) = await _customerService.GetCustomersAsync(query, null, null, 1, 100);
        return Ok(ApiResponse<IEnumerable<CustomerDto>>.SuccessResponse(customers, "Search completed"));
    }

    [HttpPost]
    [Authorize(Roles = "Admin,Staff")]
    public async Task<ActionResult<ApiResponse<CustomerDto>>> CreateCustomer([FromBody] CreateCustomerDto dto)
    {
        try
        {
            var customer = await _customerService.CreateCustomerAsync(dto);
            return CreatedAtAction(nameof(GetCustomerById), new { id = customer.Id }, 
                ApiResponse<CustomerDto>.SuccessResponse(customer, "Customer created successfully"));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<CustomerDto>.ErrorResponse(ex.Message));
        }
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = "Admin,Staff")]
    public async Task<ActionResult<ApiResponse<CustomerDto>>> UpdateCustomer(int id, [FromBody] UpdateCustomerDto dto)
    {
        try
        {
            var customer = await _customerService.UpdateCustomerAsync(id, dto);
            if (customer == null)
            {
                return NotFound(ApiResponse<CustomerDto>.ErrorResponse("Customer not found"));
            }

            return Ok(ApiResponse<CustomerDto>.SuccessResponse(customer, "Customer updated successfully"));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<CustomerDto>.ErrorResponse(ex.Message));
        }
    }

    [HttpDelete("{id:int}")]
    [Authorize(Roles = "Admin,Staff")]
    public async Task<ActionResult<ApiResponse<object>>> DeleteCustomer(int id)
    {
        var success = await _customerService.DeactivateCustomerAsync(id);
        if (!success)
        {
            return NotFound(ApiResponse<object>.ErrorResponse("Customer not found"));
        }

        return Ok(ApiResponse<object>.SuccessResponse(new { }, "Customer deactivated successfully"));
    }

    [HttpGet("{id:int}/payments")]
    public async Task<ActionResult<ApiResponse<IEnumerable<PaymentDto>>>> GetCustomerPayments(int id)
    {
        var payments = await _paymentService.GetCustomerPaymentsAsync(id);
        return Ok(ApiResponse<IEnumerable<PaymentDto>>.SuccessResponse(payments, "Customer payments fetched"));
    }
}
