using System;
using Xunit;
using KanthanKarunai.Application.Services;

namespace KanthanKarunai.UnitTests;

public class GetChitCalculationTests
{
    private readonly GetChitService _service;

    public GetChitCalculationTests()
    {
        // Testing pure calculation methods
        _service = new GetChitService(null!, null!, null!, null!);
    }

    [Theory]
    [InlineData(100000, 1.0, 1000)]
    [InlineData(50000, 1.0, 500)]
    [InlineData(25000, 1.0, 250)]
    [InlineData(75000, 1.0, 750)]
    [InlineData(95000, 1.0, 950)]
    public void CalculateMonthlyInterest_CalculatesCorrectly(double principal, double rate, double expectedInterest)
    {
        var interest = _service.CalculateMonthlyInterest((decimal)principal, (decimal)rate);
        Assert.Equal((decimal)expectedInterest, interest);
    }

    [Theory]
    [InlineData(100000, 1.0, 101000)]
    [InlineData(50000, 1.0, 50500)]
    [InlineData(25000, 1.0, 25250)]
    [InlineData(75000, 1.0, 75750)]
    [InlineData(95000, 1.0, 95950)]
    public void CalculateNextMonthDue_CalculatesCorrectly(double principal, double rate, double expectedDue)
    {
        var due = _service.CalculateNextMonthDue((decimal)principal, (decimal)rate);
        Assert.Equal((decimal)expectedDue, due);
    }

    [Fact]
    public void AllocatePayment_SettleInterestThenPrincipal_ExampleScenario()
    {
        // Mathan Kumar receives ₹1,00,000 @ 1%
        decimal principal = 100000m;
        decimal rate = 1.0m;

        // Month 1 interest: ₹1,000, Due: ₹1,01,000
        decimal m1Interest = _service.CalculateMonthlyInterest(principal, rate);
        decimal m1Due = _service.CalculateNextMonthDue(principal, rate);
        Assert.Equal(1000m, m1Interest);
        Assert.Equal(101000m, m1Due);

        // Customer pays ₹6,000
        decimal payment = 6000m;
        var (interestAllocated, principalAllocated, newOutstanding) = _service.AllocatePayment(principal, rate, payment);

        Assert.Equal(1000m, interestAllocated); // ₹1,000 settled for interest
        Assert.Equal(5000m, principalAllocated); // ₹5,000 applied to reduce principal
        Assert.Equal(95000m, newOutstanding);   // ₹95,000 remaining principal

        // Next Month dynamic calculation on new outstanding principal
        decimal nextInterest = _service.CalculateMonthlyInterest(newOutstanding, rate);
        decimal nextDue = _service.CalculateNextMonthDue(newOutstanding, rate);

        Assert.Equal(950m, nextInterest); // ₹95,000 * 1% = ₹950
        Assert.Equal(95950m, nextDue);     // ₹95,000 + ₹950 = ₹95,950
    }

    [Fact]
    public void AllocatePayment_MultipleTransactions_CalculatedSeparately()
    {
        // Transaction 1: ₹1,00,000
        decimal t1Principal = 100000m;
        Assert.Equal(1000m, _service.CalculateMonthlyInterest(t1Principal, 1.0m));
        Assert.Equal(101000m, _service.CalculateNextMonthDue(t1Principal, 1.0m));

        // Transaction 2: ₹50,000
        decimal t2Principal = 50000m;
        Assert.Equal(500m, _service.CalculateMonthlyInterest(t2Principal, 1.0m));
        Assert.Equal(50500m, _service.CalculateNextMonthDue(t2Principal, 1.0m));

        // Transaction 3: ₹25,000
        decimal t3Principal = 25000m;
        Assert.Equal(250m, _service.CalculateMonthlyInterest(t3Principal, 1.0m));
        Assert.Equal(25250m, _service.CalculateNextMonthDue(t3Principal, 1.0m));
    }
}
