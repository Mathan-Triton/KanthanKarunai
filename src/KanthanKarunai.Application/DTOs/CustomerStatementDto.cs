using System;
using System.Collections.Generic;

namespace KanthanKarunai.Application.DTOs;

public class CustomerStatementDto
{
    public required string CustomerCode { get; set; }
    public required string Name { get; set; }
    public required string MobileNo { get; set; }
    public string? Address { get; set; }
    public DateTime JoinDate { get; set; }
    public required string Status { get; set; }

    public decimal TotalExpected { get; set; }
    public decimal TotalPaid { get; set; }
    public decimal TotalPending { get; set; }
    public decimal TotalAdvance { get; set; }
    public decimal TotalPayout { get; set; }
    public decimal TotalDeduction { get; set; }
    public decimal NetAmountReceived => TotalPaid; // Paid by customer
    public decimal NetPayoutReceived { get; set; } // Paid to customer

    public List<StatementRowDto> Rows { get; set; } = new();
}

public class StatementRowDto
{
    public DateTime Date { get; set; }
    public required string Description { get; set; }
    public decimal? Paid { get; set; }
    public decimal? Payout { get; set; }
}
