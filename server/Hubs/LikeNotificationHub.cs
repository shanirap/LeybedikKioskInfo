using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace LeybedikInfoKiosk.Server.Hubs;

[Authorize]
public class LikeNotificationHub : Hub
{
}
