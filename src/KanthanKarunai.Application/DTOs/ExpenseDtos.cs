using System;
using KanthanKarunai.Domain.Enums;

namespace KanthanKarunai.Application.DTOs;

public class ExpenseDto
{
    public int Id { get; set; }
    public DateTime ExpenseDate { get; set; }
    public ExpenseCategory Category { get; set; }
    public decimal Amount { get; set; }
    public PaymentMethod PaymentMethod { get; set; }
    public string? Description { get; set; }
    public int CreatedBy { get; set; }
    public string? CreatedByName { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class CreateExpenseDto
{
    public DateTime ExpenseDate { get; set; } = DateTime.UtcNow;
    public ExpenseCategory Category { get; set; }
    public decimal Amount { get; set; }
    public PaymentMethod PaymentMethod { get; set; }
    public string? Description { get; set; }
}

public class UpdateExpenseDto
{
    public DateTime ExpenseDate { get; set; }
    public ExpenseCategory Category { get; set; }
    public decimal Amount { get; set; }
    public PaymentMethod PaymentMethod { get; set; }
    public string? Description { get; set; }
}
