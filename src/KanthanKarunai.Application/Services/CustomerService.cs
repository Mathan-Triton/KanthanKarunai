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

public class CustomerService : ICustomerService
{
    private readonly IApplicationDbContext _dbContext;
    private readonly IAuditLogService _auditLogService;
    private readonly IPasswordHasher _passwordHasher;

    public CustomerService(IApplicationDbContext dbContext, IAuditLogService auditLogService, IPasswordHasher passwordHasher)
    {
        _dbContext = dbContext;
        _auditLogService = auditLogService;
        _passwordHasher = passwordHasher;
    }


    public async Task<(IEnumerable<CustomerDto> Customers, int TotalCount)> GetCustomersAsync(
        string? query, string? status, string? frequency, int page, int pageSize)
    {
        var dbQuery = _dbContext.Customers.AsQueryable();

        if (!string.IsNullOrWhiteSpace(query))
        {
            var lowerQuery = query.ToLower();
            dbQuery = dbQuery.Where(c => c.Name.ToLower().Contains(lowerQuery) 
                                         || c.MobileNo.Contains(lowerQuery)
                                         || c.CustomerCode.ToLower().Contains(lowerQuery));
        }

        if (!string.IsNullOrWhiteSpace(status))
        {
            dbQuery = dbQuery.Where(c => c.Status == status);
        }

        if (!string.IsNullOrWhiteSpace(frequency))
        {
            // Filter customers based on whether they have any active chit with the given frequency
            dbQuery = dbQuery.Where(c => c.Chits.Any(ch => ch.PaymentFrequency.ToString() == frequency && ch.Status == Domain.Enums.ChitStatus.ACTIVE));
        }

        int totalCount = await dbQuery.CountAsync();

        var customers = await dbQuery
            .OrderBy(c => c.CustomerCode)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(c => new CustomerDto
            {
                Id = c.Id,
                CustomerCode = c.CustomerCode,
                Name = c.Name,
                MobileNo = c.MobileNo,
                AlternativeMobile = c.AlternativeMobile,
                Address = c.Address,
                City = c.City,
                AadhaarNumber = c.AadhaarNumber,
                JoinDate = c.JoinDate,
                Status = c.Status,
                IsActive = c.IsActive,
                ActiveChitCount = c.Chits.Count(ch => ch.Status == Domain.Enums.ChitStatus.ACTIVE),
                PendingAmount = c.PaymentSchedules.Sum(ps => ps.PendingAmount)
            })
            .ToListAsync();

        return (customers, totalCount);
    }

    public async Task<CustomerDto?> GetCustomerByIdAsync(int id)
    {
        var c = await _dbContext.Customers
            .Include(c => c.Chits)
            .Include(c => c.PaymentSchedules)
            .FirstOrDefaultAsync(c => c.Id == id);

        if (c == null) return null;

        return new CustomerDto
        {
            Id = c.Id,
            CustomerCode = c.CustomerCode,
            Name = c.Name,
            MobileNo = c.MobileNo,
            AlternativeMobile = c.AlternativeMobile,
            Address = c.Address,
            City = c.City,
            AadhaarNumber = c.AadhaarNumber,
            JoinDate = c.JoinDate,
            Status = c.Status,
            IsActive = c.IsActive,
            ActiveChitCount = c.Chits.Count(ch => ch.Status == Domain.Enums.ChitStatus.ACTIVE),
            PendingAmount = c.PaymentSchedules.Sum(ps => ps.PendingAmount)
        };
    }

    public async Task<CustomerDto> CreateCustomerAsync(CreateCustomerDto dto)
    {
        // 1. Mobile number validation
        var cleanMobile = dto.MobileNo?.Trim().Replace(" ", "").Replace("-", "") ?? "";
        if (cleanMobile.Length < 10)
        {
            throw new ArgumentException("Mobile number must be at least 10 digits.");
        }

        // Aadhaar validation if provided
        string? cleanAadhaar = null;
        if (!string.IsNullOrWhiteSpace(dto.AadhaarNumber))
        {
            cleanAadhaar = dto.AadhaarNumber.Trim().Replace(" ", "").Replace("-", "");
            if (cleanAadhaar.Length != 12 || !cleanAadhaar.All(char.IsDigit))
            {
                throw new ArgumentException("Aadhaar number must be a valid 12-digit number.");
            }
        }

        var exists = await _dbContext.Customers.AnyAsync(c => c.MobileNo == dto.MobileNo);
        if (exists)
        {
            throw new ArgumentException($"A customer with mobile number {dto.MobileNo} already exists.");
        }

        if (cleanAadhaar != null && await _dbContext.Customers.AnyAsync(c => c.AadhaarNumber == cleanAadhaar))
        {
            throw new ArgumentException($"A customer with Aadhaar number {dto.AadhaarNumber} already exists.");
        }

        // 2. Generate Customer Code
        var lastCustomer = await _dbContext.Customers.OrderByDescending(c => c.Id).FirstOrDefaultAsync();
        int nextNum = 1;
        if (lastCustomer != null && lastCustomer.CustomerCode.StartsWith("KC"))
        {
            if (int.TryParse(lastCustomer.CustomerCode.Substring(2), out var lastNum))
            {
                nextNum = lastNum + 1;
            }
        }
        string customerCode = $"KC{nextNum:D4}";

        while (await _dbContext.Customers.AnyAsync(c => c.CustomerCode == customerCode))
        {
            nextNum++;
            customerCode = $"KC{nextNum:D4}";
        }

        var customer = new Customer
        {
            CustomerCode = customerCode,
            Name = dto.Name.Trim(),
            MobileNo = dto.MobileNo.Trim(),
            AlternativeMobile = dto.AlternativeMobile?.Trim(),
            Address = dto.Address?.Trim(),
            City = dto.City?.Trim(),
            AadhaarNumber = cleanAadhaar,
            JoinDate = dto.JoinDate.ToUniversalTime(),
            Status = "ACTIVE",
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _dbContext.Customers.Add(customer);
        await _dbContext.SaveChangesAsync();

        // Audit Log
        await _auditLogService.LogAsync("Customer Created", "customers", customer.Id.ToString(), null, customer);

        string? tempPassword = null;
        if (dto.CreateUserAccount)
        {
            var userExists = await _dbContext.Users.AnyAsync(u => u.Username == dto.MobileNo);
            if (userExists)
            {
                throw new ArgumentException($"A user with username {dto.MobileNo} already exists.");
            }

            tempPassword = !string.IsNullOrWhiteSpace(dto.UserPassword) 
                ? dto.UserPassword 
                : $"KC{new Random().Next(100000, 999999)}";

            var user = new User
            {
                Username = dto.MobileNo,
                PasswordHash = _passwordHasher.HashPassword(tempPassword),
                FullName = dto.Name,
                Role = UserRole.Customer,
                CustomerId = customer.Id,
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _dbContext.Users.Add(user);
            await _dbContext.SaveChangesAsync();

            await _auditLogService.LogAsync("User Created", "users", user.Id.ToString(), null, user);
        }

        // 3. Optional automatic Chit creation upon customer creation
        if (!string.IsNullOrWhiteSpace(dto.ChitName))
        {
            if (string.IsNullOrWhiteSpace(dto.PaymentFrequency) || !dto.PaymentAmount.HasValue || !dto.TotalChitAmount.HasValue || !dto.Duration.HasValue || !dto.StartDate.HasValue)
            {
                throw new ArgumentException("Chit details (Frequency, Amount, Total Amount, Duration, Start Date) are required when creating a chit.");
            }

            if (!Enum.TryParse<PaymentFrequency>(dto.PaymentFrequency, true, out var frequencyVal))
            {
                throw new ArgumentException($"Invalid Payment Frequency: {dto.PaymentFrequency}. Allowed values: DAILY, WEEKLY, MONTHLY");
            }

            DateTime endDate = dto.StartDate.Value;
            switch (frequencyVal)
            {
                case PaymentFrequency.DAILY:
                    endDate = dto.StartDate.Value.AddDays(dto.Duration.Value - 1);
                    break;
                case PaymentFrequency.WEEKLY:
                    endDate = dto.StartDate.Value.AddDays((dto.Duration.Value - 1) * 7);
                    break;
                case PaymentFrequency.MONTHLY:
                    endDate = dto.StartDate.Value.AddMonths(dto.Duration.Value - 1);
                    break;
            }

            var chit = new Chit
            {
                CustomerId = customer.Id,
                ChitName = dto.ChitName,
                PaymentFrequency = frequencyVal,
                PaymentAmount = dto.PaymentAmount.Value,
                TotalChitAmount = dto.TotalChitAmount.Value,
                Duration = dto.Duration.Value,
                StartDate = dto.StartDate.Value.ToUniversalTime(),
                EndDate = endDate.ToUniversalTime(),
                Status = ChitStatus.ACTIVE,
                Notes = dto.ChitNotes,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _dbContext.Chits.Add(chit);
            await _dbContext.SaveChangesAsync();

            var schedules = new List<PaymentSchedule>();
            for (int i = 1; i <= dto.Duration.Value; i++)
            {
                DateTime dueDate = dto.StartDate.Value;
                switch (frequencyVal)
                {
                    case PaymentFrequency.DAILY:
                        dueDate = dto.StartDate.Value.AddDays(i - 1);
                        break;
                    case PaymentFrequency.WEEKLY:
                        dueDate = dto.StartDate.Value.AddDays((i - 1) * 7);
                        break;
                    case PaymentFrequency.MONTHLY:
                        dueDate = dto.StartDate.Value.AddMonths(i - 1);
                        break;
                }

                schedules.Add(new PaymentSchedule
                {
                    ChitId = chit.Id,
                    CustomerId = customer.Id,
                    InstallmentNo = i,
                    DueDate = dueDate.ToUniversalTime(),
                    ExpectedAmount = dto.PaymentAmount.Value,
                    PaidAmount = 0,
                    PendingAmount = dto.PaymentAmount.Value,
                    AdvanceAmount = 0,
                    Status = PaymentStatus.PENDING,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                });
            }

            _dbContext.PaymentSchedules.AddRange(schedules);
            await _dbContext.SaveChangesAsync();

            await _auditLogService.LogAsync("Chit Created during Customer addition", "chits", chit.Id.ToString(), null, chit);
        }

        return new CustomerDto
        {
            Id = customer.Id,
            CustomerCode = customer.CustomerCode,
            Name = customer.Name,
            MobileNo = customer.MobileNo,
            AlternativeMobile = customer.AlternativeMobile,
            Address = customer.Address,
            City = customer.City,
            AadhaarNumber = customer.AadhaarNumber,
            JoinDate = customer.JoinDate,
            Status = customer.Status,
            IsActive = customer.IsActive,
            TemporaryPassword = tempPassword
        };
    }

    public async Task<CustomerDto?> UpdateCustomerAsync(int id, UpdateCustomerDto dto)
    {
        var customer = await _dbContext.Customers.FindAsync(id);
        if (customer == null) return null;

        var cleanMobile = dto.MobileNo?.Trim().Replace(" ", "").Replace("-", "") ?? "";
        if (cleanMobile.Length < 10)
        {
            throw new ArgumentException("Mobile number must be at least 10 digits.");
        }

        string? cleanAadhaar = null;
        if (!string.IsNullOrWhiteSpace(dto.AadhaarNumber))
        {
            cleanAadhaar = dto.AadhaarNumber.Trim().Replace(" ", "").Replace("-", "");
            if (cleanAadhaar.Length != 12 || !cleanAadhaar.All(char.IsDigit))
            {
                throw new ArgumentException("Aadhaar number must be a valid 12-digit number.");
            }
        }

        // Check if mobile number is being changed, and validate uniqueness
        if (customer.MobileNo != dto.MobileNo)
        {
            var exists = await _dbContext.Customers.AnyAsync(c => c.MobileNo == dto.MobileNo && c.Id != id);
            if (exists)
            {
                throw new ArgumentException($"A customer with mobile number {dto.MobileNo} already exists.");
            }
        }

        if (cleanAadhaar != null && await _dbContext.Customers.AnyAsync(c => c.AadhaarNumber == cleanAadhaar && c.Id != id))
        {
            throw new ArgumentException($"A customer with Aadhaar number {dto.AadhaarNumber} already exists.");
        }

        var oldValue = new
        {
            customer.Name,
            customer.MobileNo,
            customer.AlternativeMobile,
            customer.Address,
            customer.City,
            customer.AadhaarNumber,
            customer.JoinDate,
            customer.Status,
            customer.IsActive
        };

        customer.Name = dto.Name.Trim();
        customer.MobileNo = dto.MobileNo.Trim();
        customer.AlternativeMobile = dto.AlternativeMobile?.Trim();
        customer.Address = dto.Address?.Trim();
        customer.City = dto.City?.Trim();
        customer.AadhaarNumber = cleanAadhaar;
        customer.JoinDate = dto.JoinDate.ToUniversalTime();
        customer.Status = dto.Status;
        customer.IsActive = dto.Status == "ACTIVE";
        customer.UpdatedAt = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync();

        // Audit Log
        await _auditLogService.LogAsync("Customer Updated", "customers", customer.Id.ToString(), oldValue, customer);

        return new CustomerDto
        {
            Id = customer.Id,
            CustomerCode = customer.CustomerCode,
            Name = customer.Name,
            MobileNo = customer.MobileNo,
            AlternativeMobile = customer.AlternativeMobile,
            Address = customer.Address,
            City = customer.City,
            AadhaarNumber = customer.AadhaarNumber,
            JoinDate = customer.JoinDate,
            Status = customer.Status,
            IsActive = customer.IsActive
        };
    }

    public async Task<bool> DeactivateCustomerAsync(int id)
    {
        var customer = await _dbContext.Customers.FindAsync(id);
        if (customer == null) return false;

        var oldValue = new { customer.Status, customer.IsActive };
        customer.Status = "INACTIVE";
        customer.IsActive = false;
        customer.UpdatedAt = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync();

        await _auditLogService.LogAsync("Customer Deactivated", "customers", customer.Id.ToString(), oldValue, new { customer.Status, customer.IsActive });
        return true;
    }
}
