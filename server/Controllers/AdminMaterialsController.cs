using LeybedikInfoKiosk.Server.DTOs;
using LeybedikInfoKiosk.Server.Models;
using LeybedikInfoKiosk.Server.Security;
using LeybedikInfoKiosk.Server.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
// PagedResult<T> is in LeybedikInfoKiosk.Server.DTOs

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
    public async Task<ActionResult<PagedResult<MaterialDto>>> GetMaterials(
        [FromQuery] MaterialStatus? status,
        [FromQuery] string? search,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        return Ok(await _materialService.GetAdminMaterialsAsync(status, search, page, pageSize));
    }

    [HttpGet("pending")]
    public async Task<ActionResult<IReadOnlyCollection<MaterialDto>>> GetPending()
    {
        return Ok(await _materialService.GetPendingAsync());
    }

    [HttpGet("archived")]
    public async Task<ActionResult<PagedResult<MaterialDto>>> GetArchived(
        [FromQuery] string? search,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        return Ok(await _materialService.GetArchivedAsync(search, page, pageSize));
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

        return File(file.Stream, file.ContentType, file.FileName, enableRangeProcessing: true);
    }

    [HttpPost("{id:int}/reject")]
    public async Task<ActionResult<MaterialDto>> Reject(int id, [FromBody] RejectMaterialRequest? request)
    {
        var material = await _materialService.RejectAsync(id, request ?? new RejectMaterialRequest(), User.GetUserId());
        if (material is null)
            return NotFound();

        return Ok(material);
    }

    [HttpPost("{id:int}/restore")]
    public async Task<ActionResult<MaterialDto>> Restore(int id)
    {
        var material = await _materialService.RestoreByAdminAsync(id, User.GetUserId());
        if (material is null)
            return NotFound();

        return Ok(material);
    }

    [HttpPut("{id:int}")]
    [RequestSizeLimit(50_000_000)]
    public async Task<ActionResult<MaterialDto>> Update(int id, [FromForm] UpdateAdminMaterialRequest request)
    {
        var result = await _materialService.UpdateByAdminAsync(id, request, User.GetUserId());
        return result.Status switch
        {
            MaterialUpdateStatus.Success => Ok(result.Material),
            MaterialUpdateStatus.NotFound => NotFound(),
            MaterialUpdateStatus.Forbidden => Forbid(),
            _ => BadRequest(new { message = result.ErrorMessage ?? "Invalid request." }),
        };
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var result = await _materialService.DeleteByAdminAsync(id, User.GetUserId());
        return result.Status switch
        {
            MaterialDeleteStatus.Success => NoContent(),
            MaterialDeleteStatus.NotFound => NotFound(),
            _ => Forbid(),
        };
    }
}
