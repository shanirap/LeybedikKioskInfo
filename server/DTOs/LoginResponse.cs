namespace LeybedikInfoKiosk.Server.DTOs;

public record LoginResponse(
    string Token,
    string Email,
    string FullName,
    string Role,
    DateTime ExpiresAtUtc
);
