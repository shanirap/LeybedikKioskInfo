using System.ComponentModel.DataAnnotations;

namespace LeybedikInfoKiosk.Server.DTOs;

public class ResetPasswordRequest
{
    [Required]
    [MinLength(8)]
    public string NewPassword { get; set; } = string.Empty;
}
