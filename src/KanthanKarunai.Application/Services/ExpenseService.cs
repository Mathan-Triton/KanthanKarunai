using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using KanthanKarunai.Application.DTOs;
using KanthanKarunai.Application.Interfaces;
using KanthanKarunai.Domain.Entities;

namespace KanthanKarunai.Application.Services;

public class ExpenseService : IExpenseService
{
    private readonly IApplicationDbContext _dbContext;
    private readonly ICurrentUserService _currentUserService;
    private readonly IAuditLogService _auditLogService;

    public ExpenseService(
        IApplicationDbContext dbContext,
        ICurrentUserService currentUserService,
        IAuditLogService auditLogService)
    {
        _dbContext = dbContext;
        _currentUserService = currentUserService;
        _auditLogService = auditLogService;
    }


    public async Task<IEnumerable<ExpenseDto>> GetExpensesAsync()
    {
        return await _dbContext.Expenses
            .Include(e => e.Creator)
            .OrderByDescending(e => e.ExpenseDate)
            .Select(e => new ExpenseDto
            {
                Id = e.Id,
                ExpenseDate = e.ExpenseDate,
                Category = e.Category,
                Amount = e.Amount,
                PaymentMethod = e.PaymentMethod,
                Description = e.Description,
                CreatedBy = e.CreatedBy,
                CreatedByName = e.Creator != null ? e.Creator.FullName : null,
                CreatedAt = e.CreatedAt
            })
            .ToListAsync();
    }

    public async Task<ExpenseDto> CreateExpenseAsync(CreateExpenseDto dto)
    {
        if (dto.Amount <= 0)
        {
            throw new ArgumentException("Expense amount must be greater than zero.");
        }

        int creatorId = await GetValidCreatorIdAsync();

        var expenseDateUtc = dto.ExpenseDate.Kind switch
        {
            DateTimeKind.Utc => dto.ExpenseDate,
            DateTimeKind.Local => dto.ExpenseDate.ToUniversalTime(),
            _ => DateTime.SpecifyKind(dto.ExpenseDate, DateTimeKind.Utc)
        };

        var expense = new Expense
        {
            ExpenseDate = expenseDateUtc,
            Category = dto.Category,
            Amount = dto.Amount,
            PaymentMethod = dto.PaymentMethod,
            Description = dto.Description,
            CreatedBy = creatorId,
            CreatedAt = DateTime.UtcNow
        };

        _dbContext.Expenses.Add(expense);
        await _dbContext.SaveChangesAsync();

        await _auditLogService.LogAsync("Expense Created", "expenses", expense.Id.ToString(), null, expense);

        return new ExpenseDto
        {
            Id = expense.Id,
            ExpenseDate = expense.ExpenseDate,
            Category = expense.Category,
            Amount = expense.Amount,
            PaymentMethod = expense.PaymentMethod,
            Description = expense.Description,
            CreatedBy = expense.CreatedBy,
            CreatedAt = expense.CreatedAt
        };
    }

    public async Task<ExpenseDto?> UpdateExpenseAsync(int id, UpdateExpenseDto dto)
    {
        var expense = await _dbContext.Expenses.FindAsync(id);
        if (expense == null) return null;

        var oldValue = new
        {
            expense.ExpenseDate,
            expense.Category,
            expense.Amount,
            expense.PaymentMethod,
            expense.Description
        };

        var expenseDateUtc = dto.ExpenseDate.Kind switch
        {
            DateTimeKind.Utc => dto.ExpenseDate,
            DateTimeKind.Local => dto.ExpenseDate.ToUniversalTime(),
            _ => DateTime.SpecifyKind(dto.ExpenseDate, DateTimeKind.Utc)
        };

        expense.ExpenseDate = expenseDateUtc;
        expense.Category = dto.Category;
        expense.Amount = dto.Amount;
        expense.PaymentMethod = dto.PaymentMethod;
        expense.Description = dto.Description;

        await _dbContext.SaveChangesAsync();

        await _auditLogService.LogAsync("Expense Updated", "expenses", expense.Id.ToString(), oldValue, expense);

        return new ExpenseDto
        {
            Id = expense.Id,
            ExpenseDate = expense.ExpenseDate,
            Category = expense.Category,
            Amount = expense.Amount,
            PaymentMethod = expense.PaymentMethod,
            Description = expense.Description,
            CreatedBy = expense.CreatedBy,
            CreatedAt = expense.CreatedAt
        };
    }

    public async Task<bool> DeleteExpenseAsync(int id)
    {
        var expense = await _dbContext.Expenses.FindAsync(id);
        if (expense == null) return false;

        _dbContext.Expenses.Remove(expense);
        await _dbContext.SaveChangesAsync();

        await _auditLogService.LogAsync("Expense Deleted", "expenses", id.ToString(), expense, null);
        return true;
    }

    private async Task<int> GetValidCreatorIdAsync()
    {
        if (_currentUserService.UserId.HasValue)
        {
            var userExists = await _dbContext.Users.AnyAsync(u => u.Id == _currentUserService.UserId.Value);
            if (userExists) return _currentUserService.UserId.Value;
        }

        var fallbackUser = await _dbContext.Users.FirstOrDefaultAsync();
        return fallbackUser != null ? fallbackUser.Id : 1;
    }
}
