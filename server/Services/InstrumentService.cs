using System.Security.Claims;
using LeybedikInfoKiosk.Server.Data;
using LeybedikInfoKiosk.Server.DTOs;
using LeybedikInfoKiosk.Server.Models;
using LeybedikInfoKiosk.Server.Security;
using Microsoft.EntityFrameworkCore;

namespace LeybedikInfoKiosk.Server.Services;

public class InstrumentService
{
    private readonly AppDbContext _db;
    private readonly AuditLogService _auditLogService;

    public InstrumentService(AppDbContext db, AuditLogService auditLogService)
    {
        _db = db;
        _auditLogService = auditLogService;
    }

    public async Task<IReadOnlyCollection<InstrumentDto>> GetVisibleAsync(ClaimsPrincipal user)
    {
        var query = _db.Instruments
            .AsNoTracking()
            .Where(i => i.IsActive);

        if (!user.IsAdmin())
        {
            var userId = user.GetUserId();
            query = query.Where(i => i.UserInstruments.Any(ui => ui.UserId == userId));
        }

        return await query
            .OrderBy(i => i.Name)
            .Select(i => ToDto(i))
            .ToListAsync();
    }

    public async Task<IReadOnlyCollection<InstrumentDto>> GetAdminAsync()
    {
        return await _db.Instruments
            .AsNoTracking()
            .OrderBy(i => i.Name)
            .Select(i => ToDto(i))
            .ToListAsync();
    }

    public async Task<InstrumentDto?> CreateAsync(CreateInstrumentRequest request, int actorUserId)
    {
        var name = request.Name.Trim();
        if (await _db.Instruments.AnyAsync(i => i.Name == name))
            return null;

        var instrument = new Instrument
        {
            Name = name,
            IsActive = request.IsActive,
        };

        _db.Instruments.Add(instrument);
        await _db.SaveChangesAsync();
        await _auditLogService.AddAsync(
            actorUserId,
            "CreateInstrument",
            "Instrument",
            instrument.Id,
            $"Created instrument {instrument.Name}.");

        return ToDto(instrument);
    }

    public async Task<InstrumentUpdateResult> UpdateAsync(
        int id,
        UpdateInstrumentRequest request,
        int actorUserId)
    {
        var instrument = await _db.Instruments.FirstOrDefaultAsync(i => i.Id == id);
        if (instrument is null)
            return InstrumentUpdateResult.NotFound();

        var name = request.Name.Trim();
        if (await _db.Instruments.AnyAsync(i => i.Id != id && i.Name == name))
            return InstrumentUpdateResult.Conflict();

        instrument.Name = name;
        instrument.IsActive = request.IsActive;

        await _db.SaveChangesAsync();
        await _auditLogService.AddAsync(
            actorUserId,
            "UpdateInstrument",
            "Instrument",
            instrument.Id,
            $"Updated instrument {instrument.Name}.");

        return InstrumentUpdateResult.Success(ToDto(instrument));
    }

    private static InstrumentDto ToDto(Instrument instrument)
    {
        return new InstrumentDto(instrument.Id, instrument.Name, instrument.IsActive);
    }
}

public record InstrumentUpdateResult(InstrumentUpdateStatus Status, InstrumentDto? Instrument = null)
{
    public static InstrumentUpdateResult Success(InstrumentDto instrument)
        => new(InstrumentUpdateStatus.Success, instrument);

    public static InstrumentUpdateResult NotFound()
        => new(InstrumentUpdateStatus.NotFound);

    public static InstrumentUpdateResult Conflict()
        => new(InstrumentUpdateStatus.Conflict);
}

public enum InstrumentUpdateStatus
{
    Success,
    NotFound,
    Conflict,
}
