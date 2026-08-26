using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using KanthanKarunai.Application.Interfaces;
using KanthanKarunai.Application.Services;
using KanthanKarunai.Application.DTOs;
using KanthanKarunai.Domain.Entities;
using KanthanKarunai.Domain.Enums;
using KanthanKarunai.Infrastructure.Data;
using Xunit;

namespace KanthanKarunai.UnitTests
{
    public class ChitFundTests
    {
        private readonly DbContextOptions<ApplicationDbContext> _dbOptions;
        private readonly IAuditLogService _auditLogService;
        private readonly ICurrentUserService _currentUserService;
        private readonly IPasswordHasher _passwordHasher;
        private readonly INotificationService _notificationService;

        public ChitFundTests()
        {
            _dbOptions = new DbContextOptionsBuilder<ApplicationDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .ConfigureWarnings(w => w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.InMemoryEventId.TransactionIgnoredWarning))
                .Options;
            
            _auditLogService = new MockAuditLogService();
            _currentUserService = new MockCurrentUserService();
            _passwordHasher = new MockPasswordHasher();
            _notificationService = new MockNotificationService();
        }

        private ApplicationDbContext CreateContext() => new ApplicationDbContext(_dbOptions);

        [Fact]
        public async Task CreateCustomer_GeneratesSequentialCustomerCode_AndValidatesDuplicateMobile()
        {
            using var context = CreateContext();
            var service = new CustomerService(context, _auditLogService, _passwordHasher);

            // Test 1: Generate KC0001
            var customerDto1 = new CreateCustomerDto
            {
                Name = "Mathan Kumar",
                MobileNo = "9876543210",
                JoinDate = DateTime.UtcNow
            };
            var customer1 = await service.CreateCustomerAsync(customerDto1);
            Assert.Equal("KC0001", customer1.CustomerCode);
            Assert.Equal("Mathan Kumar", customer1.Name);

            // Test 2: Generate KC0002
            var customerDto2 = new CreateCustomerDto
            {
                Name = "Ravi Kumar",
                MobileNo = "9876543211",
                JoinDate = DateTime.UtcNow
            };
            var customer2 = await service.CreateCustomerAsync(customerDto2);
            Assert.Equal("KC0002", customer2.CustomerCode);

            // Test 3: Validate Duplicate Mobile
            var duplicateDto = new CreateCustomerDto
            {
                Name = "Duplicate Test",
                MobileNo = "9876543210", // Same mobile as Customer 1
                JoinDate = DateTime.UtcNow
            };

            await Assert.ThrowsAsync<ArgumentException>(() => service.CreateCustomerAsync(duplicateDto));
        }

        [Fact]
        public async Task CreateChit_GeneratesCorrectSchedules_ForMonthlyFrequency()
        {
            using var context = CreateContext();
            var customerService = new CustomerService(context, _auditLogService, _passwordHasher);
            var chitService = new ChitService(context, _auditLogService);

            var cust = await customerService.CreateCustomerAsync(new CreateCustomerDto
            {
                Name = "Mathan Kumar",
                MobileNo = "9876543210",
                JoinDate = new DateTime(2026, 6, 1, 0, 0, 0, DateTimeKind.Utc)
            });

            var createChitDto = new CreateChitDto
            {
                CustomerId = cust.Id,
                ChitName = "Mathan ₹100,000 Group",
                PaymentFrequency = PaymentFrequency.MONTHLY,
                PaymentAmount = 5000,
                TotalChitAmount = 100000,
                Duration = 20,
                StartDate = new DateTime(2026, 6, 1, 0, 0, 0, DateTimeKind.Utc)
            };

            var chit = await chitService.CreateChitAsync(createChitDto);

            // Verify Chit details
            Assert.Equal("Mathan ₹100,000 Group", chit.ChitName);
            Assert.Equal(ChitStatus.ACTIVE, chit.Status);
            Assert.Equal(createChitDto.StartDate, chit.StartDate);
            
            // Verify Schedule count matches Duration (20)
            var schedules = await context.PaymentSchedules.Where(s => s.ChitId == chit.Id).OrderBy(s => s.InstallmentNo).ToListAsync();
            Assert.Equal(20, schedules.Count);

            // Verify schedules are spaced monthly
            Assert.Equal(1, schedules[0].InstallmentNo);
            Assert.Equal(new DateTime(2026, 6, 1, 0, 0, 0, DateTimeKind.Utc), schedules[0].DueDate);
            Assert.Equal(5000, schedules[0].ExpectedAmount);

            Assert.Equal(2, schedules[1].InstallmentNo);
            Assert.Equal(new DateTime(2026, 7, 1, 0, 0, 0, DateTimeKind.Utc), schedules[1].DueDate);

            Assert.Equal(20, schedules[19].InstallmentNo);
            Assert.Equal(new DateTime(2028, 1, 1, 0, 0, 0, DateTimeKind.Utc), schedules[19].DueDate);
        }

        [Fact]
        public async Task CreateChit_GeneratesCorrectSchedules_ForDailyAndWeeklyFrequencies()
        {
            using var context = CreateContext();
            var customerService = new CustomerService(context, _auditLogService, _passwordHasher);
            var chitService = new ChitService(context, _auditLogService);

            var cust = await customerService.CreateCustomerAsync(new CreateCustomerDto
            {
                Name = "Daily Weekly Member",
                MobileNo = "9876543212",
                JoinDate = new DateTime(2026, 6, 1, 0, 0, 0, DateTimeKind.Utc)
            });

            // DAILY Chit (e.g. 10 days, 100 per day)
            var dailyChit = await chitService.CreateChitAsync(new CreateChitDto
            {
                CustomerId = cust.Id,
                ChitName = "Daily Group",
                PaymentFrequency = PaymentFrequency.DAILY,
                PaymentAmount = 100,
                TotalChitAmount = 1000,
                Duration = 10,
                StartDate = new DateTime(2026, 6, 1, 0, 0, 0, DateTimeKind.Utc)
            });

            var dailySchedules = await context.PaymentSchedules.Where(s => s.ChitId == dailyChit.Id).OrderBy(s => s.InstallmentNo).ToListAsync();
            Assert.Equal(10, dailySchedules.Count);
            Assert.Equal(new DateTime(2026, 6, 1, 0, 0, 0, DateTimeKind.Utc), dailySchedules[0].DueDate);
            Assert.Equal(new DateTime(2026, 6, 2, 0, 0, 0, DateTimeKind.Utc), dailySchedules[1].DueDate);

            // WEEKLY Chit (e.g. 5 weeks, 1000 per week)
            var weeklyChit = await chitService.CreateChitAsync(new CreateChitDto
            {
                CustomerId = cust.Id,
                ChitName = "Weekly Group",
                PaymentFrequency = PaymentFrequency.WEEKLY,
                PaymentAmount = 1000,
                TotalChitAmount = 5000,
                Duration = 5,
                StartDate = new DateTime(2026, 6, 1, 0, 0, 0, DateTimeKind.Utc)
            });

            var weeklySchedules = await context.PaymentSchedules.Where(s => s.ChitId == weeklyChit.Id).OrderBy(s => s.InstallmentNo).ToListAsync();
            Assert.Equal(5, weeklySchedules.Count);
            Assert.Equal(new DateTime(2026, 6, 1, 0, 0, 0, DateTimeKind.Utc), weeklySchedules[0].DueDate);
            Assert.Equal(new DateTime(2026, 6, 8, 0, 0, 0, DateTimeKind.Utc), weeklySchedules[1].DueDate);
        }

        [Fact]
        public async Task PaymentService_AllocatesPayments_FullPartialAndAdvance()
        {
            using var context = CreateContext();
            var customerService = new CustomerService(context, _auditLogService, _passwordHasher);
            var chitService = new ChitService(context, _auditLogService);
            var paymentService = new PaymentService(context, _currentUserService, _auditLogService, _notificationService);

            var cust = await customerService.CreateCustomerAsync(new CreateCustomerDto
            {
                Name = "Mathan Kumar",
                MobileNo = "9876543210",
                JoinDate = new DateTime(2026, 6, 1, 0, 0, 0, DateTimeKind.Utc)
            });

            var chit = await chitService.CreateChitAsync(new CreateChitDto
            {
                CustomerId = cust.Id,
                ChitName = "Mathan ₹100,000 Group",
                PaymentFrequency = PaymentFrequency.MONTHLY,
                PaymentAmount = 5000,
                TotalChitAmount = 100000,
                Duration = 20,
                StartDate = new DateTime(2026, 6, 1, 0, 0, 0, DateTimeKind.Utc)
            });

            // Month 1: Full Payment (5000)
            var p1 = await paymentService.CreatePaymentAsync(new CreatePaymentDto
            {
                CustomerId = cust.Id,
                ChitId = chit.Id,
                Amount = 5000,
                PaymentMethod = PaymentMethod.CASH,
                PaymentDate = new DateTime(2026, 6, 1, 0, 0, 0, DateTimeKind.Utc)
            });

            // Assert Receipt Number Format (e.g. KC-YYYYMMDD-XXXX)
            var expectedPrefix = $"KC-{DateTime.UtcNow.AddHours(5.5):yyyyMMdd}-";
            Assert.StartsWith(expectedPrefix, p1.ReceiptNo);
            
            // Assert Month 1 schedule status
            var schedule1 = await context.PaymentSchedules.FirstAsync(s => s.ChitId == chit.Id && s.InstallmentNo == 1);
            Assert.Equal(PaymentStatus.PAID, schedule1.Status);
            Assert.Equal(5000, schedule1.PaidAmount);
            Assert.Equal(0, schedule1.PendingAmount);

            // Month 2: Partial Payment (3000)
            await paymentService.CreatePaymentAsync(new CreatePaymentDto
            {
                CustomerId = cust.Id,
                ChitId = chit.Id,
                Amount = 3000,
                PaymentMethod = PaymentMethod.UPI,
                PaymentDate = new DateTime(2026, 7, 1, 0, 0, 0, DateTimeKind.Utc)
            });

            var schedule2 = await context.PaymentSchedules.FirstAsync(s => s.ChitId == chit.Id && s.InstallmentNo == 2);
            Assert.Equal(PaymentStatus.PARTIAL, schedule2.Status);
            Assert.Equal(3000, schedule2.PaidAmount);
            Assert.Equal(2000, schedule2.PendingAmount);

            // Month 3: Overflow Payment (8000)
            // This should cover the pending 2000 of Month 2, fully pay Month 3 (5000), and leave 1000 advance in Month 4!
            await paymentService.CreatePaymentAsync(new CreatePaymentDto
            {
                CustomerId = cust.Id,
                ChitId = chit.Id,
                Amount = 8000,
                PaymentMethod = PaymentMethod.BANK_TRANSFER,
                PaymentDate = new DateTime(2026, 8, 1, 0, 0, 0, DateTimeKind.Utc)
            });

            // Verify Month 2 is now PAID
            schedule2 = await context.PaymentSchedules.FirstAsync(s => s.ChitId == chit.Id && s.InstallmentNo == 2);
            Assert.Equal(PaymentStatus.PAID, schedule2.Status);
            Assert.Equal(5000, schedule2.PaidAmount);
            Assert.Equal(0, schedule2.PendingAmount);

            // Verify Month 3 is PAID
            var schedule3 = await context.PaymentSchedules.FirstAsync(s => s.ChitId == chit.Id && s.InstallmentNo == 3);
            Assert.Equal(PaymentStatus.PAID, schedule3.Status);
            Assert.Equal(5000, schedule3.PaidAmount);
            Assert.Equal(0, schedule3.PendingAmount);

            // Verify Month 4 has PARTIAL status with 1000 paid and 4000 pending
            var schedule4 = await context.PaymentSchedules.FirstAsync(s => s.ChitId == chit.Id && s.InstallmentNo == 4);
            Assert.Equal(PaymentStatus.PARTIAL, schedule4.Status);
            Assert.Equal(1000, schedule4.PaidAmount);
            Assert.Equal(4000, schedule4.PendingAmount);
        }

        [Fact]
        public async Task PayoutService_CalculatesNetPayout_AndDeductions()
        {
            using var context = CreateContext();
            var customerService = new CustomerService(context, _auditLogService, _passwordHasher);
            var chitService = new ChitService(context, _auditLogService);
            var payoutService = new PayoutService(context, _currentUserService, _auditLogService);

            var cust = await customerService.CreateCustomerAsync(new CreateCustomerDto
            {
                Name = "Mathan Kumar",
                MobileNo = "9876543210",
                JoinDate = new DateTime(2026, 6, 1, 0, 0, 0, DateTimeKind.Utc)
            });

            var chit = await chitService.CreateChitAsync(new CreateChitDto
            {
                CustomerId = cust.Id,
                ChitName = "Mathan ₹100,000 Group",
                PaymentFrequency = PaymentFrequency.MONTHLY,
                PaymentAmount = 5000,
                TotalChitAmount = 100000,
                Duration = 20,
                StartDate = new DateTime(2026, 6, 1, 0, 0, 0, DateTimeKind.Utc)
            });

            var payoutDto = new CreateChitPayoutDto
            {
                CustomerId = cust.Id,
                ChitId = chit.Id,
                PayoutDate = new DateTime(2026, 8, 1, 0, 0, 0, DateTimeKind.Utc),
                GrossAmount = 100000,
                DeductionAmount = 5000,
                OtherCharges = 1000,
                PaymentMethod = PaymentMethod.BANK_TRANSFER,
                ReferenceNo = "TXN998877",
                Notes = "Winner in auction Month 3"
            };

            var payout = await payoutService.CreatePayoutAsync(payoutDto);

            // Assert Net Amount = Gross (100000) - Deduction (5000) - Other (1000) = 94000
            Assert.Equal(94000, payout.NetAmount);
            Assert.Equal(5000, payout.DeductionAmount);
            Assert.Equal(1000, payout.OtherCharges);
            Assert.Equal("TXN998877", payout.ReferenceNo);
            
            // Verify payout record exists in db
            var dbPayout = await context.ChitPayouts.FirstAsync(p => p.Id == payout.Id);
            Assert.Equal(94000, dbPayout.NetAmount);
        }

        // Dummy services for dependencies
        private class MockAuditLogService : IAuditLogService
        {
            public Task LogAsync(string action, string tableName, string recordId, object? oldValue, object? newValue)
            {
                return Task.CompletedTask;
            }
        }

        private class MockCurrentUserService : ICurrentUserService
        {
            public int? UserId => 1;
            public string? Username => "admin";
            public string? Role => "ADMIN";
        }

        private class MockPasswordHasher : IPasswordHasher
        {
            public string HashPassword(string password) => password;
            public bool VerifyPassword(string password, string hashedPassword) => password == hashedPassword;
        }

        private class MockNotificationService : INotificationService
        {
            public Task SendChitPaymentNotificationAsync(int customerId, int paymentId, string customerName, string mobileNo, decimal amount, string paymentMonth) => Task.CompletedTask;
            public Task SendLoanPaymentNotificationAsync(int customerId, int loanPaymentId, string customerName, string mobileNo, decimal amount, string paymentMonth, decimal remainingBalance) => Task.CompletedTask;
            public Task<IEnumerable<NotificationLogDto>> GetNotificationLogsAsync(int? customerId = null) => Task.FromResult(Enumerable.Empty<NotificationLogDto>());
        }
    }
}
