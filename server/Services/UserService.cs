using LeybedikInfoKiosk.Server.Data;
using LeybedikInfoKiosk.Server.DTOs;
using LeybedikInfoKiosk.Server.Models;
using LeybedikInfoKiosk.Server.Security;
using Microsoft.EntityFrameworkCore;

namespace LeybedikInfoKiosk.Server.Services;

public class UserService
{
    private readonly AppDbContext _db;
    private readonly AuditLogService _auditLogService;

    public UserService(AppDbContext db, AuditLogService auditLogService)
    {
        _db = db;
        _auditLogService = auditLogService;
    }

    public async Task<IReadOnlyCollection<AdminUserDto>> GetUsersAsync()
    {
        return await _db.Users
            .AsNoTracking()
            .Include(u => u.UserInstruments)
            .ThenInclude(ui => ui.Instrument)
            .OrderBy(u => u.FullName)
            .Select(u => ToDto(u))
            .ToListAsync();
    }

    public async Task<UserCreateResult> CreateAsync(CreateUserRequest request, int actorUserId)
    {
        var email = NormalizeEmail(request.Email);
        if (await _db.Users.AnyAsync(u => u.Email == email))
            return UserCreateResult.Conflict();

        var user = new User
        {
            FullName = request.FullName.Trim(),
            Email = email,
            PasswordHash = PasswordHasher.HashPassword(request.Password),
            Role = request.Role,
            IsActive = request.IsActive,
            CreatedAtUtc = DateTime.UtcNow,
        };

        _db.Users.Add(user);
        await _db.SaveChangesAsync();

        if (user.Role == UserRole.Teacher)
            await ReplaceUserInstruments(user.Id, request.InstrumentIds);

        await _auditLogService.AddAsync(
            actorUserId,
            "CreateUser",
            "User",
            user.Id,
            $"Created {user.Role} user {user.Email}.");

        return UserCreateResult.Success(await GetUserDto(user.Id));
    }

    public async Task<UserUpdateResult> UpdateAsync(int id, UpdateUserRequest request, int actorUserId)
    {
        var user = await _db.Users
            .Include(u => u.UserInstruments)
            .FirstOrDefaultAsync(u => u.Id == id);

        if (user is null)
            return UserUpdateResult.NotFound();

        var email = NormalizeEmail(request.Email);
        if (await _db.Users.AnyAsync(u => u.Id != id && u.Email == email))
            return UserUpdateResult.Conflict();

        user.FullName = request.FullName.Trim();
        user.Email = email;
        user.Role = request.Role;
        user.IsActive = request.IsActive;

        if (user.Role == UserRole.Admin)
            _db.UserInstruments.RemoveRange(user.UserInstruments);

        await _db.SaveChangesAsync();
        await _auditLogService.AddAsync(
            actorUserId,
            "UpdateUser",
            "User",
            user.Id,
            $"Updated user {user.Email}.");

        return UserUpdateResult.Success(await GetUserDto(id));
    }

    public async Task<UserUpdateResult> UpdateInstrumentsAsync(
        int id,
        UpdateUserInstrumentsRequest request,
        int actorUserId)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == id);
        if (user is null)
            return UserUpdateResult.NotFound();

        if (user.Role != UserRole.Teacher)
            return UserUpdateResult.BadRequest();

        await ReplaceUserInstruments(id, request.InstrumentIds);
        await _auditLogService.AddAsync(
            actorUserId,
            "UpdateUserInstruments",
            "User",
            id,
            $"Updated teacher instruments to: {string.Join(", ", request.InstrumentIds)}.");

        return UserUpdateResult.Success(await GetUserDto(id));
    }

    public async Task<PasswordChangeResult> ChangePasswordAsync(int userId, ChangePasswordRequest request)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId && u.IsActive);
        if (user is null)
            return PasswordChangeResult.NotFound();

        if (!PasswordHasher.VerifyPassword(user.PasswordHash, request.CurrentPassword))
            return PasswordChangeResult.InvalidCurrentPassword();

        user.PasswordHash = PasswordHasher.HashPassword(request.NewPassword);
        await _db.SaveChangesAsync();

        return PasswordChangeResult.Success();
    }

    public async Task<UserUpdateResult> ResetPasswordAsync(int id, ResetPasswordRequest request, int actorUserId)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == id);
        if (user is null)
            return UserUpdateResult.NotFound();

        user.PasswordHash = PasswordHasher.HashPassword(request.NewPassword);
        await _db.SaveChangesAsync();
        await _auditLogService.AddAsync(
            actorUserId,
            "ResetUserPassword",
            "User",
            user.Id,
            $"Reset password for user {user.Email}.");

        return UserUpdateResult.Success(await GetUserDto(id));
    }

    private async Task ReplaceUserInstruments(int userId, IReadOnlyCollection<int> instrumentIds)
    {
        var existing = await _db.UserInstruments
            .Where(ui => ui.UserId == userId)
            .ToListAsync();

        _db.UserInstruments.RemoveRange(existing);

        var validInstrumentIds = await _db.Instruments
            .Where(i => instrumentIds.Contains(i.Id) && i.IsActive)
            .Select(i => i.Id)
            .Distinct()
            .ToListAsync();

        foreach (var instrumentId in validInstrumentIds)
        {
            _db.UserInstruments.Add(new UserInstrument
            {
                UserId = userId,
                InstrumentId = instrumentId,
            });
        }

        await _db.SaveChangesAsync();
    }

    private async Task<AdminUserDto> GetUserDto(int id)
    {
        return await _db.Users
            .AsNoTracking()
            .Include(u => u.UserInstruments)
            .ThenInclude(ui => ui.Instrument)
            .Where(u => u.Id == id)
            .Select(u => ToDto(u))
            .FirstAsync();
    }

    private static AdminUserDto ToDto(User user)
    {
        return new AdminUserDto(
            user.Id,
            user.FullName,
            user.Email,
            user.Role.ToString(),
            user.IsActive,
            user.UserInstruments
                .OrderBy(ui => ui.Instrument.Name)
                .Select(ui => new InstrumentDto(ui.Instrument.Id, ui.Instrument.Name, ui.Instrument.IsActive))
                .ToList());
    }

    private static string NormalizeEmail(string email)
    {
        return email.Trim().ToLowerInvariant();
    }
}

public record UserCreateResult(UserCreateStatus Status, AdminUserDto? User = null)
{
    public static UserCreateResult Success(AdminUserDto user) => new(UserCreateStatus.Success, user);

    public static UserCreateResult Conflict() => new(UserCreateStatus.Conflict);
}

public enum UserCreateStatus
{
    Success,
    Conflict,
}

public record UserUpdateResult(UserUpdateStatus Status, AdminUserDto? User = null)
{
    public static UserUpdateResult Success(AdminUserDto user) => new(UserUpdateStatus.Success, user);

    public static UserUpdateResult NotFound() => new(UserUpdateStatus.NotFound);

    public static UserUpdateResult Conflict() => new(UserUpdateStatus.Conflict);

    public static UserUpdateResult BadRequest() => new(UserUpdateStatus.BadRequest);
}

public enum UserUpdateStatus
{
    Success,
    NotFound,
    Conflict,
    BadRequest,
}

public record PasswordChangeResult(PasswordChangeStatus Status)
{
    public static PasswordChangeResult Success() => new(PasswordChangeStatus.Success);

    public static PasswordChangeResult NotFound() => new(PasswordChangeStatus.NotFound);

    public static PasswordChangeResult InvalidCurrentPassword() => new(PasswordChangeStatus.InvalidCurrentPassword);
}

public enum PasswordChangeStatus
{
    Success,
    NotFound,
    InvalidCurrentPassword,
}
