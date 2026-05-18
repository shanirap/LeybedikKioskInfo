using LeybedikInfoKiosk.Server.Data;
using LeybedikInfoKiosk.Server.DTOs;
using LeybedikInfoKiosk.Server.Models;
using Microsoft.EntityFrameworkCore;

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
