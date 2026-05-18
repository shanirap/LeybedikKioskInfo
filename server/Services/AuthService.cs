using LeybedikInfoKiosk.Server.Data;
using LeybedikInfoKiosk.Server.DTOs;
using LeybedikInfoKiosk.Server.Security;
using Microsoft.EntityFrameworkCore;

namespace LeybedikInfoKiosk.Server.Services;

public class AuthService
{
    private readonly AppDbContext _db;
    private readonly JwtService _jwtService;

    public AuthService(AppDbContext db, JwtService jwtService)
    {
        _db = db;
        _jwtService = jwtService;
    }

    public async Task<LoginResponse?> LoginAsync(LoginRequest request)
    {
        var user = await _db.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Email == request.Email && u.IsActive);

        if (user is null || !PasswordHasher.VerifyPassword(user.PasswordHash, request.Password))
            return null;

        var (token, expiresAtUtc) = _jwtService.GenerateToken(user);

        return new LoginResponse(
            Token: token,
            Email: user.Email,
            FullName: user.FullName,
            Role: user.Role.ToString(),
            ExpiresAtUtc: expiresAtUtc);
    }
}
