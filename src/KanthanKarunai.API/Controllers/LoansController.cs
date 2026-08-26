using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using KanthanKarunai.Application.DTOs;
using KanthanKarunai.Application.Interfaces;
using KanthanKarunai.Infrastructure.Data;

namespace KanthanKarunai.API.Controllers;

[Authorize(Roles = "Admin")]
public class LoansController : BaseApiController
{
    private readonly ILoanService _loanService;

    public LoansController(ILoanService loanService)
    {
        _loanService = loanService;
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<IEnumerable<LoanDto>>>> GetLoans()
    {
        var loans = await _loanService.GetLoansAsync();
        return Ok(ApiResponse<IEnumerable<LoanDto>>.SuccessResponse(loans, "Loans fetched successfully"));
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<ApiResponse<LoanDto>>> GetLoanById(int id)
    {
        var loan = await _loanService.GetLoanByIdAsync(id);
        if (loan == null) return NotFound(ApiResponse<LoanDto>.ErrorResponse("Loan not found"));
        return Ok(ApiResponse<LoanDto>.SuccessResponse(loan, "Loan fetched successfully"));
    }

    [HttpPost]
    public async Task<ActionResult<ApiResponse<LoanDto>>> CreateLoan([FromBody] CreateLoanDto dto)
    {
        try
        {
            var loan = await _loanService.CreateLoanAsync(dto);
            return CreatedAtAction(nameof(GetLoanById), new { id = loan.Id },
                ApiResponse<LoanDto>.SuccessResponse(loan, "Loan created successfully"));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<LoanDto>.ErrorResponse(ex.Message));
        }
        catch (Exception ex)
        {
            var msg = ex.InnerException != null ? $"{ex.Message} -> {ex.InnerException.Message}" : ex.Message;
            return StatusCode(500, ApiResponse<LoanDto>.ErrorResponse($"Error creating loan: {msg}"));
        }
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<ApiResponse<LoanDto>>> UpdateLoan(int id, [FromBody] UpdateLoanStatusDto dto, [FromServices] ApplicationDbContext dbContext)
    {
        var loan = await dbContext.CustomerLoans.Include(l => l.Customer).FirstOrDefaultAsync(l => l.Id == id);
        if (loan == null) return NotFound(ApiResponse<LoanDto>.ErrorResponse("Loan not found"));

        loan.Status = dto.Status;
        if (dto.Notes != null) loan.Notes = dto.Notes;
        loan.UpdatedAt = DateTime.UtcNow;

        await dbContext.SaveChangesAsync();
        var updated = await _loanService.GetLoanByIdAsync(id);
        return Ok(ApiResponse<LoanDto>.SuccessResponse(updated!, "Loan updated successfully"));
    }

    [HttpGet("pending")]
    public async Task<ActionResult<ApiResponse<IEnumerable<LoanRepaymentScheduleDto>>>> GetPendingLoans([FromQuery] string? query)
    {
        var pending = await _loanService.GetPendingLoanPaymentsAsync(query);
        return Ok(ApiResponse<IEnumerable<LoanRepaymentScheduleDto>>.SuccessResponse(pending, "Pending loans fetched"));
    }

    [HttpGet("{id:int}/schedule")]
    public async Task<ActionResult<ApiResponse<IEnumerable<LoanRepaymentScheduleDto>>>> GetLoanSchedule(int id)
    {
        var schedule = await _loanService.GetLoanScheduleAsync(id);
        return Ok(ApiResponse<IEnumerable<LoanRepaymentScheduleDto>>.SuccessResponse(schedule, "Loan schedule fetched"));
    }
}
