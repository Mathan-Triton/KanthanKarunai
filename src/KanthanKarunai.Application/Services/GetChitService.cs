using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using KanthanKarunai.Application.DTOs;
using KanthanKarunai.Application.Interfaces;
using KanthanKarunai.Domain.Entities;
using KanthanKarunai.Domain.Enums;

namespace KanthanKarunai.Application.Services;

public class GetChitService : IGetChitService
{
    private readonly IApplicationDbContext _dbContext;
    private readonly ICurrentUserService _currentUserService;
    private readonly IAuditLogService _auditLogService;
    private readonly INotificationService _notificationService;

    public GetChitService(
        IApplicationDbContext dbContext,
        ICurrentUserService currentUserService,
        IAuditLogService auditLogService,
        INotificationService notificationService)
    {
        _dbContext = dbContext;
        _currentUserService = currentUserService;
        _auditLogService = auditLogService;
        _notificationService = notificationService;
    }

    public decimal CalculateMonthlyInterest(decimal outstandingPrincipal, decimal interestRate)
    {
        if (outstandingPrincipal <= 0 || interestRate <= 0) return 0;
        return Math.Round(outstandingPrincipal * (interestRate / 100m), 2);
    }

    public decimal CalculateNextMonthDue(decimal outstandingPrincipal, decimal interestRate)
    {
        if (outstandingPrincipal <= 0) return 0;
        return Math.Round(outstandingPrincipal + CalculateMonthlyInterest(outstandingPrincipal, interestRate), 2);
    }

    public (decimal interestAllocated, decimal principalAllocated, decimal newOutstanding) AllocatePayment(
        decimal outstandingPrincipal, decimal interestRate, decimal paymentAmount)
    {
        if (paymentAmount <= 0)
        {
            return (0, 0, outstandingPrincipal);
        }

        decimal monthlyInterest = CalculateMonthlyInterest(outstandingPrincipal, interestRate);
        decimal interestAllocated = Math.Min(paymentAmount, monthlyInterest);
        decimal principalAllocated = paymentAmount - interestAllocated;

        if (principalAllocated > outstandingPrincipal)
        {
            principalAllocated = outstandingPrincipal;
        }

        decimal newOutstanding = Math.Max(0, outstandingPrincipal - principalAllocated);
        return (interestAllocated, principalAllocated, newOutstanding);
    }

    public PaymentAllocationPreviewDto PreviewPaymentAllocation(int getChitId, decimal paymentAmount)
    {
        var getChit = _dbContext.GetChits.Find(getChitId);
        if (getChit == null)
        {
            throw new ArgumentException("Get Chit transaction not found.");
        }

        decimal currentInterest = CalculateMonthlyInterest(getChit.OutstandingPrincipal, getChit.InterestRate);
        var (interestAllocated, principalAllocated, newOutstanding) = AllocatePayment(
            getChit.OutstandingPrincipal, getChit.InterestRate, paymentAmount);

        decimal nextMonthInterest = CalculateMonthlyInterest(newOutstanding, getChit.InterestRate);
        decimal nextMonthDue = CalculateNextMonthDue(newOutstanding, getChit.InterestRate);

        return new PaymentAllocationPreviewDto
        {
            GetChitId = getChitId,
            PaymentAmount = paymentAmount,
            CurrentOutstandingPrincipal = getChit.OutstandingPrincipal,
            CurrentMonthlyInterest = currentInterest,
            AllocatedInterest = interestAllocated,
            AllocatedPrincipal = principalAllocated,
            NewOutstandingPrincipal = newOutstanding,
            NextMonthInterest = nextMonthInterest,
            NextMonthDue = nextMonthDue
        };
    }

    public async Task<IEnumerable<GetChitDto>> GetGetChitsAsync(string? query = null, string? status = null)
    {
        var dbQuery = _dbContext.GetChits
            .Include(g => g.Customer)
            .Include(g => g.Creator)
            .Include(g => g.Payments)
                .ThenInclude(p => p.Collector)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(query))
        {
            var lower = query.ToLower();
            dbQuery = dbQuery.Where(g => g.Customer != null && 
                                        (g.Customer.Name.ToLower().Contains(lower) || 
                                         g.Customer.CustomerCode.ToLower().Contains(lower) ||
                                         g.Customer.MobileNo.Contains(lower)));
        }

        if (!string.IsNullOrWhiteSpace(status))
        {
            dbQuery = dbQuery.Where(g => g.Status.ToUpper() == status.ToUpper());
        }

        var results = await dbQuery
            .OrderByDescending(g => g.ReceivedDate)
            .ToListAsync();

        return results.Select(MapToDto);
    }

    public async Task<GetChitDto?> GetGetChitByIdAsync(int id)
    {
        var getChit = await _dbContext.GetChits
            .Include(g => g.Customer)
            .Include(g => g.Creator)
            .Include(g => g.Payments)
                .ThenInclude(p => p.Collector)
            .FirstOrDefaultAsync(g => g.Id == id);

        return getChit == null ? null : MapToDto(getChit);
    }

    public async Task<IEnumerable<CustomerGetChitGroupDto>> GetGroupedByCustomerAsync(string? query = null)
    {
        var allChits = await GetGetChitsAsync(query);

        return allChits
            .GroupBy(g => g.CustomerId)
            .Select(group =>
            {
                var list = group.OrderByDescending(x => x.ReceivedDate).ToList();
                var first = list.First();

                return new CustomerGetChitGroupDto
                {
                    CustomerId = group.Key,
                    CustomerName = first.CustomerName,
                    CustomerCode = first.CustomerCode,
                    CustomerMobile = first.CustomerMobile,
                    TotalOriginalAmount = list.Sum(x => x.PrincipalAmount),
                    TotalOutstandingPrincipal = list.Sum(x => x.OutstandingPrincipal),
                    TotalMonthlyInterest = list.Sum(x => x.MonthlyInterest),
                    TotalCurrentDue = list.Sum(x => x.CurrentDue),
                    TotalPaid = list.Sum(x => x.TotalPaid),
                    TransactionsCount = list.Count,
                    Transactions = list
                };
            })
            .OrderBy(c => c.CustomerName);
    }

    public async Task<CustomerGetChitGroupDto?> GetCustomerGetChitsAsync(int customerId)
    {
        var customer = await _dbContext.Customers.FindAsync(customerId);
        if (customer == null) return null;

        var chits = await _dbContext.GetChits
            .Include(g => g.Customer)
            .Include(g => g.Creator)
            .Include(g => g.Payments)
                .ThenInclude(p => p.Collector)
            .Where(g => g.CustomerId == customerId)
            .OrderByDescending(g => g.ReceivedDate)
            .ToListAsync();

        var dtoList = chits.Select(MapToDto).ToList();

        return new CustomerGetChitGroupDto
        {
            CustomerId = customer.Id,
            CustomerName = customer.Name,
            CustomerCode = customer.CustomerCode,
            CustomerMobile = customer.MobileNo,
            TotalOriginalAmount = dtoList.Sum(x => x.PrincipalAmount),
            TotalOutstandingPrincipal = dtoList.Sum(x => x.OutstandingPrincipal),
            TotalMonthlyInterest = dtoList.Sum(x => x.MonthlyInterest),
            TotalCurrentDue = dtoList.Sum(x => x.CurrentDue),
            TotalPaid = dtoList.Sum(x => x.TotalPaid),
            TransactionsCount = dtoList.Count,
            Transactions = dtoList
        };
    }

    public async Task<IEnumerable<PendingGetChitDueDto>> GetPendingDuesAsync(string? query = null)
    {
        var chits = await _dbContext.GetChits
            .Include(g => g.Customer)
            .Where(g => g.Status == "ACTIVE" && g.OutstandingPrincipal > 0)
            .OrderByDescending(g => g.ReceivedDate)
            .ToListAsync();

        if (!string.IsNullOrWhiteSpace(query))
        {
            var lower = query.ToLower();
            chits = chits.Where(g => g.Customer != null && 
                                    (g.Customer.Name.ToLower().Contains(lower) || 
                                     g.Customer.CustomerCode.ToLower().Contains(lower) ||
                                     g.Customer.MobileNo.Contains(lower))).ToList();
        }

        return chits.Select(g =>
        {
            decimal monthlyInterest = CalculateMonthlyInterest(g.OutstandingPrincipal, g.InterestRate);
            decimal currentDue = CalculateNextMonthDue(g.OutstandingPrincipal, g.InterestRate);

            return new PendingGetChitDueDto
            {
                GetChitId = g.Id,
                CustomerId = g.CustomerId,
                CustomerName = g.Customer?.Name,
                CustomerCode = g.Customer?.CustomerCode,
                CustomerMobile = g.Customer?.MobileNo,
                OriginalAmount = g.PrincipalAmount,
                OutstandingPrincipal = g.OutstandingPrincipal,
                CurrentMonthInterest = monthlyInterest,
                CurrentDue = currentDue,
                TotalPaid = g.TotalInterestPaid + g.TotalPrincipalPaid,
                NextMonthDue = currentDue,
                Status = "Pending"
            };
        });
    }

    public async Task<GetChitDto> CreateGetChitAsync(CreateGetChitDto dto)
    {
        var customer = await _dbContext.Customers.FindAsync(dto.CustomerId);
        if (customer == null)
        {
            throw new ArgumentException("Customer not found.");
        }

        if (dto.PrincipalAmount <= 0)
        {
            throw new ArgumentException("Principal amount received must be greater than zero.");
        }

        decimal interestRate = dto.InterestRate.HasValue && dto.InterestRate.Value > 0
            ? dto.InterestRate.Value
            : 1.0m;

        DateTime receivedDate = dto.ReceivedDate.HasValue
            ? DateTime.SpecifyKind(dto.ReceivedDate.Value, DateTimeKind.Utc)
            : DateTime.UtcNow;

        int creatorId = await GetValidUserIdAsync();

        var getChit = new GetChit
        {
            CustomerId = dto.CustomerId,
            PrincipalAmount = dto.PrincipalAmount,
            InterestRate = interestRate,
            ReceivedDate = receivedDate,
            OutstandingPrincipal = dto.PrincipalAmount,
            TotalInterestPaid = 0,
            TotalPrincipalPaid = 0,
            Status = "ACTIVE",
            Notes = dto.Notes?.Trim(),
            CreatedBy = creatorId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _dbContext.GetChits.Add(getChit);
        await _dbContext.SaveChangesAsync();

        await _auditLogService.LogAsync("Get Chit Created", "get_chits", getChit.Id.ToString(), null, getChit);

        getChit.Customer = customer;
        return MapToDto(getChit);
    }

    public async Task<GetChitPaymentDto> RecordPaymentAsync(RecordGetChitPaymentDto dto)
    {
        var getChit = await _dbContext.GetChits
            .Include(g => g.Customer)
            .FirstOrDefaultAsync(g => g.Id == dto.GetChitId);

        if (getChit == null)
        {
            throw new ArgumentException("Get Chit transaction not found.");
        }

        if (dto.PaymentAmount <= 0)
        {
            throw new ArgumentException("Payment amount must be greater than zero.");
        }

        if (getChit.OutstandingPrincipal <= 0)
        {
            throw new ArgumentException("This Get Chit transaction is already fully settled.");
        }

        int collectorId = await GetValidUserIdAsync();

        // 1. Calculate Allocation
        var (interestAllocated, principalAllocated, newOutstanding) = AllocatePayment(
            getChit.OutstandingPrincipal, getChit.InterestRate, dto.PaymentAmount);

        // 2. Generate Receipt Number
        var istTime = DateTime.UtcNow.AddHours(5.5);
        var todayStr = istTime.ToString("yyyyMMdd");
        var prefix = $"KGC-{todayStr}-";

        int nextIndex = 1;
        string receiptNo = $"{prefix}{nextIndex:D4}";
        while (await _dbContext.GetChitPayments.AnyAsync(p => p.ReceiptNo == receiptNo))
        {
            nextIndex++;
            receiptNo = $"{prefix}{nextIndex:D4}";
        }

        DateTime paymentDate = DateTime.SpecifyKind(dto.PaymentDate, DateTimeKind.Utc);

        var payment = new GetChitPayment
        {
            GetChitId = getChit.Id,
            CustomerId = getChit.CustomerId,
            PaymentDate = paymentDate,
            PaymentAmount = dto.PaymentAmount,
            InterestAmount = interestAllocated,
            PrincipalPaidAmount = principalAllocated,
            RemainingPrincipal = newOutstanding,
            PaymentMethod = dto.PaymentMethod,
            ReceiptNo = receiptNo,
            Remarks = dto.Remarks?.Trim(),
            CollectedBy = collectorId,
            CreatedAt = DateTime.UtcNow
        };

        _dbContext.GetChitPayments.Add(payment);

        // 3. Update GetChit state
        var oldState = new
        {
            getChit.OutstandingPrincipal,
            getChit.TotalInterestPaid,
            getChit.TotalPrincipalPaid,
            getChit.Status
        };

        getChit.OutstandingPrincipal = newOutstanding;
        getChit.TotalInterestPaid += interestAllocated;
        getChit.TotalPrincipalPaid += principalAllocated;
        if (newOutstanding == 0)
        {
            getChit.Status = "COMPLETED";
        }
        getChit.UpdatedAt = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync();

        await _auditLogService.LogAsync("Get Chit Payment Recorded", "get_chit_payments", payment.Id.ToString(), null, payment);
        await _auditLogService.LogAsync("Get Chit Updated", "get_chits", getChit.Id.ToString(), oldState, getChit);

        // Send notification gracefully
        try
        {
            if (getChit.Customer != null)
            {
                await _notificationService.SendChitPaymentNotificationAsync(
                    getChit.CustomerId,
                    payment.Id,
                    getChit.Customer.Name,
                    getChit.Customer.MobileNo,
                    dto.PaymentAmount,
                    paymentDate.ToString("MMMM yyyy"));
            }
        }
        catch
        {
            // Gracefully handled
        }

        var collector = await _dbContext.Users.FindAsync(collectorId);

        return new GetChitPaymentDto
        {
            Id = payment.Id,
            GetChitId = payment.GetChitId,
            CustomerId = payment.CustomerId,
            CustomerName = getChit.Customer?.Name,
            CustomerCode = getChit.Customer?.CustomerCode,
            CustomerMobile = getChit.Customer?.MobileNo,
            PaymentDate = payment.PaymentDate,
            PaymentAmount = payment.PaymentAmount,
            InterestAmount = payment.InterestAmount,
            PrincipalPaidAmount = payment.PrincipalPaidAmount,
            RemainingPrincipal = payment.RemainingPrincipal,
            PaymentMethod = payment.PaymentMethod,
            ReceiptNo = payment.ReceiptNo,
            Remarks = payment.Remarks,
            CollectedByName = collector?.FullName ?? "Staff",
            CreatedAt = payment.CreatedAt
        };
    }

    public async Task<IEnumerable<GetChitPaymentDto>> GetPaymentHistoryAsync(int getChitId)
    {
        var payments = await _dbContext.GetChitPayments
            .Include(p => p.Customer)
            .Include(p => p.Collector)
            .Where(p => p.GetChitId == getChitId)
            .OrderByDescending(p => p.PaymentDate)
            .ThenByDescending(p => p.Id)
            .ToListAsync();

        return payments.Select(p => new GetChitPaymentDto
        {
            Id = p.Id,
            GetChitId = p.GetChitId,
            CustomerId = p.CustomerId,
            CustomerName = p.Customer?.Name,
            CustomerCode = p.Customer?.CustomerCode,
            CustomerMobile = p.Customer?.MobileNo,
            PaymentDate = p.PaymentDate,
            PaymentAmount = p.PaymentAmount,
            InterestAmount = p.InterestAmount,
            PrincipalPaidAmount = p.PrincipalPaidAmount,
            RemainingPrincipal = p.RemainingPrincipal,
            PaymentMethod = p.PaymentMethod,
            ReceiptNo = p.ReceiptNo,
            Remarks = p.Remarks,
            CollectedByName = p.Collector?.FullName ?? "Staff",
            CreatedAt = p.CreatedAt
        });
    }

    private GetChitDto MapToDto(GetChit g)
    {
        decimal monthlyInterest = CalculateMonthlyInterest(g.OutstandingPrincipal, g.InterestRate);
        decimal nextMonthDue = CalculateNextMonthDue(g.OutstandingPrincipal, g.InterestRate);

        var payments = g.Payments ?? new List<GetChitPayment>();

        return new GetChitDto
        {
            Id = g.Id,
            CustomerId = g.CustomerId,
            CustomerName = g.Customer?.Name,
            CustomerCode = g.Customer?.CustomerCode,
            CustomerMobile = g.Customer?.MobileNo,
            PrincipalAmount = g.PrincipalAmount,
            InterestRate = g.InterestRate,
            ReceivedDate = g.ReceivedDate,
            OutstandingPrincipal = g.OutstandingPrincipal,
            MonthlyInterest = monthlyInterest,
            CurrentDue = nextMonthDue,
            NextMonthDue = nextMonthDue,
            TotalInterestPaid = g.TotalInterestPaid,
            TotalPrincipalPaid = g.TotalPrincipalPaid,
            Status = g.OutstandingPrincipal == 0 ? "COMPLETED" : g.Status,
            Notes = g.Notes,
            CreatedByName = g.Creator?.FullName,
            CreatedAt = g.CreatedAt,
            Payments = payments
                .OrderByDescending(p => p.PaymentDate)
                .Select(p => new GetChitPaymentDto
                {
                    Id = p.Id,
                    GetChitId = p.GetChitId,
                    CustomerId = p.CustomerId,
                    CustomerName = g.Customer?.Name,
                    CustomerCode = g.Customer?.CustomerCode,
                    CustomerMobile = g.Customer?.MobileNo,
                    PaymentDate = p.PaymentDate,
                    PaymentAmount = p.PaymentAmount,
                    InterestAmount = p.InterestAmount,
                    PrincipalPaidAmount = p.PrincipalPaidAmount,
                    RemainingPrincipal = p.RemainingPrincipal,
                    PaymentMethod = p.PaymentMethod,
                    ReceiptNo = p.ReceiptNo,
                    Remarks = p.Remarks,
                    CollectedByName = p.Collector?.FullName,
                    CreatedAt = p.CreatedAt
                }).ToList()
        };
    }

    private async Task<int> GetValidUserIdAsync()
    {
        int? currentUserId = _currentUserService.UserId;
        if (currentUserId.HasValue && currentUserId.Value > 0)
        {
            var userExists = await _dbContext.Users.AnyAsync(u => u.Id == currentUserId.Value);
            if (userExists) return currentUserId.Value;
        }

        var firstUser = await _dbContext.Users.FirstOrDefaultAsync(u => u.IsActive);
        if (firstUser != null) return firstUser.Id;

        return 1;
    }
}
