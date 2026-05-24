using LeybedikInfoKiosk.Server.Data;
using LeybedikInfoKiosk.Server.Models;
using LeybedikInfoKiosk.Server.Security;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace LeybedikInfoKiosk.Server.Tests;

public class TestApplicationFactory : WebApplicationFactory<Program>
{
    private readonly string _databaseName = $"LeybedikTests-{Guid.NewGuid():N}";
    private readonly string? _storageRootPath;

    public TestApplicationFactory(string? storageRootPath = null)
    {
        _storageRootPath = storageRootPath;
        Environment.SetEnvironmentVariable("Jwt__Secret", "test-secret-key-for-api-tests-32chars");
        Environment.SetEnvironmentVariable("Jwt__Issuer", "LeybedikInfoKiosk");
        Environment.SetEnvironmentVariable("Jwt__Audience", "LeybedikInfoKioskClient");
        Environment.SetEnvironmentVariable("Jwt__ExpiryMinutes", "120");
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        builder.ConfigureAppConfiguration((_, config) =>
        {
            config.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Jwt:Secret"] = "test-secret-key-for-api-tests-32chars",
                ["Jwt:Issuer"] = "LeybedikInfoKiosk",
                ["Jwt:Audience"] = "LeybedikInfoKioskClient",
                ["Jwt:ExpiryMinutes"] = "120",
                ["Cors:AllowedOrigins:0"] = "http://localhost:5173",
                ["Storage:RootPath"] = _storageRootPath ?? "Storage",
                ["BootstrapAdmin:Enabled"] = "false",
                ["Database:AutoMigrate"] = "false",
            });
        });

        builder.ConfigureServices(services =>
        {
            services.RemoveAll<DbContextOptions<AppDbContext>>();
            services.AddDbContext<AppDbContext>(options => options.UseInMemoryDatabase(_databaseName));
        });
    }

    public async Task SeedAsync()
    {
        using var scope = Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var environment = scope.ServiceProvider.GetRequiredService<IWebHostEnvironment>();
        await db.Database.EnsureDeletedAsync();
        await db.Database.EnsureCreatedAsync();

        var demoStoragePath = Path.Combine(environment.ContentRootPath, "Storage", "demo");
        Directory.CreateDirectory(demoStoragePath);
        await File.WriteAllBytesAsync(Path.Combine(demoStoragePath, "assigned.pdf"), "%PDF-1.4 assigned"u8.ToArray());
        await File.WriteAllBytesAsync(Path.Combine(demoStoragePath, "unassigned.pdf"), "%PDF-1.4 unassigned"u8.ToArray());
        await File.WriteAllBytesAsync(Path.Combine(demoStoragePath, "pending.pdf"), "%PDF-1.4 pending"u8.ToArray());

        var createdAtUtc = new DateTime(2026, 1, 1, 12, 0, 0, DateTimeKind.Utc);

        var admin = new User
        {
            Id = 1,
            FullName = "Admin",
            Email = "admin@test.local",
            PasswordHash = PasswordHasher.HashPassword("Admin123!"),
            Role = UserRole.Admin,
            IsActive = true,
            CreatedAtUtc = createdAtUtc,
        };
        var teacher = new User
        {
            Id = 2,
            FullName = "Teacher",
            Email = "teacher@test.local",
            PasswordHash = PasswordHasher.HashPassword("Teacher123!"),
            Role = UserRole.Teacher,
            IsActive = true,
            CreatedAtUtc = createdAtUtc,
        };
        var inactiveTeacher = new User
        {
            Id = 3,
            FullName = "Inactive Teacher",
            Email = "inactive@test.local",
            PasswordHash = PasswordHasher.HashPassword("Teacher123!"),
            Role = UserRole.Teacher,
            IsActive = false,
            CreatedAtUtc = createdAtUtc,
        };

        var piano = new Instrument { Id = 1, Name = "Piano", IsActive = true };
        var violin = new Instrument { Id = 2, Name = "Violin", IsActive = true };

        db.Users.AddRange(admin, teacher, inactiveTeacher);
        db.Instruments.AddRange(piano, violin);
        db.UserInstruments.Add(new UserInstrument { UserId = teacher.Id, InstrumentId = piano.Id });
        db.Materials.AddRange(
            new Material
            {
                Id = 1,
                Title = "Assigned Approved",
                InstrumentId = piano.Id,
                UploadedByUserId = teacher.Id,
                Level = MaterialLevel.Beginner,
                Status = MaterialStatus.Approved,
                OriginalFilePath = "Storage/demo/assigned.pdf",
                OriginalFileName = "assigned.pdf",
                ApprovedFilePath = "Storage/demo/assigned.pdf",
                ApprovedFileName = "assigned.pdf",
                CreatedAtUtc = createdAtUtc,
                ApprovedAtUtc = createdAtUtc,
                ApprovedByUserId = admin.Id,
            },
            new Material
            {
                Id = 2,
                Title = "Unassigned Approved",
                InstrumentId = violin.Id,
                UploadedByUserId = teacher.Id,
                Level = MaterialLevel.Advanced,
                Status = MaterialStatus.Approved,
                OriginalFilePath = "Storage/demo/unassigned.pdf",
                OriginalFileName = "unassigned.pdf",
                ApprovedFilePath = "Storage/demo/unassigned.pdf",
                ApprovedFileName = "unassigned.pdf",
                CreatedAtUtc = createdAtUtc,
                ApprovedAtUtc = createdAtUtc,
                ApprovedByUserId = admin.Id,
            },
            new Material
            {
                Id = 3,
                Title = "Assigned Pending",
                InstrumentId = piano.Id,
                UploadedByUserId = teacher.Id,
                Level = MaterialLevel.Beginner,
                Status = MaterialStatus.Pending,
                OriginalFilePath = "Storage/demo/pending.pdf",
                OriginalFileName = "pending.pdf",
                CreatedAtUtc = createdAtUtc,
            });

        await db.SaveChangesAsync();
    }
}
