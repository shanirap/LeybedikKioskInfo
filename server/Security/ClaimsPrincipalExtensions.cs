using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;

namespace LeybedikInfoKiosk.Server.Security;

public static class ClaimsPrincipalExtensions
{
    public static int GetUserId(this ClaimsPrincipal user)
    {
        var value = user.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? user.FindFirstValue(JwtRegisteredClaimNames.Sub);

        if (!int.TryParse(value, out var userId))
            throw new InvalidOperationException("Authenticated user id claim is missing.");

        return userId;
    }

    public static bool IsAdmin(this ClaimsPrincipal user)
    {
        return user.IsInRole("Admin");
    }
}
