using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using KanthanKarunai.Application.DTOs;
using KanthanKarunai.Application.Interfaces;
using KanthanKarunai.Domain.Entities;

namespace KanthanKarunai.Application.Services;

public class PayoutService : IPayoutService
{
    private readonly IApplicationDbContext _dbContext;
    private readonly ICurrentUserService _currentUserService;
    private readonly IAuditLogService _auditLogService;

    public PayoutService(
        IApplicationDbContext dbContext,
        ICurrentUserService currentUserService,
        IAuditLogService auditLogService)
    {
        _dbContext = dbContext;
        _currentUserService = currentUserService;
        _auditLogService = auditLogService;
    }


    public async Task<IEnumerable<ChitPayoutDto>> GetPayoutsByChitAsync(int chitId)
    {
        return await _dbContext.ChitPayouts
            .Include(p => p.Customer)
            .Include(p => p.Chit)
            .Include(p => p.Creator)
            .Where(p => p.ChitId == chitId)
            .OrderByDescending(p => p.PayoutDate)
            .Select(p => new ChitPayoutDto
            {
                Id = p.Id,
                CustomerId = p.CustomerId,
                CustomerName = p.Customer != null ? p.Customer.Name : null,
                CustomerCode = p.Customer != null ? p.Customer.CustomerCode : null,
                ChitId = p.ChitId,
                ChitName = p.Chit != null ? p.Chit.ChitName : null,
                PayoutDate = p.PayoutDate,
                GrossAmount = p.GrossAmount,
                DeductionAmount = p.DeductionAmount,
                OtherCharges = p.OtherCharges,
                NetAmount = p.NetAmount,
                PaymentMethod = p.PaymentMethod,
                ReferenceNo = p.ReferenceNo,
                Notes = p.Notes,
                CreatedBy = p.CreatedBy,
                CreatedByName = p.Creator != null ? p.Creator.FullName : null,
                CreatedAt = p.CreatedAt
            })
            .ToListAsync();
    }

    public async Task<ChitPayoutDto> CreatePayoutAsync(CreateChitPayoutDto dto)
    {
        if (dto.GrossAmount <= 0)
        {
            throw new ArgumentException("Gross amount must be greater than zero.");
        }
        if (dto.DeductionAmount < 0)
        {
            throw new ArgumentException("Deduction amount cannot be negative.");
        }
        if (dto.OtherCharges < 0)
        {
            throw new ArgumentException("Other charges cannot be negative.");
        }

        decimal netAmount = dto.GrossAmount - dto.DeductionAmount - dto.OtherCharges;
        if (netAmount < 0)
        {
            throw new ArgumentException("Net amount cannot be negative (Deductions exceed gross amount).");
        }

        var customer = await _dbContext.Customers.FindAsync(dto.CustomerId);
        var chit = await _dbContext.Chits.FindAsync(dto.ChitId);

        if (customer == null || chit == null)
        {
            throw new ArgumentException("Customer or Chit not found.");
        }

        int creatorId = _currentUserService.UserId ?? 1;

        using var transaction = await _dbContext.Database.BeginTransactionAsync();
        try
        {
            var payout = new ChitPayout
            {
                CustomerId = dto.CustomerId,
                ChitId = dto.ChitId,
                PayoutDate = dto.PayoutDate.ToUniversalTime(),
                GrossAmount = dto.GrossAmount,
                DeductionAmount = dto.DeductionAmount,
                OtherCharges = dto.OtherCharges,
                NetAmount = netAmount,
                PaymentMethod = dto.PaymentMethod,
                ReferenceNo = dto.ReferenceNo,
                Notes = dto.Notes,
                CreatedBy = creatorId,
                CreatedAt = DateTime.UtcNow
            };

            _dbContext.ChitPayouts.Add(payout);
            await _dbContext.SaveChangesAsync();

            await _auditLogService.LogAsync("Payout Created", "chit_payouts", payout.Id.ToString(), null, payout);

            await transaction.CommitAsync();

            return new ChitPayoutDto
            {
                Id = payout.Id,
                CustomerId = payout.CustomerId,
                CustomerName = customer.Name,
                CustomerCode = customer.CustomerCode,
                ChitId = payout.ChitId,
                ChitName = chit.ChitName,
                PayoutDate = payout.PayoutDate,
                GrossAmount = payout.GrossAmount,
                DeductionAmount = payout.DeductionAmount,
                OtherCharges = payout.OtherCharges,
                NetAmount = payout.NetAmount,
                PaymentMethod = payout.PaymentMethod,
                ReferenceNo = payout.ReferenceNo,
                Notes = payout.Notes,
                CreatedBy = payout.CreatedBy,
                CreatedAt = payout.CreatedAt
            };
        }
        catch (Exception)
        {
            await transaction.RollbackAsync();
            throw;
        }
    }
}
