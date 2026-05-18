using LeybedikInfoKiosk.Server.DTOs;
using LeybedikInfoKiosk.Server.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LeybedikInfoKiosk.Server.Controllers;

[ApiController]
[Authorize]
[Route("api/[controller]")]
public class MaterialsController : ControllerBase
{
    private readonly MaterialService _materialService;

    public MaterialsController(MaterialService materialService)
    {
        _materialService = materialService;
    }

    [HttpGet("approved")]
    public async Task<ActionResult<IReadOnlyCollection<MaterialDto>>> GetApproved()
    {
        return Ok(await _materialService.GetApprovedAsync(User));
    }

    [HttpGet("my-uploads")]
    public async Task<ActionResult<IReadOnlyCollection<MaterialDto>>> GetMyUploads()
    {
        return Ok(await _materialService.GetMyUploadsAsync(User));
    }

    [HttpPost("upload")]
    [RequestSizeLimit(50_000_000)]
    public async Task<ActionResult<MaterialDto>> Upload([FromForm] UploadMaterialRequest request)
    {
        var result = await _materialService.UploadAsync(request, User);
        return result.Status switch
        {
            MaterialUploadStatus.Success => CreatedAtAction(
                nameof(GetApproved),
                new { id = result.Material!.Id },
                result.Material),
            MaterialUploadStatus.Forbidden => Forbid(),
            _ => BadRequest(new { message = result.ErrorMessage ?? "Could not upload material." }),
        };
    }

    [HttpGet("{id:int}/download")]
    public async Task<IActionResult> Download(int id)
    {
        var file = await _materialService.GetDownloadAsync(id, User, adminReview: false);
        if (file is null)
            return NotFound(new { message = "Stored file was not found." });

        return PhysicalFile(file.Path, file.ContentType, file.FileName);
    }

    [HttpGet("{id:int}/preview")]
    public async Task<IActionResult> Preview(int id)
    {
        var file = await _materialService.GetPreviewAsync(id, User);
        if (file is null)
            return NotFound(new { message = "Stored file was not found." });

        return PhysicalFile(file.Path, file.ContentType, enableRangeProcessing: true);
    }

    [HttpPost("{id:int}/like")]
    public async Task<ActionResult<MaterialDto>> Like(int id)
    {
        var material = await _materialService.LikeAsync(id, User);
        if (material is null)
            return NotFound();

        return Ok(material);
    }
}
