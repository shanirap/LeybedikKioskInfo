using LeybedikInfoKiosk.Server.DTOs;
using LeybedikInfoKiosk.Server.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LeybedikInfoKiosk.Server.Controllers;

[ApiController]
[Authorize]
[Route("api/[controller]")]
public class InstrumentsController : ControllerBase
{
    private readonly InstrumentService _instrumentService;

    public InstrumentsController(InstrumentService instrumentService)
    {
        _instrumentService = instrumentService;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyCollection<InstrumentDto>>> Get()
    {
        return Ok(await _instrumentService.GetVisibleAsync(User));
    }
}
