using System.Collections.Generic;
using System.Threading.Tasks;
using KanthanKarunai.Application.DTOs;

namespace KanthanKarunai.Application.Interfaces;

public interface ILoanService
{
    Task<IEnumerable<LoanDto>> GetLoansAsync();
    Task<LoanDto?> GetLoanByIdAsync(int id);
    Task<IEnumerable<LoanDto>> GetCustomerLoansAsync(int customerId);
    
    Task<LoanDto> CreateLoanAsync(CreateLoanDto dto);
    
    Task<IEnumerable<LoanRepaymentScheduleDto>> GetPendingLoanPaymentsAsync(string? query);
    Task<IEnumerable<LoanRepaymentScheduleDto>> GetLoanScheduleAsync(int loanId);
    
    Task<IEnumerable<LoanPaymentDto>> GetLoanPaymentsAsync();
    Task<LoanPaymentDto?> GetLoanPaymentByIdAsync(int id);
    Task<IEnumerable<LoanPaymentDto>> GetCustomerLoanPaymentsAsync(int customerId);
    
    Task<LoanPaymentDto> CollectPaymentAsync(CreateLoanPaymentDto dto);
}
