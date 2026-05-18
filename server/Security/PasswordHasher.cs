using Microsoft.AspNetCore.Identity;

namespace LeybedikInfoKiosk.Server.Security;

/// <summary>
/// Password hashing helper using ASP.NET Core Identity algorithm (PBKDF2 / v3).
/// </summary>
public static class PasswordHasher
{
    private static readonly PasswordHasher<object> Hasher = new();

    public static string HashPassword(string password)
    {
        return Hasher.HashPassword(null!, password);
    }

    public static bool VerifyPassword(string hashedPassword, string providedPassword)
    {
        var result = Hasher.VerifyHashedPassword(null!, hashedPassword, providedPassword);
        return result != PasswordVerificationResult.Failed;
    }
}
