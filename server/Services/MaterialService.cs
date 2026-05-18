using System.Security.Claims;
using LeybedikInfoKiosk.Server.Data;
using LeybedikInfoKiosk.Server.DTOs;
using LeybedikInfoKiosk.Server.Models;
using LeybedikInfoKiosk.Server.Security;
using Microsoft.EntityFrameworkCore;

namespace LeybedikInfoKiosk.Server.Services;

public class MaterialService
{
    private static readonly IReadOnlyDictionary<string, string[]> AllowedFileTypes =
        new Dictionary<string, string[]>(StringComparer.OrdinalIgnoreCase)
        {
            [".pdf"] = ["application/pdf"],
            [".doc"] = ["application/msword", "application/octet-stream"],
            [".docx"] = ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/octet-stream"],
            [".ppt"] = ["application/vnd.ms-powerpoint", "application/octet-stream"],
            [".pptx"] = ["application/vnd.openxmlformats-officedocument.presentationml.presentation", "application/octet-stream"],
            [".png"] = ["image/png"],
            [".jpg"] = ["image/jpeg"],
            [".jpeg"] = ["image/jpeg"],
        };

    private const long MaxUploadBytes = 50_000_000;

    private readonly AppDbContext _db;
    private readonly IWebHostEnvironment _environment;
    private readonly IConfiguration _configuration;
    private readonly AuditLogService _auditLogService;

    public MaterialService(
        AppDbContext db,
        IWebHostEnvironment environment,
        IConfiguration configuration,
        AuditLogService auditLogService)
    {
        _db = db;
        _environment = environment;
        _configuration = configuration;
        _auditLogService = auditLogService;
    }

    public async Task<IReadOnlyCollection<MaterialDto>> GetApprovedAsync(ClaimsPrincipal user)
    {
        var userId = user.GetUserId();
        return await VisibleMaterialsQuery(user)
            .Where(m => m.Status == MaterialStatus.Approved)
            .OrderByDescending(m => m.ApprovedAtUtc ?? m.CreatedAtUtc)
            .Select(m => ToDto(m, m.MaterialLikes.Any(like => like.UserId == userId)))
            .ToListAsync();
    }

    public async Task<IReadOnlyCollection<MaterialDto>> GetMyUploadsAsync(ClaimsPrincipal user)
    {
        var userId = user.GetUserId();
        return await _db.Materials
            .AsNoTracking()
            .Include(m => m.Instrument)
            .Include(m => m.UploadedByUser)
            .Where(m => m.UploadedByUserId == userId)
            .OrderByDescending(m => m.CreatedAtUtc)
            .Select(m => ToDto(m, m.MaterialLikes.Any(like => like.UserId == userId)))
            .ToListAsync();
    }

    public async Task<IReadOnlyCollection<MaterialDto>> GetAdminMaterialsAsync(MaterialStatus? status)
    {
        var query = _db.Materials
            .AsNoTracking()
            .Include(m => m.Instrument)
            .Include(m => m.UploadedByUser)
            .AsQueryable();

        if (status is not null)
            query = query.Where(m => m.Status == status);

        return await query
            .OrderByDescending(m => m.CreatedAtUtc)
            .Select(m => ToDto(m, false))
            .ToListAsync();
    }

    public async Task<IReadOnlyCollection<MaterialDto>> GetPendingAsync()
    {
        return await _db.Materials
            .AsNoTracking()
            .Include(m => m.Instrument)
            .Include(m => m.UploadedByUser)
            .Where(m => m.Status == MaterialStatus.Pending)
            .OrderBy(m => m.CreatedAtUtc)
            .Select(m => ToDto(m, false))
            .ToListAsync();
    }

    public async Task<MaterialUploadResult> UploadAsync(UploadMaterialRequest request, ClaimsPrincipal user)
    {
        var validationError = ValidateUpload(request.File);
        if (validationError is not null)
            return MaterialUploadResult.Invalid(validationError);

        if (!await CanUseInstrument(request.InstrumentId, user))
            return MaterialUploadResult.Forbidden();

        var extension = Path.GetExtension(request.File.FileName);
        var uploadsDir = Path.Combine(GetStorageRoot(), "originals");
        Directory.CreateDirectory(uploadsDir);

        var storedFileName = $"{Guid.NewGuid():N}{extension}";
        var physicalPath = Path.Combine(uploadsDir, storedFileName);
        var relativePath = Path.Combine(GetStorageRootName(), "originals", storedFileName);

        await using (var stream = File.Create(physicalPath))
        {
            await request.File.CopyToAsync(stream);
        }

        var material = new Material
        {
            Title = request.Title.Trim(),
            Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim(),
            InstrumentId = request.InstrumentId,
            UploadedByUserId = user.GetUserId(),
            Status = MaterialStatus.Pending,
            OriginalFilePath = relativePath,
            OriginalFileName = Path.GetFileName(request.File.FileName),
            DownloadCount = 0,
            LikeCount = 0,
            CreatedAtUtc = DateTime.UtcNow,
        };

        _db.Materials.Add(material);
        await _db.SaveChangesAsync();

        var created = await _db.Materials
            .AsNoTracking()
            .Include(m => m.Instrument)
            .Include(m => m.UploadedByUser)
            .Where(m => m.Id == material.Id)
            .Select(m => ToDto(m, false))
            .FirstAsync();

        return MaterialUploadResult.Success(created);
    }

    public async Task<StoredFileResult?> GetDownloadAsync(int id, ClaimsPrincipal user, bool adminReview)
    {
        var query = adminReview
            ? _db.Materials.AsNoTracking()
            : VisibleMaterialsQuery(user);

        var material = await query.FirstOrDefaultAsync(m => m.Id == id);
        if (material is null)
            return null;

        var path = ResolveStoragePath(material.ApprovedFilePath ?? material.OriginalFilePath);
        var fileName = material.ApprovedFileName ?? material.OriginalFileName;

        if (!File.Exists(path))
            return null;

        if (!adminReview)
        {
            material.DownloadCount += 1;
            await _db.SaveChangesAsync();
        }

        return new StoredFileResult(path, fileName, GetContentType(fileName));
    }

    public async Task<StoredFileResult?> GetPreviewAsync(int id, ClaimsPrincipal user)
    {
        var material = await PreviewableMaterialsQuery(user)
            .AsNoTracking()
            .FirstOrDefaultAsync(m => m.Id == id);
        if (material is null)
            return null;

        var path = ResolveStoragePath(material.ApprovedFilePath ?? material.OriginalFilePath);
        var fileName = material.ApprovedFileName ?? material.OriginalFileName;

        return File.Exists(path)
            ? new StoredFileResult(path, fileName, GetContentType(fileName))
            : null;
    }

    public async Task<MaterialDto?> LikeAsync(int id, ClaimsPrincipal user)
    {
        var userId = user.GetUserId();
        var material = await VisibleMaterialsQuery(user)
            .Include(m => m.Instrument)
            .Include(m => m.UploadedByUser)
            .FirstOrDefaultAsync(m => m.Id == id);

        if (material is null)
            return null;

        var alreadyLiked = await _db.MaterialLikes.AnyAsync(like =>
            like.MaterialId == id &&
            like.UserId == userId);
        if (alreadyLiked)
            return ToDto(material, true);

        _db.MaterialLikes.Add(new MaterialLike
        {
            MaterialId = id,
            UserId = userId,
            CreatedAtUtc = DateTime.UtcNow,
        });
        material.LikeCount += 1;
        await _db.SaveChangesAsync();

        return ToDto(material, true);
    }

    public async Task<MaterialDto?> ApproveAsync(int id, int actorUserId)
    {
        var material = await _db.Materials
            .Include(m => m.Instrument)
            .Include(m => m.UploadedByUser)
            .FirstOrDefaultAsync(m => m.Id == id);

        if (material is null)
            return null;

        material.Status = MaterialStatus.Approved;
        material.ApprovedAtUtc = DateTime.UtcNow;
        material.ApprovedByUserId = actorUserId;
        material.ApprovedFilePath ??= material.OriginalFilePath;
        material.ApprovedFileName ??= material.OriginalFileName;

        await _db.SaveChangesAsync();
        await _auditLogService.AddAsync(
            actorUserId,
            "ApproveMaterial",
            "Material",
            material.Id,
            $"Approved material {material.Title}.");

        return ToDto(material, false);
    }

    public async Task<MaterialDto?> RejectAsync(int id, int actorUserId)
    {
        var material = await _db.Materials
            .Include(m => m.Instrument)
            .Include(m => m.UploadedByUser)
            .FirstOrDefaultAsync(m => m.Id == id);

        if (material is null)
            return null;

        material.Status = MaterialStatus.Rejected;
        material.ApprovedAtUtc = null;
        material.ApprovedByUserId = null;
        material.ApprovedFilePath = null;
        material.ApprovedFileName = null;

        await _db.SaveChangesAsync();
        await _auditLogService.AddAsync(
            actorUserId,
            "RejectMaterial",
            "Material",
            material.Id,
            $"Rejected material {material.Title}.");

        return ToDto(material, false);
    }

    private IQueryable<Material> VisibleMaterialsQuery(ClaimsPrincipal user)
    {
        var query = _db.Materials
            .Include(m => m.Instrument)
            .Include(m => m.UploadedByUser)
            .AsQueryable();

        if (user.IsAdmin())
            return query;

        var userId = user.GetUserId();
        return query.Where(m =>
            m.Status == MaterialStatus.Approved &&
            m.Instrument.UserInstruments.Any(ui => ui.UserId == userId));
    }

    private IQueryable<Material> PreviewableMaterialsQuery(ClaimsPrincipal user)
    {
        if (user.IsAdmin())
            return _db.Materials;

        var userId = user.GetUserId();
        return _db.Materials.Where(m =>
            m.UploadedByUserId == userId ||
            (m.Status == MaterialStatus.Approved &&
             m.Instrument.UserInstruments.Any(ui => ui.UserId == userId)));
    }

    private async Task<bool> CanUseInstrument(int instrumentId, ClaimsPrincipal user)
    {
        if (user.IsAdmin())
            return await _db.Instruments.AnyAsync(i => i.Id == instrumentId && i.IsActive);

        var userId = user.GetUserId();
        return await _db.UserInstruments.AnyAsync(ui =>
            ui.UserId == userId &&
            ui.InstrumentId == instrumentId &&
            ui.Instrument.IsActive);
    }

    private static string? ValidateUpload(IFormFile file)
    {
        if (file.Length == 0)
            return "File is required.";

        if (file.Length > MaxUploadBytes)
            return "File is too large. Maximum size is 50 MB.";

        var extension = Path.GetExtension(file.FileName);
        if (!AllowedFileTypes.TryGetValue(extension, out var allowedContentTypes))
            return "File type is not allowed.";

        if (string.IsNullOrWhiteSpace(file.ContentType) ||
            !allowedContentTypes.Contains(file.ContentType, StringComparer.OrdinalIgnoreCase))
        {
            return "File content type is not allowed.";
        }

        return null;
    }

    private string ResolveStoragePath(string path)
    {
        return Path.IsPathRooted(path) ? path : Path.Combine(_environment.ContentRootPath, path);
    }

    private string GetStorageRoot()
    {
        var configured = _configuration["Storage:RootPath"];
        if (!string.IsNullOrWhiteSpace(configured))
            return Path.IsPathRooted(configured) ? configured : Path.Combine(_environment.ContentRootPath, configured);

        return Path.Combine(_environment.ContentRootPath, GetStorageRootName());
    }

    private string GetStorageRootName()
    {
        return _configuration["Storage:RootPath"] ?? "Storage";
    }

    private static string GetContentType(string fileName)
    {
        return Path.GetExtension(fileName).ToLowerInvariant() switch
        {
            ".pdf" => "application/pdf",
            ".png" => "image/png",
            ".jpg" or ".jpeg" => "image/jpeg",
            ".doc" => "application/msword",
            ".docx" => "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            ".ppt" => "application/vnd.ms-powerpoint",
            ".pptx" => "application/vnd.openxmlformats-officedocument.presentationml.presentation",
            _ => "application/octet-stream",
        };
    }

    private static MaterialDto ToDto(Material material, bool isLikedByCurrentUser)
    {
        return new MaterialDto(
            material.Id,
            material.Title,
            material.Description,
            material.InstrumentId,
            material.Instrument.Name,
            material.UploadedByUser.FullName,
            material.ApprovedFileName ?? material.OriginalFileName,
            material.Status.ToString(),
            material.DownloadCount,
            material.LikeCount,
            isLikedByCurrentUser,
            material.CreatedAtUtc,
            material.ApprovedAtUtc);
    }
}

public record StoredFileResult(string Path, string FileName, string ContentType);

public record MaterialUploadResult(
    MaterialUploadStatus Status,
    MaterialDto? Material = null,
    string? ErrorMessage = null)
{
    public static MaterialUploadResult Success(MaterialDto material)
        => new(MaterialUploadStatus.Success, material);

    public static MaterialUploadResult Invalid(string message)
        => new(MaterialUploadStatus.Invalid, ErrorMessage: message);

    public static MaterialUploadResult Forbidden()
        => new(MaterialUploadStatus.Forbidden);
}

public enum MaterialUploadStatus
{
    Success,
    Invalid,
    Forbidden,
}
