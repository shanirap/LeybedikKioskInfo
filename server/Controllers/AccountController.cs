using LeybedikInfoKiosk.Server.DTOs;
using LeybedikInfoKiosk.Server.Security;
using LeybedikInfoKiosk.Server.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LeybedikInfoKiosk.Server.Controllers;

[ApiController]
[Authorize]
[Route("api/account")]
public class AccountController : ControllerBase
{
    private readonly UserService _userService;

    public AccountController(UserService userService)
    {
        _userService = userService;
    }

    [HttpPut("password")]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request)
    {
        var result = await _userService.ChangePasswordAsync(User.GetUserId(), request);

        return result.Status switch
        {
            PasswordChangeStatus.Success => NoContent(),
            PasswordChangeStatus.InvalidCurrentPassword => BadRequest(new { message = "Current password is incorrect." }),
            _ => NotFound(),
        };
    }
}
