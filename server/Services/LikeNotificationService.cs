using LeybedikInfoKiosk.Server.DTOs;
using LeybedikInfoKiosk.Server.Hubs;
using Microsoft.AspNetCore.SignalR;

namespace LeybedikInfoKiosk.Server.Services;

public class LikeNotificationService
{
    public const string MaterialLikedEventName = "MaterialLiked";

    private readonly IHubContext<LikeNotificationHub> _hubContext;

    public LikeNotificationService(IHubContext<LikeNotificationHub> hubContext)
    {
        _hubContext = hubContext;
    }

    public virtual Task NotifyMaterialLikedAsync(int uploaderUserId, int materialId)
    {
        return _hubContext.Clients
            .User(uploaderUserId.ToString())
            .SendAsync(MaterialLikedEventName, new MaterialLikedNotificationDto(materialId));
    }
}
