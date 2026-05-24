using LeybedikInfoKiosk.Server.Data;
using LeybedikInfoKiosk.Server.DTOs;
using LeybedikInfoKiosk.Server.Models;
using Microsoft.EntityFrameworkCore;
// PagedResult is in the DTOs namespace - no extra using needed

namespace LeybedikInfoKiosk.Server.Services;

public class AuditLogService
{
    private readonly AppDbContext _db;

    public AuditLogService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<IReadOnlyCollection<AuditLogDto>> GetRecentAsync(int take)
    {
        var limit = Math.Clamp(take, 1, 500);

        return await _db.AuditLogs
            .AsNoTracking()
            .Include(log => log.ActorUser)
            .OrderByDescending(log => log.CreatedAtUtc)
            .Take(limit)
            .Select(log => new AuditLogDto(
                log.Id,
                log.ActorUserId,
                log.ActorUser.FullName,
                log.Action,
                log.EntityType,
                log.EntityId,
                log.Details,
                log.CreatedAtUtc))
            .ToListAsync();
    }

    public async Task<PagedResult<AuditLogDto>> GetPagedAsync(string? search, int page, int pageSize)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 200);

        var query = _db.AuditLogs
            .AsNoTracking()
            .Include(log => log.ActorUser)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim();
            query = query.Where(log =>
                log.Action.Contains(term) ||
                log.EntityType.Contains(term) ||
                log.ActorUser.FullName.Contains(term) ||
                (log.Details != null && log.Details.Contains(term)));
        }

        var totalCount = await query.CountAsync();
        var items = await query
            .OrderByDescending(log => log.CreatedAtUtc)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(log => new AuditLogDto(
                log.Id,
                log.ActorUserId,
                log.ActorUser.FullName,
                log.Action,
                log.EntityType,
                log.EntityId,
                log.Details,
                log.CreatedAtUtc))
            .ToListAsync();

        return new PagedResult<AuditLogDto>(items, totalCount, page, pageSize);
    }

    public async Task AddAsync(int actorUserId, string action, string entityType, int? entityId, string? details)
    {
        _db.AuditLogs.Add(new AuditLog
        {
            ActorUserId = actorUserId,
            Action = action,
            EntityType = entityType,
            EntityId = entityId,
            Details = details,
            CreatedAtUtc = DateTime.UtcNow,
        });

        await _db.SaveChangesAsync();
    }
}
