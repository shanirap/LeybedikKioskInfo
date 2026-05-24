using LeybedikInfoKiosk.Server.Data;
using LeybedikInfoKiosk.Server.Models;
using LeybedikInfoKiosk.Server.Security;
using LeybedikInfoKiosk.Server.Services;
using Microsoft.AspNetCore.Hosting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace LeybedikInfoKiosk.Server.Tests;

public class BootstrapAdminServiceTests
{
    [Fact]
    public async Task CreatesAdmin_WhenEnabledAndNoAdminExists()
    {
        await using var db = CreateDbContext();
        var service = CreateService(
            db,
            new Dictionary<string, string?>
            {
                ["BootstrapAdmin:Enabled"] = "true",
                ["BootstrapAdmin:Email"] = "  pilot@example.com ",
                ["BootstrapAdmin:FullName"] = "Pilot Admin",
                ["BootstrapAdmin:Password"] = "Password123!",
            },
            environmentName: Environments.Production);

        var outcome = await service.TryBootstrapAsync();

        Assert.Equal(BootstrapAdminOutcome.Created, outcome);
        var admin = Assert.Single(db.Users);
        Assert.Equal(UserRole.Admin, admin.Role);
        Assert.Equal("pilot@example.com", admin.Email);
        Assert.Equal("Pilot Admin", admin.FullName);
        Assert.True(PasswordHasher.VerifyPassword(admin.PasswordHash, "Password123!"));
    }

    [Fact]
    public async Task DoesNotCreateAdmin_WhenDisabled()
    {
        await using var db = CreateDbContext();
        var service = CreateService(
            db,
            new Dictionary<string, string?>
            {
                ["BootstrapAdmin:Enabled"] = "false",
                ["BootstrapAdmin:Email"] = "pilot@example.com",
                ["BootstrapAdmin:FullName"] = "Pilot Admin",
                ["BootstrapAdmin:Password"] = "Password123!",
            },
            environmentName: Environments.Production);

        var outcome = await service.TryBootstrapAsync();

        Assert.Equal(BootstrapAdminOutcome.SkippedDisabled, outcome);
        Assert.Empty(db.Users);
    }

    [Fact]
    public async Task DoesNotCreateAdmin_WhenAdminAlreadyExists()
    {
        await using var db = CreateDbContext();
        db.Users.Add(new User
        {
            FullName = "Existing Admin",
            Email = "admin@example.com",
            PasswordHash = PasswordHasher.HashPassword("Admin123!"),
            Role = UserRole.Admin,
            IsActive = true,
            CreatedAtUtc = DateTime.UtcNow,
        });
        await db.SaveChangesAsync();

        var service = CreateService(
            db,
            new Dictionary<string, string?>
            {
                ["BootstrapAdmin:Enabled"] = "true",
                ["BootstrapAdmin:Email"] = "pilot@example.com",
                ["BootstrapAdmin:FullName"] = "Pilot Admin",
                ["BootstrapAdmin:Password"] = "Password123!",
            },
            environmentName: Environments.Production);

        var outcome = await service.TryBootstrapAsync();

        Assert.Equal(BootstrapAdminOutcome.SkippedAdminExists, outcome);
        Assert.Single(db.Users);
    }

    [Fact]
    public async Task DoesNotCreateAdmin_InDevelopment()
    {
        await using var db = CreateDbContext();
        var service = CreateService(
            db,
            new Dictionary<string, string?>
            {
                ["BootstrapAdmin:Enabled"] = "true",
                ["BootstrapAdmin:Email"] = "pilot@example.com",
                ["BootstrapAdmin:FullName"] = "Pilot Admin",
                ["BootstrapAdmin:Password"] = "Password123!",
            },
            environmentName: Environments.Development);

        var outcome = await service.TryBootstrapAsync();

        Assert.Equal(BootstrapAdminOutcome.SkippedDevelopment, outcome);
        Assert.Empty(db.Users);
    }

    private static BootstrapAdminService CreateService(
        AppDbContext db,
        Dictionary<string, string?> settings,
        string environmentName)
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(settings)
            .Build();

        var environment = new TestWebHostEnvironment { EnvironmentName = environmentName };
        return new BootstrapAdminService(
            db,
            configuration,
            environment,
            NullLogger<BootstrapAdminService>.Instance);
    }

    private static AppDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase($"BootstrapAdminTests-{Guid.NewGuid():N}")
            .Options;
        return new AppDbContext(options);
    }

    private sealed class TestWebHostEnvironment : IWebHostEnvironment
    {
        public TestWebHostEnvironment()
        {
            var root = AppContext.BaseDirectory;
            ContentRootFileProvider = new PhysicalFileProvider(root);
            WebRootFileProvider = new PhysicalFileProvider(root);
        }

        public string EnvironmentName { get; set; } = Environments.Production;
        public string ApplicationName { get; set; } = "LeybedikInfoKiosk.Server.Tests";
        public string WebRootPath { get; set; } = string.Empty;
        public string ContentRootPath { get; set; } = string.Empty;
        public IFileProvider WebRootFileProvider { get; set; }
        public IFileProvider ContentRootFileProvider { get; set; }
    }
}
