using Microsoft.AspNetCore.Mvc;

namespace LeybedikInfoKiosk.Server.Controllers;

[ApiController]
[Route("api/[controller]")]
public class HealthController : ControllerBase
{
    [HttpGet]
    public ContentResult Get()
    {
        return Content("OK", "text/plain");
    }
}
