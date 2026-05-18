using LeybedikInfoKiosk.Server.DTOs;
using LeybedikInfoKiosk.Server.Models;
using LeybedikInfoKiosk.Server.Security;
using LeybedikInfoKiosk.Server.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LeybedikInfoKiosk.Server.Controllers;

[ApiController]
[Authorize(Roles = "Admin")]
[Route("api/admin/materials")]
public class AdminMaterialsController : ControllerBase
{
    private readonly MaterialService _materialService;

    public AdminMaterialsController(MaterialService materialService)
    {
        _materialService = materialService;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyCollection<MaterialDto>>> GetMaterials([FromQuery] MaterialStatus? status)
    {
        return Ok(await _materialService.GetAdminMaterialsAsync(status));
    }

    [HttpGet("pending")]
    public async Task<ActionResult<IReadOnlyCollection<MaterialDto>>> GetPending()
    {
        return Ok(await _materialService.GetPendingAsync());
    }

    [HttpPost("{id:int}/approve")]
    public async Task<ActionResult<MaterialDto>> Approve(int id)
    {
        var material = await _materialService.ApproveAsync(id, User.GetUserId());
        if (material is null)
            return NotFound();

        return Ok(material);
    }

    [HttpGet("{id:int}/download")]
    public async Task<IActionResult> DownloadForReview(int id)
    {
        var file = await _materialService.GetDownloadAsync(id, User, adminReview: true);
        if (file is null)
            return NotFound(new { message = "Stored file was not found." });

        return PhysicalFile(file.Path, file.ContentType, file.FileName);
    }

    [HttpPost("{id:int}/reject")]
    public async Task<ActionResult<MaterialDto>> Reject(int id)
    {
        var material = await _materialService.RejectAsync(id, User.GetUserId());
        if (material is null)
            return NotFound();

        return Ok(material);
    }
}
