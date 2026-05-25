using LeybedikInfoKiosk.Server.Data;
using LeybedikInfoKiosk.Server.DTOs;
using LeybedikInfoKiosk.Server.Hubs;
using LeybedikInfoKiosk.Server.Models;
using LeybedikInfoKiosk.Server.Services;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using Xunit;

namespace LeybedikInfoKiosk.Server.Tests;

public class MaterialLikeNotificationTests
{
    [Fact]
    public async Task LikeAsync_NotifiesUploaderOnNewLikeOnly()
    {
        await using var db = CreateDbContext();
        SeedMaterials(db);

        var hubContext = new Mock<IHubContext<LikeNotificationHub>>();
        var clients = new Mock<IHubClients>();
        var clientProxy = new Mock<IClientProxy>();
        object?[]? capturedArgs = null;

        clientProxy
            .Setup(proxy => proxy.SendCoreAsync(
                LikeNotificationService.MaterialLikedEventName,
                It.IsAny<object?[]>(),
                It.IsAny<CancellationToken>()))
            .Callback<string, object?[], CancellationToken>((_, args, _) => capturedArgs = args)
            .Returns(Task.CompletedTask);

        clients.Setup(c => c.User("2")).Returns(clientProxy.Object);
        hubContext.Setup(h => h.Clients).Returns(clients.Object);

        var service = new MaterialService(
            db,
            Mock.Of<IFileStorageService>(),
            new AuditLogService(db),
            new LikeNotificationService(hubContext.Object),
            NullLogger<MaterialService>.Instance);

        var liker = CreatePrincipal(userId: 1, role: "Admin");
        var first = await service.LikeAsync(1, liker);
        var second = await service.LikeAsync(1, liker);

        Assert.True(first.Status == MaterialLikeStatus.Success);
        Assert.True(second.Status == MaterialLikeStatus.Success);

        clients.Verify(c => c.User("2"), Times.Once);
        var payload = Assert.IsType<MaterialLikedNotificationDto>(Assert.Single(capturedArgs!));
        Assert.Equal(1, payload.MaterialId);
    }

    private static System.Security.Claims.ClaimsPrincipal CreatePrincipal(int userId, string role)
    {
        var identity = new System.Security.Claims.ClaimsIdentity(
        [
            new System.Security.Claims.Claim(System.Security.Claims.ClaimTypes.NameIdentifier, userId.ToString()),
            new System.Security.Claims.Claim(System.Security.Claims.ClaimTypes.Role, role),
        ],
        "TestAuth");

        return new System.Security.Claims.ClaimsPrincipal(identity);
    }

    private static AppDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase($"MaterialLikeNotificationTests-{Guid.NewGuid():N}")
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

        db.Users.AddRange(admin, teacher);
        db.Instruments.AddRange(piano);
        db.UserInstruments.Add(new UserInstrument { UserId = teacher.Id, InstrumentId = piano.Id });
        db.Materials.Add(new Material
        {
            Id = 1,
            Title = "Approved Piano",
            InstrumentId = piano.Id,
            UploadedByUserId = teacher.Id,
            Status = MaterialStatus.Approved,
            OriginalFilePath = "files/a.pdf",
            OriginalFileName = "a.pdf",
            ApprovedFilePath = "files/a.pdf",
            ApprovedFileName = "a.pdf",
            CreatedAtUtc = createdAtUtc,
            ApprovedAtUtc = createdAtUtc,
        });

        db.SaveChanges();
    }
}
