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

        [Fact]
        public async Task ChitAmountTaken_CalculatesAdjustedDues_ExactScenario()
        {
            using var context = CreateContext();
            var customerService = new CustomerService(context, _auditLogService, _passwordHasher);
            var chitService = new ChitService(context, _auditLogService);
            var paymentService = new PaymentService(context, _currentUserService, _auditLogService, _notificationService);

            // 1. Customer: Mathan Kumar
            var cust = await customerService.CreateCustomerAsync(new CreateCustomerDto
            {
                Name = "Mathan Kumar",
                MobileNo = "9876543210",
                JoinDate = new DateTime(2026, 6, 1, 0, 0, 0, DateTimeKind.Utc)
            });

            // 2. Chit Package: ₹100,000, 20 months, Monthly ₹5,000
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

            // 3. First 4 Months: ₹5,000 paid each month
            for (int month = 1; month <= 4; month++)
            {
                await paymentService.CreatePaymentAsync(new CreatePaymentDto
                {
                    CustomerId = cust.Id,
                    ChitId = chit.Id,
                    Amount = 5000,
                    PaymentMethod = PaymentMethod.CASH,
                    PaymentDate = new DateTime(2026, 5 + month, 1, 0, 0, 0, DateTimeKind.Utc)
                });
            }

            // Verify first 4 months are fully paid
            var schedulesBefore = await context.PaymentSchedules.Where(s => s.ChitId == chit.Id).OrderBy(s => s.InstallmentNo).ToListAsync();
            Assert.All(schedulesBefore.Take(4), s => Assert.Equal(PaymentStatus.PAID, s.Status));
            Assert.All(schedulesBefore.Take(4), s => Assert.Equal(5000, s.PaidAmount));

            // 4. Month 4: Mathan Kumar takes ₹1,00,000
            var updatedChit = await chitService.RecordAmountTakenAsync(new RecordAmountTakenDto
            {
                ChitId = chit.Id,
                AmountTaken = 100000,
                AmountTakenMonth = 4,
                AmountTakenDate = new DateTime(2026, 9, 26, 0, 0, 0, DateTimeKind.Utc),
                InterestRate = 1.0m
            });

            // Verify Adjusted Monthly Payment is ₹6,000 (₹5,000 + 1% of ₹1,00,000)
            Assert.Equal(6000m, updatedChit.AdjustedMonthlyPayment);
            Assert.Equal(100000m, updatedChit.AmountTaken);
            Assert.Equal(4, updatedChit.AmountTakenMonth);
            Assert.Equal(4, updatedChit.CompletedMonths);
            Assert.Equal(16, updatedChit.RemainingMonths);
            Assert.Equal(6000m, updatedChit.CurrentMonthlyDue);
            Assert.Equal(6000m, updatedChit.NextPaymentAmount);

            // 5. Verify Remaining Collection = 16 * ₹6,000 = ₹96,000
            Assert.Equal(96000m, updatedChit.RemainingCollection);

            // 6. Verify Schedule breakdown:
            // Months 1..4: Expected = ₹5,000
            // Months 5..20: Expected = ₹6,000
            var scheduleDetails = (await chitService.GetScheduleAsync(chit.Id)).ToList();
            for (int i = 0; i < 4; i++)
            {
                Assert.Equal(5000m, scheduleDetails[i].ExpectedAmount);
                Assert.Equal(5000m, scheduleDetails[i].NormalDue);
                Assert.Equal(0m, scheduleDetails[i].InterestPortion);
                Assert.Equal(PaymentStatus.PAID, scheduleDetails[i].Status);
            }

            for (int i = 4; i < 20; i++)
            {
                Assert.Equal(6000m, scheduleDetails[i].ExpectedAmount);
                Assert.Equal(5000m, scheduleDetails[i].NormalDue);
                Assert.Equal(1000m, scheduleDetails[i].InterestPortion); // 1% interest = ₹1,000
                Assert.Equal(PaymentStatus.PENDING, scheduleDetails[i].Status);
            }

            // Verify Month 4 specific Amount Taken info
            Assert.Equal("₹1,00,000", scheduleDetails[3].AmountTakenInfo);
            Assert.Equal("Yes", scheduleDetails[4].AmountTakenInfo);
        }

        [Fact]
        public async Task CustomerSummary_CalculatesSeparatedAmounts_ExactScenario()
        {
            using var context = CreateContext();
            var customerService = new CustomerService(context, _auditLogService, _passwordHasher);
            var chitService = new ChitService(context, _auditLogService);
            var paymentService = new PaymentService(context, _currentUserService, _auditLogService, _notificationService);

            // 1. Customer: Mathan Kumar
            var cust = await customerService.CreateCustomerAsync(new CreateCustomerDto
            {
                Name = "Mathan Kumar",
                MobileNo = "9876543210",
                JoinDate = new DateTime(2026, 6, 1, 0, 0, 0, DateTimeKind.Utc)
            });

            // 2. Chit Package: ₹100,000, 20 months, Monthly ₹5,000
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

            // 3. Months 1–4: ₹5,000 paid each month
            for (int month = 1; month <= 4; month++)
            {
                await paymentService.CreatePaymentAsync(new CreatePaymentDto
                {
                    CustomerId = cust.Id,
                    ChitId = chit.Id,
                    Amount = 5000,
                    PaymentMethod = PaymentMethod.CASH,
                    PaymentDate = new DateTime(2026, 5 + month, 1, 0, 0, 0, DateTimeKind.Utc)
                });
            }

            // 4. Month 4: Mathan Kumar takes ₹100,000
            await chitService.RecordAmountTakenAsync(new RecordAmountTakenDto
            {
                ChitId = chit.Id,
                AmountTaken = 100000,
                AmountTakenMonth = 4,
                AmountTakenDate = new DateTime(2026, 9, 26, 0, 0, 0, DateTimeKind.Utc),
                InterestRate = 1.0m
            });

            // 5. Month 5: Mathan Kumar pays ₹5,000 (towards ₹6,000 due)
            await paymentService.CreatePaymentAsync(new CreatePaymentDto
            {
                CustomerId = cust.Id,
                ChitId = chit.Id,
                Amount = 5000,
                PaymentMethod = PaymentMethod.CASH,
                PaymentDate = new DateTime(2026, 10, 1, 0, 0, 0, DateTimeKind.Utc)
            });

            // 6. Get Customer Summary
            var summary = await customerService.GetCustomerSummaryAsync(cust.Id);
            Assert.NotNull(summary);

            // Assert Chit Information
            Assert.Equal(100000m, summary.ChitAmount);
            Assert.Equal(100000m, summary.AmountTaken);
            Assert.Equal(4, summary.AmountTakenMonth);
            Assert.Equal(5000m, summary.OriginalMonthlyPayment);
            Assert.Equal(6000m, summary.CurrentMonthlyPayment);

            // Assert Total Paid is only the sum of payments (4 * 5000 + 5000 = 25000), Amount Taken is NOT added
            Assert.Equal(25000m, summary.TotalPaidAmount);

            // Assert Current Month Payments (Month 5 expected 6000, paid 5000, pending 1000)
            Assert.Equal(5000m, summary.PaidThisMonth);
            Assert.Equal(1000m, summary.PendingThisMonth);

            // Assert Remaining
            Assert.Equal(16, summary.RemainingMonths);
            Assert.Equal(91000m, summary.CurrentPendingAmount); // 1000 pending in M5 + 15 * 6000 = 91000

            // Assert Payment History Breakdown
            Assert.Equal(20, summary.PaymentHistory.Count);
            for (int i = 0; i < 4; i++)
            {
                Assert.Equal(5000m, summary.PaymentHistory[i].Expected);
                Assert.Equal(5000m, summary.PaymentHistory[i].Paid);
                Assert.Equal(0m, summary.PaymentHistory[i].Pending);
                Assert.Equal("PAID", summary.PaymentHistory[i].Status);
            }

            // Month 5
            Assert.Equal(6000m, summary.PaymentHistory[4].Expected);
            Assert.Equal(5000m, summary.PaymentHistory[4].Paid);
            Assert.Equal(1000m, summary.PaymentHistory[4].Pending);
            Assert.Equal("PARTIAL", summary.PaymentHistory[4].Status);

            // Months 6..20
            for (int i = 5; i < 20; i++)
            {
                Assert.Equal(6000m, summary.PaymentHistory[i].Expected);
                Assert.Equal(0m, summary.PaymentHistory[i].Paid);
                Assert.Equal(6000m, summary.PaymentHistory[i].Pending);
            }
        }

        [Fact]
        public async Task PendingPaymentsSummary_ShowsAdjustedMonthlyAndUpcomingInstallment()
        {
            using var context = CreateContext();
            var customerService = new CustomerService(context, _auditLogService, _passwordHasher);
            var chitService = new ChitService(context, _auditLogService);
            var paymentService = new PaymentService(context, _currentUserService, _auditLogService, _notificationService);

            // 1. Customer: Arun Kumar
            var cust = await customerService.CreateCustomerAsync(new CreateCustomerDto
            {
                Name = "Arun Kumar",
                MobileNo = "8428220802",
                JoinDate = new DateTime(2026, 8, 1, 0, 0, 0, DateTimeKind.Utc)
            });

            // 2. Chit Package: ₹100,000, 20 months, Monthly ₹5,000
            var chit = await chitService.CreateChitAsync(new CreateChitDto
            {
                CustomerId = cust.Id,
                ChitName = "Arun Kumar - ₹1,00,000 Chit",
                PaymentFrequency = PaymentFrequency.MONTHLY,
                PaymentAmount = 5000,
                TotalChitAmount = 100000,
                Duration = 20,
                StartDate = new DateTime(2026, 8, 1, 0, 0, 0, DateTimeKind.Utc)
            });

            // 3. Month 1 Paid ₹5,000
            await paymentService.CreatePaymentAsync(new CreatePaymentDto
            {
                CustomerId = cust.Id,
                ChitId = chit.Id,
                Amount = 5000,
                PaymentMethod = PaymentMethod.CASH,
                PaymentDate = new DateTime(2026, 8, 1, 0, 0, 0, DateTimeKind.Utc)
            });

            // 4. Record Amount Taken ₹100,000 in Month 1
            await chitService.RecordAmountTakenAsync(new RecordAmountTakenDto
            {
                ChitId = chit.Id,
                AmountTaken = 100000,
                AmountTakenMonth = 1,
                AmountTakenDate = new DateTime(2026, 8, 26, 0, 0, 0, DateTimeKind.Utc),
                InterestRate = 1.0m
            });

            // 5. Query Pending Payments Summary
            var summaries = (await paymentService.GetCustomerPendingPaymentsSummaryAsync(null)).ToList();
            var arunSummary = summaries.FirstOrDefault(s => s.CustomerId == cust.Id);
            Assert.NotNull(arunSummary);

            // Assert Monthly Payment is ₹6,000 (after 1% interest on amount taken)
            Assert.Equal(6000m, arunSummary.MonthlyPayment);

            // Assert Total Paid is ₹5,000
            Assert.Equal(5000m, arunSummary.TotalPaidAmount);

            // Assert Total Pending is ₹114,000 (19 remaining months * ₹6,000)
            Assert.Equal(114000m, arunSummary.TotalPendingAmount);

            // Assert Upcoming Month Payment is the upcoming single month installment: ₹6,000 (NOT ₹114,000!)
            Assert.Equal(6000m, arunSummary.UpcomingMonthPayment);
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
