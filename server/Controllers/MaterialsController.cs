using LeybedikInfoKiosk.Server.DTOs;
using LeybedikInfoKiosk.Server.Models;
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
    public async Task<ActionResult<PagedResult<MaterialDto>>> GetMyUploads(
        [FromQuery] string? search,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        return Ok(await _materialService.GetMyUploadsPagedAsync(User, search, page, pageSize));
    }

    [HttpGet("my-wallet")]
    [Authorize(Roles = "Teacher,Admin")]
    public async Task<ActionResult<TeacherWalletDto>> GetMyWallet()
    {
        return Ok(await _materialService.GetTeacherWalletAsync(User));
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<MaterialDto>> GetPreviewDetails(int id)
    {
        var material = await _materialService.GetPreviewDetailsAsync(id, User);
        if (material is null)
            return NotFound();

        return Ok(material);
    }

    [HttpPost("upload")]
    [RequestSizeLimit(50_000_000)]
    public async Task<ActionResult<MaterialDto>> Upload([FromForm] UploadMaterialRequest request)
    {
        var result = await _materialService.UploadAsync(request, User);
        return result.Status switch
        {
            MaterialUploadStatus.Success => CreatedAtAction(
                nameof(GetPreviewDetails),
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

        return File(file.Stream, file.ContentType, file.FileName, enableRangeProcessing: true);
    }

    [HttpGet("{id:int}/preview")]
    public async Task<IActionResult> Preview(int id)
    {
        var file = await _materialService.GetPreviewAsync(id, User);
        if (file is null)
            return NotFound(new { message = "Stored file was not found." });

        return File(file.Stream, file.ContentType, enableRangeProcessing: true);
    }

    [HttpPost("{id:int}/like")]
    public async Task<ActionResult<MaterialDto>> Like(int id)
    {
        var result = await _materialService.LikeAsync(id, User);
        return result.Status switch
        {
            MaterialLikeStatus.Success => Ok(result.Material),
            MaterialLikeStatus.NotFound => NotFound(),
            _ => BadRequest(new { message = result.ErrorMessage ?? "Invalid request." }),
        };
    }

    [HttpDelete("my-uploads/{id:int}")]
    public async Task<IActionResult> DeleteMyUpload(int id)
    {
        var result = await _materialService.DeleteOwnAsync(id, User);
        return result.Status switch
        {
            MaterialDeleteStatus.Success => NoContent(),
            MaterialDeleteStatus.NotFound => NotFound(),
            MaterialDeleteStatus.Forbidden => StatusCode(
                StatusCodes.Status403Forbidden,
                new { message = result.ErrorMessage ?? "You cannot archive this material." }),
            _ => Forbid(),
        };
    }

    [HttpPut("my-uploads/{id:int}")]
    [RequestSizeLimit(50_000_000)]
    public async Task<ActionResult<MaterialDto>> UpdateMyUpload(int id, [FromForm] UpdateOwnMaterialRequest request)
    {
        var result = await _materialService.UpdateOwnAsync(id, request, User);
        return result.Status switch
        {
            MaterialUpdateStatus.Success => Ok(result.Material),
            MaterialUpdateStatus.NotFound => NotFound(),
            MaterialUpdateStatus.Forbidden => Forbid(),
            _ => BadRequest(new { message = result.ErrorMessage ?? "Invalid request." }),
        };
    }
}
