using LeybedikInfoKiosk.Server.DTOs;
using LeybedikInfoKiosk.Server.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LeybedikInfoKiosk.Server.Controllers;

[ApiController]
[Authorize(Roles = "Admin")]
[Route("api/admin/audit-logs")]
public class AdminAuditLogsController : ControllerBase
{
    private readonly AuditLogService _auditLogService;

    public AdminAuditLogsController(AuditLogService auditLogService)
    {
        _auditLogService = auditLogService;
    }

    /// <summary>Legacy endpoint kept for backward compatibility; returns up to 500 most recent logs.</summary>
    [HttpGet("recent")]
    public async Task<ActionResult<IReadOnlyCollection<AuditLogDto>>> GetRecent([FromQuery] int take = 100)
    {
        return Ok(await _auditLogService.GetRecentAsync(take));
    }

    [HttpGet]
    public async Task<ActionResult<PagedResult<AuditLogDto>>> Get(
        [FromQuery] string? search,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
    {
        return Ok(await _auditLogService.GetPagedAsync(search, page, pageSize));
    }
}
