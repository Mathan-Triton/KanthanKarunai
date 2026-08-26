using System;
using KanthanKarunai.Domain.Enums;

namespace KanthanKarunai.Domain.Entities;

public class Expense
{
    public int Id { get; set; }
    public DateTime ExpenseDate { get; set; }
    public ExpenseCategory Category { get; set; }
    public decimal Amount { get; set; }
    public PaymentMethod PaymentMethod { get; set; }
    public string? Description { get; set; }
    public int CreatedBy { get; set; } // User Id
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public virtual User? Creator { get; set; }
}
