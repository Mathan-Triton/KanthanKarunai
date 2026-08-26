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

        // 1. Seed admin user if none exists
        if (!await context.Users.AnyAsync(u => u.Username == "Mathan"))
        {
            var adminUser = new User
            {
                Username = "Mathan",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("Mathan@302"),
                FullName = "Mathan Kumar (Admin)",
                Role = UserRole.Admin,
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            context.Users.Add(adminUser);
            await context.SaveChangesAsync();
        }
    }
}
