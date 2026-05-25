using LeybedikInfoKiosk.Server.DTOs;
using LeybedikInfoKiosk.Server.Hubs;
using LeybedikInfoKiosk.Server.Services;
using Microsoft.AspNetCore.SignalR;
using Moq;
using Xunit;

namespace LeybedikInfoKiosk.Server.Tests;

public class LikeNotificationServiceTests
{
    [Fact]
    public async Task NotifyMaterialLikedAsync_SendsEventToUploaderUser()
    {
        object?[]? capturedArgs = null;
        var clientProxy = new Mock<IClientProxy>();
        clientProxy
            .Setup(proxy => proxy.SendCoreAsync(
                LikeNotificationService.MaterialLikedEventName,
                It.IsAny<object?[]>(),
                It.IsAny<CancellationToken>()))
            .Callback<string, object?[], CancellationToken>((_, args, _) => capturedArgs = args)
            .Returns(Task.CompletedTask);

        var clients = new Mock<IHubClients>();
        clients.Setup(c => c.User("7")).Returns(clientProxy.Object);

        var hubContext = new Mock<IHubContext<LikeNotificationHub>>();
        hubContext.Setup(h => h.Clients).Returns(clients.Object);

        var service = new LikeNotificationService(hubContext.Object);

        await service.NotifyMaterialLikedAsync(7, 42);

        clients.Verify(c => c.User("7"), Times.Once);
        clientProxy.Verify(
            proxy => proxy.SendCoreAsync(
                LikeNotificationService.MaterialLikedEventName,
                It.IsAny<object?[]>(),
                It.IsAny<CancellationToken>()),
            Times.Once);

        var payload = Assert.IsType<MaterialLikedNotificationDto>(Assert.Single(capturedArgs));
        Assert.Equal(42, payload.MaterialId);
    }
}
