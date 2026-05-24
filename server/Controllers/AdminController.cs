using LeybedikInfoKiosk.Server.DTOs;
using LeybedikInfoKiosk.Server.Models;
using LeybedikInfoKiosk.Server.Security;
using LeybedikInfoKiosk.Server.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LeybedikInfoKiosk.Server.Controllers;

[ApiController]
[Authorize(Roles = "Admin")]
[Route("api/admin")]
public class AdminController : ControllerBase
{
    private readonly UserService _userService;
    private readonly InstrumentService _instrumentService;

    public AdminController(UserService userService, InstrumentService instrumentService)
    {
        _userService = userService;
        _instrumentService = instrumentService;
    }

    [HttpGet("users")]
    public async Task<ActionResult<IReadOnlyCollection<AdminUserDto>>> GetUsers(
        [FromQuery] string? search,
        [FromQuery] UserRole? role,
        [FromQuery] int? minLikes,
        [FromQuery] int? minDownloads)
    {
        return Ok(await _userService.GetUsersAsync(search, role, minLikes, minDownloads));
    }

    [HttpPost("users")]
    public async Task<ActionResult<AdminUserDto>> CreateUser([FromBody] CreateUserRequest request)
    {
        var result = await _userService.CreateAsync(request, User.GetUserId());
        if (result.Status == UserCreateStatus.BadRequest)
            return BadRequest(new { message = result.ErrorMessage ?? "Invalid request." });

        if (result.Status == UserCreateStatus.Conflict)
            return Conflict(new { message = "Email is already in use." });

        return CreatedAtAction(nameof(GetUsers), new { id = result.User!.Id }, result.User);
    }

    [HttpPut("users/{id:int}")]
    public async Task<ActionResult<AdminUserDto>> UpdateUser(int id, [FromBody] UpdateUserRequest request)
    {
        var result = await _userService.UpdateAsync(id, request, User.GetUserId());
        if (result.Status == UserUpdateStatus.NotFound)
            return NotFound();

        if (result.Status == UserUpdateStatus.Conflict)
            return Conflict(new { message = "Email is already in use." });

        if (result.Status == UserUpdateStatus.BadRequest)
            return BadRequest(new { message = result.ErrorMessage ?? "Invalid request." });

        return Ok(result.User);
    }

    [HttpPut("users/{id:int}/instruments")]
    public async Task<ActionResult<AdminUserDto>> UpdateUserInstruments(
        int id,
        [FromBody] UpdateUserInstrumentsRequest request)
    {
        var result = await _userService.UpdateInstrumentsAsync(id, request, User.GetUserId());
        if (result.Status == UserUpdateStatus.NotFound)
            return NotFound();

        if (result.Status == UserUpdateStatus.BadRequest)
            return BadRequest(new { message = "Only teachers can have instrument assignments." });

        return Ok(result.User);
    }

    [HttpPut("users/{id:int}/password")]
    public async Task<ActionResult<AdminUserDto>> ResetUserPassword(
        int id,
        [FromBody] ResetPasswordRequest request)
    {
        var result = await _userService.ResetPasswordAsync(id, request, User.GetUserId());
        if (result.Status == UserUpdateStatus.NotFound)
            return NotFound();

        return Ok(result.User);
    }

    [HttpGet("instruments")]
    public async Task<ActionResult<IReadOnlyCollection<InstrumentDto>>> GetInstruments()
    {
        return Ok(await _instrumentService.GetAdminAsync());
    }

    [HttpPost("instruments")]
    public async Task<ActionResult<InstrumentDto>> CreateInstrument([FromBody] CreateInstrumentRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
            return BadRequest(new { message = "Instrument name is required." });

        var instrument = await _instrumentService.CreateAsync(request, User.GetUserId());
        if (instrument is null)
            return Conflict(new { message = "Instrument name is already in use." });

        return CreatedAtAction(
            nameof(GetInstruments),
            new { id = instrument.Id },
            instrument);
    }

    [HttpPut("instruments/{id:int}")]
    public async Task<ActionResult<InstrumentDto>> UpdateInstrument(
        int id,
        [FromBody] UpdateInstrumentRequest request)
    {
        var result = await _instrumentService.UpdateAsync(id, request, User.GetUserId());
        if (result.Status == InstrumentUpdateStatus.NotFound)
            return NotFound();

        if (result.Status == InstrumentUpdateStatus.Conflict)
            return Conflict(new { message = "Instrument name is already in use." });

        if (result.Status == InstrumentUpdateStatus.BadRequest)
            return BadRequest(new { message = result.ErrorMessage ?? "Invalid request." });

        return Ok(result.Instrument);
    }
}
