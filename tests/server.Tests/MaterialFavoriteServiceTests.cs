using LeybedikInfoKiosk.Server.Data;
using LeybedikInfoKiosk.Server.Hubs;
using LeybedikInfoKiosk.Server.Models;
using LeybedikInfoKiosk.Server.Services;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using Xunit;

namespace LeybedikInfoKiosk.Server.Tests;

public class MaterialFavoriteServiceTests
{
    [Fact]
    public async Task GetFavoritesAsync_ReturnsOnlyCurrentUserApprovedFavorites()
    {
        await using var db = CreateDbContext();
        SeedMaterials(db);

        db.MaterialFavorites.AddRange(
            new MaterialFavorite
            {
                MaterialId = 1,
                UserId = 2,
                CreatedAtUtc = DateTime.UtcNow,
            },
            new MaterialFavorite
            {
                MaterialId = 2,
                UserId = 1,
                CreatedAtUtc = DateTime.UtcNow,
            });
        await db.SaveChangesAsync();

        var service = CreateMaterialService(db);
        var teacher = CreateTeacherPrincipal(userId: 2);

        var favorites = await service.GetFavoritesAsync(teacher);

        var favorite = Assert.Single(favorites);
        Assert.Equal(1, favorite.Id);
        Assert.True(favorite.IsFavoritedByCurrentUser);
    }

    private static MaterialService CreateMaterialService(AppDbContext db)
    {
        var fileStorage = new Mock<IFileStorageService>();
        var auditLog = new AuditLogService(db);
        var hubContext = new Mock<IHubContext<LikeNotificationHub>>();
        var likeNotifications = new LikeNotificationService(hubContext.Object);

        return new MaterialService(
            db,
            fileStorage.Object,
            auditLog,
            likeNotifications,
            NullLogger<MaterialService>.Instance);
    }

    private static System.Security.Claims.ClaimsPrincipal CreateTeacherPrincipal(int userId)
    {
        var identity = new System.Security.Claims.ClaimsIdentity(
        [
            new System.Security.Claims.Claim(System.Security.Claims.ClaimTypes.NameIdentifier, userId.ToString()),
            new System.Security.Claims.Claim(System.Security.Claims.ClaimTypes.Role, "Teacher"),
        ],
        "TestAuth");

        return new System.Security.Claims.ClaimsPrincipal(identity);
    }

    private static AppDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase($"MaterialFavoriteServiceTests-{Guid.NewGuid():N}")
            .Options;

        return new AppDbContext(options);
    }

    private static void SeedMaterials(AppDbContext db)
    {
        var createdAtUtc = new DateTime(2026, 1, 1, 12, 0, 0, DateTimeKind.Utc);
        var admin = new User
        {
            Id = 1,
            FullName = "Admin",
            Email = "admin@test.local",
            PasswordHash = "hash",
            Role = UserRole.Admin,
            IsActive = true,
            CreatedAtUtc = createdAtUtc,
        };
        var teacher = new User
        {
            Id = 2,
            FullName = "Teacher",
            Email = "teacher@test.local",
            PasswordHash = "hash",
            Role = UserRole.Teacher,
            IsActive = true,
            CreatedAtUtc = createdAtUtc,
        };
        var piano = new Instrument { Id = 1, Name = "Piano", IsActive = true };
        var violin = new Instrument { Id = 2, Name = "Violin", IsActive = true };

        db.Users.AddRange(admin, teacher);
        db.Instruments.AddRange(piano, violin);
        db.UserInstruments.Add(new UserInstrument { UserId = teacher.Id, InstrumentId = piano.Id });
        db.Materials.AddRange(
            new Material
            {
                Id = 1,
                Title = "Approved Piano",
                InstrumentId = piano.Id,
                UploadedByUserId = teacher.Id,
                Status = MaterialStatus.Approved,
                OriginalFilePath = "files/a.pdf",
                OriginalFileName = "a.pdf",
                CreatedAtUtc = createdAtUtc,
                ApprovedAtUtc = createdAtUtc,
            },
            new Material
            {
                Id = 2,
                Title = "Approved Violin",
                InstrumentId = violin.Id,
                UploadedByUserId = teacher.Id,
                Status = MaterialStatus.Approved,
                OriginalFilePath = "files/b.pdf",
                OriginalFileName = "b.pdf",
                CreatedAtUtc = createdAtUtc,
                ApprovedAtUtc = createdAtUtc,
            });

        db.SaveChanges();
    }
}
