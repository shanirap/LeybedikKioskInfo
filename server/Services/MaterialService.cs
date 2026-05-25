using System.Security.Claims;
using LeybedikInfoKiosk.Server.Data;
using LeybedikInfoKiosk.Server.DTOs;
using LeybedikInfoKiosk.Server.Models;
using LeybedikInfoKiosk.Server.Security;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

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
    private readonly IFileStorageService _fileStorage;
    private readonly AuditLogService _auditLogService;
    private readonly LikeNotificationService _likeNotificationService;
    private readonly ILogger<MaterialService> _logger;

    public MaterialService(
        AppDbContext db,
        IFileStorageService fileStorage,
        AuditLogService auditLogService,
        LikeNotificationService likeNotificationService,
        ILogger<MaterialService> logger)
    {
        _db = db;
        _fileStorage = fileStorage;
        _auditLogService = auditLogService;
        _likeNotificationService = likeNotificationService;
        _logger = logger;
    }

    public async Task<IReadOnlyCollection<MaterialDto>> GetApprovedAsync(ClaimsPrincipal user)
    {
        var userId = user.GetUserId();
        return await VisibleMaterialsQuery(user)
            .Where(m => m.Status == MaterialStatus.Approved)
            .OrderByDescending(m => m.ApprovedAtUtc ?? m.CreatedAtUtc)
            .Select(m => ToDto(
                m,
                m.MaterialLikes.Any(like => like.UserId == userId),
                m.MaterialFavorites.Any(favorite => favorite.UserId == userId)))
            .ToListAsync();
    }

    public async Task<IReadOnlyCollection<MaterialDto>> GetFavoritesAsync(ClaimsPrincipal user)
    {
        var userId = user.GetUserId();
        return await VisibleMaterialsQuery(user)
            .Where(m => m.Status == MaterialStatus.Approved)
            .Where(m => m.MaterialFavorites.Any(favorite => favorite.UserId == userId))
            .OrderByDescending(m => m.MaterialFavorites
                .Where(favorite => favorite.UserId == userId)
                .Select(favorite => favorite.CreatedAtUtc)
                .First())
            .Select(m => ToDto(
                m,
                m.MaterialLikes.Any(like => like.UserId == userId),
                true))
            .ToListAsync();
    }

    public async Task<IReadOnlyCollection<MaterialDto>> GetMyUploadsAsync(ClaimsPrincipal user)
    {
        var userId = user.GetUserId();
        return await _db.Materials
            .AsNoTracking()
            .Include(m => m.Instrument)
            .Include(m => m.UploadedByUser)
            .Where(m => !m.IsDeleted && m.UploadedByUserId == userId)
            .OrderByDescending(m => m.CreatedAtUtc)
            .Select(m => ToDto(
                m,
                m.MaterialLikes.Any(like => like.UserId == userId),
                m.MaterialFavorites.Any(favorite => favorite.UserId == userId)))
            .ToListAsync();
    }

    public async Task<MaterialDto?> GetPreviewDetailsAsync(int id, ClaimsPrincipal user)
    {
        var userId = user.GetUserId();
        return await PreviewableMaterialsQuery(user)
            .AsNoTracking()
            .Include(m => m.Instrument)
            .Include(m => m.UploadedByUser)
            .Where(m => m.Id == id)
            .Select(m => ToDto(
                m,
                m.MaterialLikes.Any(like => like.UserId == userId),
                m.MaterialFavorites.Any(favorite => favorite.UserId == userId)))
            .FirstOrDefaultAsync();
    }

    public async Task<PagedResult<MaterialDto>> GetAdminMaterialsAsync(
        MaterialStatus? status,
        string? search,
        int page,
        int pageSize)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var query = _db.Materials
            .AsNoTracking()
            .Include(m => m.Instrument)
            .Include(m => m.UploadedByUser)
            .Where(m => !m.IsDeleted)
            .AsQueryable();

        if (status is not null)
            query = query.Where(m => m.Status == status);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim();
            query = query.Where(m =>
                m.Title.Contains(term) ||
                (m.UploadedByUser.FullName != null && m.UploadedByUser.FullName.Contains(term)) ||
                m.UploadedByUser.Email.Contains(term) ||
                m.Instrument.Name.Contains(term));
        }

        var totalCount = await query.CountAsync();
        var items = await query
            .OrderByDescending(m => m.CreatedAtUtc)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(m => ToDto(m, false, false))
            .ToListAsync();

        return new PagedResult<MaterialDto>(items, totalCount, page, pageSize);
    }

    public async Task<IReadOnlyCollection<MaterialDto>> GetPendingAsync()
    {
        return await _db.Materials
            .AsNoTracking()
            .Include(m => m.Instrument)
            .Include(m => m.UploadedByUser)
            .Where(m => !m.IsDeleted && m.Status == MaterialStatus.Pending)
            .OrderBy(m => m.CreatedAtUtc)
            .Select(m => ToDto(m, false, false))
            .ToListAsync();
    }

    public async Task<PagedResult<MaterialDto>> GetArchivedAsync(string? search, int page, int pageSize)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var query = _db.Materials
            .AsNoTracking()
            .Include(m => m.Instrument)
            .Include(m => m.UploadedByUser)
            .Where(m => m.IsDeleted)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim();
            query = query.Where(m =>
                m.Title.Contains(term) ||
                (m.UploadedByUser.FullName != null && m.UploadedByUser.FullName.Contains(term)) ||
                m.UploadedByUser.Email.Contains(term) ||
                m.Instrument.Name.Contains(term));
        }

        var totalCount = await query.CountAsync();
        var items = await query
            .OrderByDescending(m => m.DeletedAtUtc ?? m.CreatedAtUtc)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(m => ToDto(m, false, false))
            .ToListAsync();

        return new PagedResult<MaterialDto>(items, totalCount, page, pageSize);
    }

    public async Task<PagedResult<MaterialDto>> GetMyUploadsPagedAsync(ClaimsPrincipal user, string? search, int page, int pageSize)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);
        var userId = user.GetUserId();

        var query = _db.Materials
            .AsNoTracking()
            .Include(m => m.Instrument)
            .Include(m => m.UploadedByUser)
            .Where(m => !m.IsDeleted && m.UploadedByUserId == userId)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim();
            query = query.Where(m => m.Title.Contains(term) || m.Instrument.Name.Contains(term));
        }

        var totalCount = await query.CountAsync();
        var items = await query
            .OrderByDescending(m => m.CreatedAtUtc)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(m => ToDto(
                m,
                m.MaterialLikes.Any(like => like.UserId == userId),
                m.MaterialFavorites.Any(favorite => favorite.UserId == userId)))
            .ToListAsync();

        return new PagedResult<MaterialDto>(items, totalCount, page, pageSize);
    }

    public async Task<MaterialUploadResult> UploadAsync(UploadMaterialRequest request, ClaimsPrincipal user)
    {
        if (string.IsNullOrWhiteSpace(request.Title))
            return MaterialUploadResult.Invalid("Material title is required.");

        var validationError = await ValidateUploadAsync(request.File);
        if (validationError is not null)
            return MaterialUploadResult.Invalid(validationError);

        if (!await CanUseInstrument(request.InstrumentId, user))
            return MaterialUploadResult.Forbidden();

        var originalFileName = Path.GetFileName(request.File.FileName);
        var extension = GetNormalizedExtension(originalFileName);
        var storedFileName = $"{Guid.NewGuid():N}{extension}";

        var (fileSizeBytes, fileHash) = await ComputeFileSizeAndHashAsync(request.File);
        var storedFile = await _fileStorage.SaveAsync(request.File, "originals", storedFileName);

        var material = new Material
        {
            Title = request.Title.Trim(),
            Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim(),
            InstrumentId = request.InstrumentId,
            UploadedByUserId = user.GetUserId(),
            Level = request.Level,
            Status = MaterialStatus.Pending,
            OriginalFilePath = storedFile.Path,
            OriginalFileName = originalFileName,
            DownloadCount = 0,
            LikeCount = 0,
            FileSizeBytes = fileSizeBytes,
            FileHashSha256 = fileHash,
            CreatedAtUtc = DateTime.UtcNow,
        };

        _db.Materials.Add(material);
        await _db.SaveChangesAsync();
        await _auditLogService.AddAsync(
            user.GetUserId(),
            "UploadMaterial",
            "Material",
            material.Id,
            $"הועלה החומר: {material.Title}.");

        var created = await _db.Materials
            .AsNoTracking()
            .Include(m => m.Instrument)
            .Include(m => m.UploadedByUser)
            .Where(m => m.Id == material.Id)
            .Select(m => ToDto(m, false, false))
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

        var storedPath = material.ApprovedFilePath ?? material.OriginalFilePath;
        var fileName = material.ApprovedFileName ?? material.OriginalFileName;
        var stream = await _fileStorage.OpenReadAsync(storedPath);

        if (stream is null)
            return null;

        if (!adminReview)
        {
            await TryRecordUniqueDownloadAsync(material, user.GetUserId());
        }

        return new StoredFileResult(stream, fileName, GetContentType(fileName));
    }

    public async Task<TeacherWalletDto> GetTeacherWalletAsync(ClaimsPrincipal user)
    {
        var userId = user.GetUserId();
        var materials = await _db.Materials
            .AsNoTracking()
            .Include(m => m.Instrument)
            .Where(m => !m.IsDeleted && m.UploadedByUserId == userId)
            .OrderByDescending(m => m.CreatedAtUtc)
            .ToListAsync();

        var items = materials
            .Select(m => new TeacherWalletMaterialDto(
                m.Id,
                m.Title,
                m.Instrument.Name,
                m.Status.ToString(),
                m.LikeCount,
                m.DownloadCount))
            .ToList();

        return new TeacherWalletDto(
            items.Sum(item => item.LikesCount),
            items.Sum(item => item.UniqueDownloadsCount),
            items.Count,
            items);
    }

    public async Task<StoredFileResult?> GetPreviewAsync(int id, ClaimsPrincipal user)
    {
        var material = await PreviewableMaterialsQuery(user)
            .AsNoTracking()
            .FirstOrDefaultAsync(m => m.Id == id);
        if (material is null)
            return null;

        var storedPath = material.ApprovedFilePath ?? material.OriginalFilePath;
        var fileName = material.ApprovedFileName ?? material.OriginalFileName;
        var stream = await _fileStorage.OpenReadAsync(storedPath);

        return stream is null
            ? null
            : new StoredFileResult(stream, fileName, GetContentType(fileName));
    }

    public async Task<MaterialLikeResult> LikeAsync(int id, ClaimsPrincipal user)
    {
        var userId = user.GetUserId();
        var material = await VisibleMaterialsQuery(user)
            .Include(m => m.Instrument)
            .Include(m => m.UploadedByUser)
            .FirstOrDefaultAsync(m => m.Id == id);

        if (material is null)
            return MaterialLikeResult.NotFound();

        if (material.UploadedByUserId == userId)
            return MaterialLikeResult.Invalid("Cannot like your own material.");

        var alreadyLiked = await _db.MaterialLikes.AnyAsync(like =>
            like.MaterialId == id &&
            like.UserId == userId);
        if (alreadyLiked)
            return MaterialLikeResult.Success(await ToDtoForUserAsync(material, userId, true));

        _db.MaterialLikes.Add(new MaterialLike
        {
            MaterialId = id,
            UserId = userId,
            CreatedAtUtc = DateTime.UtcNow,
        });
        material.LikeCount += 1;
        await _db.SaveChangesAsync();
        await _likeNotificationService.NotifyMaterialLikedAsync(material.UploadedByUserId, material.Id);

        return MaterialLikeResult.Success(await ToDtoForUserAsync(material, userId, true));
    }

    public async Task<MaterialFavoriteResult> AddFavoriteAsync(int id, ClaimsPrincipal user)
    {
        var userId = user.GetUserId();
        var material = await VisibleMaterialsQuery(user)
            .Include(m => m.Instrument)
            .Include(m => m.UploadedByUser)
            .FirstOrDefaultAsync(m => m.Id == id && m.Status == MaterialStatus.Approved);

        if (material is null)
            return MaterialFavoriteResult.NotFound();

        var alreadyFavorited = await _db.MaterialFavorites.AnyAsync(favorite =>
            favorite.MaterialId == id &&
            favorite.UserId == userId);
        if (!alreadyFavorited)
        {
            _db.MaterialFavorites.Add(new MaterialFavorite
            {
                MaterialId = id,
                UserId = userId,
                CreatedAtUtc = DateTime.UtcNow,
            });
            await _db.SaveChangesAsync();
        }

        return MaterialFavoriteResult.Success(await ToDtoForUserAsync(material, userId, isFavorited: true));
    }

    public async Task<MaterialFavoriteResult> RemoveFavoriteAsync(int id, ClaimsPrincipal user)
    {
        var userId = user.GetUserId();
        var favorite = await _db.MaterialFavorites
            .FirstOrDefaultAsync(entry => entry.MaterialId == id && entry.UserId == userId);
        if (favorite is not null)
        {
            _db.MaterialFavorites.Remove(favorite);
            await _db.SaveChangesAsync();
        }

        var material = await VisibleMaterialsQuery(user)
            .Include(m => m.Instrument)
            .Include(m => m.UploadedByUser)
            .FirstOrDefaultAsync(m => m.Id == id && m.Status == MaterialStatus.Approved);

        if (material is null)
            return MaterialFavoriteResult.NotFound();

        return MaterialFavoriteResult.Success(await ToDtoForUserAsync(material, userId, isFavorited: false));
    }

    public async Task<MaterialDto?> ApproveAsync(int id, int actorUserId)
    {
        var material = await _db.Materials
            .Include(m => m.Instrument)
            .Include(m => m.UploadedByUser)
            .FirstOrDefaultAsync(m => !m.IsDeleted && m.Id == id);

        if (material is null)
            return null;

        material.Status = MaterialStatus.Approved;
        material.ApprovedAtUtc = DateTime.UtcNow;
        material.ApprovedByUserId = actorUserId;
        material.ApprovedFilePath ??= material.OriginalFilePath;
        material.ApprovedFileName ??= material.OriginalFileName;
        material.RejectedAtUtc = null;
        material.RejectedByUserId = null;
        material.RejectionReason = null;

        await _db.SaveChangesAsync();
        await _auditLogService.AddAsync(
            actorUserId,
            "ApproveMaterial",
            "Material",
            material.Id,
            $"אושר החומר: {material.Title}.");

        return ToDto(material, false, false);
    }

    public async Task<MaterialDto?> RejectAsync(int id, RejectMaterialRequest request, int actorUserId)
    {
        var material = await _db.Materials
            .Include(m => m.Instrument)
            .Include(m => m.UploadedByUser)
            .FirstOrDefaultAsync(m => !m.IsDeleted && m.Id == id);

        if (material is null)
            return null;

        material.Status = MaterialStatus.Rejected;
        material.ApprovedAtUtc = null;
        material.ApprovedByUserId = null;
        material.ApprovedFilePath = null;
        material.ApprovedFileName = null;
        material.RejectedAtUtc = DateTime.UtcNow;
        material.RejectedByUserId = actorUserId;
        material.RejectionReason = string.IsNullOrWhiteSpace(request.Reason) ? null : request.Reason.Trim();

        await _db.SaveChangesAsync();
        await _auditLogService.AddAsync(
            actorUserId,
            "RejectMaterial",
            "Material",
            material.Id,
            $"נדחה החומר: {material.Title}.");

        return ToDto(material, false, false);
    }

    public async Task<MaterialDeleteResult> DeleteByAdminAsync(int id, int actorUserId)
    {
        var material = await _db.Materials.FirstOrDefaultAsync(m => !m.IsDeleted && m.Id == id);
        if (material is null)
            return MaterialDeleteResult.NotFound();

        material.IsDeleted = true;
        material.DeletedAtUtc = DateTime.UtcNow;
        material.DeletedByUserId = actorUserId;
        await _db.SaveChangesAsync();
        await _auditLogService.AddAsync(
            actorUserId,
            "DeleteMaterialByAdmin",
            "Material",
            material.Id,
            $"הועבר לארכיון החומר: {material.Title}.");

        return MaterialDeleteResult.Success();
    }

    public async Task<MaterialDeleteResult> DeleteOwnAsync(int id, ClaimsPrincipal user)
    {
        var userId = user.GetUserId();
        var material = await _db.Materials.FirstOrDefaultAsync(m => !m.IsDeleted && m.Id == id);
        if (material is null)
            return MaterialDeleteResult.NotFound();

        if (material.UploadedByUserId != userId)
            return MaterialDeleteResult.Forbidden();

        if (material.Status == MaterialStatus.Approved)
            return MaterialDeleteResult.Forbidden("Approved materials can only be archived by an admin.");

        material.IsDeleted = true;
        material.DeletedAtUtc = DateTime.UtcNow;
        material.DeletedByUserId = userId;
        await _db.SaveChangesAsync();
        await _auditLogService.AddAsync(
            userId,
            "DeleteOwnMaterial",
            "Material",
            material.Id,
            $"הועבר לארכיון החומר שלי: {material.Title}.");

        return MaterialDeleteResult.Success();
    }

    public async Task<MaterialDto?> RestoreByAdminAsync(int id, int actorUserId)
    {
        var material = await _db.Materials
            .Include(m => m.Instrument)
            .Include(m => m.UploadedByUser)
            .FirstOrDefaultAsync(m => m.IsDeleted && m.Id == id);
        if (material is null)
            return null;

        material.IsDeleted = false;
        material.DeletedAtUtc = null;
        material.DeletedByUserId = null;
        material.RestoredAtUtc = DateTime.UtcNow;
        material.RestoredByUserId = actorUserId;

        await _db.SaveChangesAsync();
        await _auditLogService.AddAsync(
            actorUserId,
            "RestoreMaterial",
            "Material",
            material.Id,
            $"שוחזר החומר: {material.Title}.");

        return ToDto(material, false, false);
    }

    public async Task<MaterialDeleteResult> PermanentDeleteByAdminAsync(int id, int actorUserId)
    {
        var material = await _db.Materials.FirstOrDefaultAsync(m => m.Id == id);
        if (material is null)
            return MaterialDeleteResult.NotFound();

        if (!material.IsDeleted)
        {
            return MaterialDeleteResult.NotArchived(
                "Only archived materials can be permanently deleted.");
        }

        var materialId = material.Id;
        var materialTitle = material.Title;
        var storedPaths = GetDistinctStoredPaths(material.OriginalFilePath, material.ApprovedFilePath);

        foreach (var storedPath in storedPaths)
        {
            try
            {
                await _fileStorage.DeleteIfExistsAsync(storedPath);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(
                    ex,
                    "Failed to delete stored file {StoredPath} during permanent delete of material {MaterialId}",
                    storedPath,
                    materialId);
            }
        }

        await _auditLogService.AddAsync(
            actorUserId,
            "PermanentDeleteMaterial",
            "Material",
            materialId,
            $"מחיקה לצמיתות של חומר מהארכיון: {materialTitle} (#{materialId}).");

        var likes = await _db.MaterialLikes.Where(like => like.MaterialId == materialId).ToListAsync();
        var favorites = await _db.MaterialFavorites.Where(favorite => favorite.MaterialId == materialId).ToListAsync();
        var downloads = await _db.MaterialDownloads.Where(download => download.MaterialId == materialId).ToListAsync();
        _db.MaterialLikes.RemoveRange(likes);
        _db.MaterialFavorites.RemoveRange(favorites);
        _db.MaterialDownloads.RemoveRange(downloads);
        _db.Materials.Remove(material);
        await _db.SaveChangesAsync();

        return MaterialDeleteResult.Success();
    }

    public async Task<MaterialUpdateResult> UpdateOwnAsync(int id, UpdateOwnMaterialRequest request, ClaimsPrincipal user)
    {
        var userId = user.GetUserId();
        var material = await _db.Materials
            .Include(m => m.Instrument)
            .Include(m => m.UploadedByUser)
            .FirstOrDefaultAsync(m => !m.IsDeleted && m.Id == id);
        if (material is null)
            return MaterialUpdateResult.NotFound();

        if (material.UploadedByUserId != userId || material.Status == MaterialStatus.Approved)
            return MaterialUpdateResult.Forbidden();

        if (string.IsNullOrWhiteSpace(request.Title))
            return MaterialUpdateResult.Invalid("Material title is required.");

        if (!await CanUseInstrument(request.InstrumentId, user))
            return MaterialUpdateResult.Forbidden();

        if (request.File is not null)
        {
            var validationError = await ValidateUploadAsync(request.File);
            if (validationError is not null)
                return MaterialUpdateResult.Invalid(validationError);

            var originalFileName = Path.GetFileName(request.File.FileName);
            var extension = GetNormalizedExtension(originalFileName);
            var storedFileName = $"{Guid.NewGuid():N}{extension}";
            var (fileSizeBytes, fileHash) = await ComputeFileSizeAndHashAsync(request.File);
            var storedFile = await _fileStorage.SaveAsync(request.File, "originals", storedFileName);
            material.OriginalFilePath = storedFile.Path;
            material.OriginalFileName = originalFileName;
            material.FileSizeBytes = fileSizeBytes;
            material.FileHashSha256 = fileHash;
        }

        material.Title = request.Title.Trim();
        material.Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim();
        material.InstrumentId = request.InstrumentId;
        material.Level = request.Level;
        material.Status = MaterialStatus.Pending;
        material.ApprovedAtUtc = null;
        material.ApprovedByUserId = null;
        material.ApprovedFilePath = null;
        material.ApprovedFileName = null;
        material.RejectedAtUtc = null;
        material.RejectedByUserId = null;
        material.RejectionReason = null;

        await _db.SaveChangesAsync();
        await _auditLogService.AddAsync(
            userId,
            "UpdateOwnMaterial",
            "Material",
            material.Id,
            $"עודכן החומר שלי: {material.Title}.");

        var updated = await _db.Materials
            .AsNoTracking()
            .Include(m => m.Instrument)
            .Include(m => m.UploadedByUser)
            .Where(m => m.Id == material.Id)
            .Select(m => ToDto(
                m,
                m.MaterialLikes.Any(like => like.UserId == userId),
                m.MaterialFavorites.Any(favorite => favorite.UserId == userId)))
            .FirstAsync();

        return MaterialUpdateResult.Success(updated);
    }

    public async Task<MaterialUpdateResult> UpdateByAdminAsync(int id, UpdateAdminMaterialRequest request, int actorUserId)
    {
        var material = await _db.Materials
            .Include(m => m.Instrument)
            .Include(m => m.UploadedByUser)
            .FirstOrDefaultAsync(m => !m.IsDeleted && m.Id == id);
        if (material is null)
            return MaterialUpdateResult.NotFound();

        var wasApproved = material.Status == MaterialStatus.Approved;

        if (string.IsNullOrWhiteSpace(request.Title))
            return MaterialUpdateResult.Invalid("Material title is required.");

        if (!await _db.Instruments.AnyAsync(i => i.Id == request.InstrumentId && i.IsActive))
            return MaterialUpdateResult.Invalid("Instrument is not available.");

        if (request.File is not null)
        {
            var validationError = await ValidateUploadAsync(request.File);
            if (validationError is not null)
                return MaterialUpdateResult.Invalid(validationError);

            var originalFileName = Path.GetFileName(request.File.FileName);
            var extension = GetNormalizedExtension(originalFileName);
            var storedFileName = $"{Guid.NewGuid():N}{extension}";
            var (fileSizeBytes, fileHash) = await ComputeFileSizeAndHashAsync(request.File);
            var storedFile = await _fileStorage.SaveAsync(request.File, "originals", storedFileName);
            material.OriginalFilePath = storedFile.Path;
            material.OriginalFileName = originalFileName;
            material.FileSizeBytes = fileSizeBytes;
            material.FileHashSha256 = fileHash;

            if (wasApproved)
            {
                material.ApprovedFilePath = storedFile.Path;
                material.ApprovedFileName = originalFileName;
            }
        }

        material.Title = request.Title.Trim();
        material.Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim();
        material.InstrumentId = request.InstrumentId;
        material.Level = request.Level;

        if (!wasApproved)
        {
            material.Status = MaterialStatus.Pending;
            material.ApprovedAtUtc = null;
            material.ApprovedByUserId = null;
            material.ApprovedFilePath = null;
            material.ApprovedFileName = null;
            material.RejectedAtUtc = null;
            material.RejectedByUserId = null;
            material.RejectionReason = null;
        }

        await _db.SaveChangesAsync();
        await _auditLogService.AddAsync(
            actorUserId,
            "UpdateMaterialByAdmin",
            "Material",
            material.Id,
            wasApproved
                ? $"עודכן חומר מאושר: {material.Title}."
                : $"עודכן חומר לפני אישור: {material.Title}.");

        var updated = await _db.Materials
            .AsNoTracking()
            .Include(m => m.Instrument)
            .Include(m => m.UploadedByUser)
            .Where(m => m.Id == material.Id)
            .Select(m => ToDto(m, false, false))
            .FirstAsync();

        return MaterialUpdateResult.Success(updated);
    }

    private IQueryable<Material> VisibleMaterialsQuery(ClaimsPrincipal user)
    {
        var query = _db.Materials
            .Include(m => m.Instrument)
            .Include(m => m.UploadedByUser)
            .Where(m => !m.IsDeleted)
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
            !m.IsDeleted &&
            (m.UploadedByUserId == userId ||
             (m.Status == MaterialStatus.Approved &&
              m.Instrument.UserInstruments.Any(ui => ui.UserId == userId))));
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

    private async Task TryRecordUniqueDownloadAsync(Material material, int userId)
    {
        try
        {
            var alreadyRecorded = await _db.MaterialDownloads
                .AnyAsync(d => d.MaterialId == material.Id && d.UserId == userId);
            if (alreadyRecorded)
                return;

            _db.MaterialDownloads.Add(new MaterialDownload
            {
                MaterialId = material.Id,
                UserId = userId,
                DownloadedAtUtc = DateTime.UtcNow,
            });
            material.DownloadCount += 1;
            await _db.SaveChangesAsync();
        }
        catch (DbUpdateException)
        {
            // A concurrent request may have already recorded this download.
        }
    }

    private static async Task<string?> ValidateUploadAsync(IFormFile file)
    {
        if (file.Length == 0)
            return "File is required.";

        if (file.Length > MaxUploadBytes)
            return "File is too large. Maximum size is 50 MB.";

        var fileName = Path.GetFileName(file.FileName);
        if (string.IsNullOrWhiteSpace(fileName))
            return "File name is required.";

        var extension = GetNormalizedExtension(fileName);
        if (!AllowedFileTypes.TryGetValue(extension, out var allowedContentTypes))
            return "File type is not allowed.";

        if (string.IsNullOrWhiteSpace(file.ContentType) ||
            !allowedContentTypes.Contains(file.ContentType, StringComparer.OrdinalIgnoreCase))
        {
            return "File content type is not allowed.";
        }

        if (!await HasExpectedSignatureAsync(file, extension))
            return "File signature does not match file type.";

        return null;
    }

    private static string GetNormalizedExtension(string fileName)
    {
        return Path.GetExtension(fileName).ToLowerInvariant();
    }

    private static async Task<(long sizeBytes, string sha256Hex)> ComputeFileSizeAndHashAsync(IFormFile file)
    {
        using var sha256 = System.Security.Cryptography.SHA256.Create();
        await using var stream = file.OpenReadStream();
        var hash = await sha256.ComputeHashAsync(stream);
        return (file.Length, Convert.ToHexString(hash).ToLowerInvariant());
    }

    private static async Task<bool> HasExpectedSignatureAsync(IFormFile file, string extension)
    {
        var expectedHeaderLength = extension switch
        {
            ".pdf" => 4,
            ".png" => 8,
            ".jpg" or ".jpeg" => 3,
            _ => 0,
        };
        if (expectedHeaderLength == 0)
            return true;

        var buffer = new byte[expectedHeaderLength];
        await using var stream = file.OpenReadStream();
        var bytesRead = await stream.ReadAsync(buffer.AsMemory(0, expectedHeaderLength));
        if (bytesRead < expectedHeaderLength)
            return false;

        return extension switch
        {
            ".pdf" => buffer.AsSpan().SequenceEqual("%PDF"u8),
            ".png" => buffer.AsSpan().SequenceEqual(new byte[] { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A }),
            ".jpg" or ".jpeg" => buffer[0] == 0xFF && buffer[1] == 0xD8 && buffer[2] == 0xFF,
            _ => true,
        };
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

    private static IEnumerable<string> GetDistinctStoredPaths(params string?[] storedPaths)
    {
        return storedPaths
            .Where(path => !string.IsNullOrWhiteSpace(path))
            .Select(path => path!.Trim())
            .Distinct(StringComparer.OrdinalIgnoreCase);
    }

    private async Task<MaterialDto> ToDtoForUserAsync(Material material, int userId, bool? isLiked = null, bool? isFavorited = null)
    {
        var isLikedByCurrentUser = isLiked ?? await _db.MaterialLikes.AnyAsync(like =>
            like.MaterialId == material.Id &&
            like.UserId == userId);
        var isFavoritedByCurrentUser = isFavorited ?? await _db.MaterialFavorites.AnyAsync(favorite =>
            favorite.MaterialId == material.Id &&
            favorite.UserId == userId);

        return ToDto(material, isLikedByCurrentUser, isFavoritedByCurrentUser);
    }

    private static MaterialDto ToDto(
        Material material,
        bool isLikedByCurrentUser,
        bool isFavoritedByCurrentUser)
    {
        return new MaterialDto(
            material.Id,
            material.Title,
            material.Description,
            material.InstrumentId,
            material.Instrument.Name,
            material.UploadedByUser.FullName,
            material.UploadedByUser.Email,
            material.Level.ToString(),
            material.ApprovedFileName ?? material.OriginalFileName,
            material.Status.ToString(),
            material.DownloadCount,
            material.LikeCount,
            isLikedByCurrentUser,
            isFavoritedByCurrentUser,
            material.CreatedAtUtc,
            material.ApprovedAtUtc,
            material.RejectedAtUtc,
            material.RejectionReason,
            material.FileSizeBytes,
            material.FileHashSha256);
    }
}

public record StoredFileResult(Stream Stream, string FileName, string ContentType);

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

public record MaterialDeleteResult(MaterialDeleteStatus Status, string? ErrorMessage = null)
{
    public static MaterialDeleteResult Success() => new(MaterialDeleteStatus.Success);

    public static MaterialDeleteResult NotFound() => new(MaterialDeleteStatus.NotFound);

    public static MaterialDeleteResult Forbidden(string? message = null) =>
        new(MaterialDeleteStatus.Forbidden, message);

    public static MaterialDeleteResult NotArchived(string message) =>
        new(MaterialDeleteStatus.NotArchived, message);
}

public enum MaterialDeleteStatus
{
    Success,
    NotFound,
    Forbidden,
    NotArchived,
}

public record MaterialUpdateResult(
    MaterialUpdateStatus Status,
    MaterialDto? Material = null,
    string? ErrorMessage = null)
{
    public static MaterialUpdateResult Success(MaterialDto material)
        => new(MaterialUpdateStatus.Success, material);

    public static MaterialUpdateResult NotFound()
        => new(MaterialUpdateStatus.NotFound);

    public static MaterialUpdateResult Forbidden()
        => new(MaterialUpdateStatus.Forbidden);

    public static MaterialUpdateResult Invalid(string message)
        => new(MaterialUpdateStatus.Invalid, ErrorMessage: message);
}

public enum MaterialUpdateStatus
{
    Success,
    NotFound,
    Forbidden,
    Invalid,
}

public record MaterialLikeResult(
    MaterialLikeStatus Status,
    MaterialDto? Material = null,
    string? ErrorMessage = null)
{
    public static MaterialLikeResult Success(MaterialDto material)
        => new(MaterialLikeStatus.Success, material);

    public static MaterialLikeResult NotFound()
        => new(MaterialLikeStatus.NotFound);

    public static MaterialLikeResult Invalid(string message)
        => new(MaterialLikeStatus.Invalid, ErrorMessage: message);
}

public enum MaterialLikeStatus
{
    Success,
    NotFound,
    Invalid,
}

public record MaterialFavoriteResult(
    MaterialFavoriteStatus Status,
    MaterialDto? Material = null,
    string? ErrorMessage = null)
{
    public static MaterialFavoriteResult Success(MaterialDto material)
        => new(MaterialFavoriteStatus.Success, material);

    public static MaterialFavoriteResult NotFound()
        => new(MaterialFavoriteStatus.NotFound);
}

public enum MaterialFavoriteStatus
{
    Success,
    NotFound,
}
