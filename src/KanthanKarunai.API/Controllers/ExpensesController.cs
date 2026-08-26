using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using KanthanKarunai.Application.DTOs;
using KanthanKarunai.Application.Interfaces;

namespace KanthanKarunai.API.Controllers;

[Authorize(Roles = "Admin")]
public class ExpensesController : BaseApiController
{
    private readonly IExpenseService _expenseService;

    public ExpensesController(IExpenseService expenseService)
    {
        _expenseService = expenseService;
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<IEnumerable<ExpenseDto>>>> GetExpenses()
    {
        var expenses = await _expenseService.GetExpensesAsync();
        return Ok(ApiResponse<IEnumerable<ExpenseDto>>.SuccessResponse(expenses, "Expenses fetched successfully"));
    }

    [HttpPost]
    public async Task<ActionResult<ApiResponse<ExpenseDto>>> CreateExpense([FromBody] CreateExpenseDto dto)
    {
        try
        {
            var expense = await _expenseService.CreateExpenseAsync(dto);
            return Ok(ApiResponse<ExpenseDto>.SuccessResponse(expense, "Expense logged successfully"));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<ExpenseDto>.ErrorResponse(ex.Message));
        }
        catch (Exception ex)
        {
            var msg = ex.InnerException != null ? $"{ex.Message} -> {ex.InnerException.Message}" : ex.Message;
            return StatusCode(500, ApiResponse<ExpenseDto>.ErrorResponse($"Error creating expense: {msg}"));
        }
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<ApiResponse<ExpenseDto>>> UpdateExpense(int id, [FromBody] UpdateExpenseDto dto)
    {
        try
        {
            var expense = await _expenseService.UpdateExpenseAsync(id, dto);
            if (expense == null)
            {
                return NotFound(ApiResponse<ExpenseDto>.ErrorResponse("Expense record not found"));
            }

            return Ok(ApiResponse<ExpenseDto>.SuccessResponse(expense, "Expense updated successfully"));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<ExpenseDto>.ErrorResponse(ex.Message));
        }
        catch (Exception ex)
        {
            var msg = ex.InnerException != null ? $"{ex.Message} -> {ex.InnerException.Message}" : ex.Message;
            return StatusCode(500, ApiResponse<ExpenseDto>.ErrorResponse($"Error updating expense: {msg}"));
        }
    }

    [HttpDelete("{id:int}")]
    public async Task<ActionResult<ApiResponse<object>>> DeleteExpense(int id)
    {
        var success = await _expenseService.DeleteExpenseAsync(id);
        if (!success)
        {
            return NotFound(ApiResponse<object>.ErrorResponse("Expense record not found"));
        }

        return Ok(ApiResponse<object>.SuccessResponse(new { }, "Expense record deleted successfully"));
    }
}
