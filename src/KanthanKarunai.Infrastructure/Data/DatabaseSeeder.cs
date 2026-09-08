using System;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using KanthanKarunai.Domain.Entities;
using KanthanKarunai.Domain.Enums;

namespace KanthanKarunai.Infrastructure.Data;

public static class DatabaseSeeder
{
    public static async Task SeedAsync(ApplicationDbContext context)
    {
        // Apply pending migrations automatically
        await context.Database.MigrateAsync();

        // 1. Seed or ensure Admin user (Username: Admin / Password: Admin@123)
        var adminUser = await context.Users.FirstOrDefaultAsync(u => u.Username.ToLower() == "admin");
        if (adminUser == null)
        {
            adminUser = new User
            {
                Username = "Admin",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("Admin@123"),
                FullName = "System Administrator",
                Role = UserRole.Admin,
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            context.Users.Add(adminUser);
            await context.SaveChangesAsync();
        }
        else
        {
            adminUser.PasswordHash = BCrypt.Net.BCrypt.HashPassword("Admin@123");
            adminUser.IsActive = true;
            adminUser.Role = UserRole.Admin;
            await context.SaveChangesAsync();
        }
    }
}
