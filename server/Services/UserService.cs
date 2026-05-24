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

    public async Task<IReadOnlyCollection<AdminUserDto>> GetUsersAsync(
        string? search = null,
        UserRole? role = null,
        int? minLikes = null,
        int? minDownloads = null)
    {
        var query = _db.Users.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim();
            query = query.Where(u => u.FullName.Contains(term) || u.Email.Contains(term));
        }

        if (role.HasValue)
            query = query.Where(u => u.Role == role.Value);

        var users = await query
            .OrderBy(u => u.FullName)
            .Select(u => new AdminUserDto(
                u.Id,
                u.FullName,
                u.Email,
                u.Role.ToString(),
                u.IsActive,
                u.UserInstruments
                    .OrderBy(ui => ui.Instrument.Name)
                    .Select(ui => new InstrumentDto(ui.Instrument.Id, ui.Instrument.Name, ui.Instrument.IsActive))
                    .ToList(),
                u.UploadedMaterials.Where(m => !m.IsDeleted).Sum(m => m.LikeCount),
                u.UploadedMaterials.Where(m => !m.IsDeleted).Sum(m => m.DownloadCount)))
            .ToListAsync();

        if (minLikes.HasValue)
            users = users.Where(u => u.TotalLikesReceived >= minLikes.Value).ToList();

        if (minDownloads.HasValue)
            users = users.Where(u => u.TotalUniqueDownloadsReceived >= minDownloads.Value).ToList();

        return users;
    }

    public async Task<UserCreateResult> CreateAsync(CreateUserRequest request, int actorUserId)
    {
        if (string.IsNullOrWhiteSpace(request.FullName))
            return UserCreateResult.BadRequest("User full name is required.");

        if (string.IsNullOrWhiteSpace(request.Email))
            return UserCreateResult.BadRequest("User email is required.");

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
            $"נוצר משתמש {user.Role}: {user.Email}.");

        return UserCreateResult.Success(await GetUserDto(user.Id));
    }

    public async Task<UserUpdateResult> UpdateAsync(int id, UpdateUserRequest request, int actorUserId)
    {
        var user = await _db.Users
            .Include(u => u.UserInstruments)
            .FirstOrDefaultAsync(u => u.Id == id);

        if (user is null)
            return UserUpdateResult.NotFound();

        if (string.IsNullOrWhiteSpace(request.FullName))
            return UserUpdateResult.BadRequest("User full name is required.");

        if (string.IsNullOrWhiteSpace(request.Email))
            return UserUpdateResult.BadRequest("User email is required.");

        var email = NormalizeEmail(request.Email);
        if (await _db.Users.AnyAsync(u => u.Id != id && u.Email == email))
            return UserUpdateResult.Conflict();

        var wasActive = user.IsActive;
        var removesActiveAdmin = user.Role == UserRole.Admin &&
                                 user.IsActive &&
                                 (request.Role != UserRole.Admin || !request.IsActive);
        if (id == actorUserId && !request.IsActive)
            return UserUpdateResult.BadRequest("Cannot deactivate your own account.");

        if (id == actorUserId && user.Role == UserRole.Admin && request.Role != UserRole.Admin)
            return UserUpdateResult.BadRequest("Cannot change your own admin role.");

        if (removesActiveAdmin && await CountActiveAdminsAsync(excludingUserId: id) == 0)
            return UserUpdateResult.BadRequest("At least one active admin is required.");

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
            $"עודכן משתמש: {user.Email}.");

        if (wasActive != user.IsActive)
        {
            await _auditLogService.AddAsync(
                actorUserId,
                user.IsActive ? "ReactivateUser" : "DeactivateUser",
                "User",
                user.Id,
                user.IsActive
                    ? $"הופעל מחדש המשתמש: {user.Email}."
                    : $"הושבת המשתמש: {user.Email}.");
        }

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
            $"עודכנו כלי הנגינה של המורה: {string.Join(", ", request.InstrumentIds)}.");

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
        await _auditLogService.AddAsync(
            userId,
            "ChangePassword",
            "User",
            user.Id,
            $"שונתה סיסמה למשתמש: {user.Email}.");

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
            $"אופסה סיסמה למשתמש: {user.Email}.");

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

    private async Task<int> CountActiveAdminsAsync(int excludingUserId)
    {
        return await _db.Users.CountAsync(u =>
            u.Id != excludingUserId &&
            u.Role == UserRole.Admin &&
            u.IsActive);
    }

    private async Task<AdminUserDto> GetUserDto(int id)
    {
        return await _db.Users
            .AsNoTracking()
            .Where(u => u.Id == id)
            .Select(u => new AdminUserDto(
                u.Id,
                u.FullName,
                u.Email,
                u.Role.ToString(),
                u.IsActive,
                u.UserInstruments
                    .OrderBy(ui => ui.Instrument.Name)
                    .Select(ui => new InstrumentDto(ui.Instrument.Id, ui.Instrument.Name, ui.Instrument.IsActive))
                    .ToList(),
                u.UploadedMaterials.Where(m => !m.IsDeleted).Sum(m => m.LikeCount),
                u.UploadedMaterials.Where(m => !m.IsDeleted).Sum(m => m.DownloadCount)))
            .FirstAsync();
    }

    private static string NormalizeEmail(string email)
    {
        return email.Trim().ToLowerInvariant();
    }
}

public record UserCreateResult(UserCreateStatus Status, AdminUserDto? User = null, string? ErrorMessage = null)
{
    public static UserCreateResult Success(AdminUserDto user) => new(UserCreateStatus.Success, user);

    public static UserCreateResult Conflict() => new(UserCreateStatus.Conflict);

    public static UserCreateResult BadRequest(string errorMessage)
        => new(UserCreateStatus.BadRequest, ErrorMessage: errorMessage);
}

public enum UserCreateStatus
{
    Success,
    Conflict,
    BadRequest,
}

public record UserUpdateResult(UserUpdateStatus Status, AdminUserDto? User = null, string? ErrorMessage = null)
{
    public static UserUpdateResult Success(AdminUserDto user) => new(UserUpdateStatus.Success, user);

    public static UserUpdateResult NotFound() => new(UserUpdateStatus.NotFound);

    public static UserUpdateResult Conflict() => new(UserUpdateStatus.Conflict);

    public static UserUpdateResult BadRequest(string? errorMessage = null)
        => new(UserUpdateStatus.BadRequest, ErrorMessage: errorMessage);
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
