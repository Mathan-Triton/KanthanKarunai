using System.Collections.Generic;
using System.Threading.Tasks;
using KanthanKarunai.Application.DTOs;

namespace KanthanKarunai.Application.Interfaces;

public interface IExpenseService
{
    Task<IEnumerable<ExpenseDto>> GetExpensesAsync();
    Task<ExpenseDto> CreateExpenseAsync(CreateExpenseDto dto);
    Task<ExpenseDto?> UpdateExpenseAsync(int id, UpdateExpenseDto dto);
    Task<bool> DeleteExpenseAsync(int id);
}
