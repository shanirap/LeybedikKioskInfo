using System.Security.Claims;
using LeybedikInfoKiosk.Server.Data;
using Microsoft.EntityFrameworkCore;

namespace LeybedikInfoKiosk.Server.Middleware;

/// <summary>
/// Rejects requests from users whose IsActive flag was revoked or whose role changed after token issuance.
/// Runs after authentication so ClaimsPrincipal is populated.
/// </summary>
public class ActiveUserMiddleware
{
    private readonly RequestDelegate _next;

    public ActiveUserMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context, AppDbContext db)
    {
        if (context.User.Identity?.IsAuthenticated == true)
        {
            var rawId = context.User.FindFirstValue(ClaimTypes.NameIdentifier)
                ?? context.User.FindFirstValue("sub");

            if (int.TryParse(rawId, out var userId))
            {
                var userInfo = await db.Users
                    .AsNoTracking()
                    .Where(u => u.Id == userId)
                    .Select(u => new { u.IsActive, Role = u.Role.ToString() })
                    .FirstOrDefaultAsync();

                if (userInfo is null || !userInfo.IsActive)
                {
                    context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                    context.Response.ContentType = "application/json";
                    await context.Response.WriteAsJsonAsync(new { message = "Account is disabled." });
                    return;
                }

                var tokenRole = context.User.FindFirstValue(ClaimTypes.Role);
                if (!string.Equals(tokenRole, userInfo.Role, StringComparison.Ordinal))
                {
                    context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                    context.Response.ContentType = "application/json";
                    await context.Response.WriteAsJsonAsync(new { message = "Account role has changed. Please sign in again." });
                    return;
                }
            }
        }

        await _next(context);
    }
}
