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

    [HttpGet]
    public async Task<ActionResult<IReadOnlyCollection<AuditLogDto>>> Get([FromQuery] int take = 100)
    {
        return Ok(await _auditLogService.GetRecentAsync(take));
    }
}
