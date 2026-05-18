using System.ComponentModel.DataAnnotations;
using LeybedikInfoKiosk.Server.Models;

namespace LeybedikInfoKiosk.Server.DTOs;

public class UpdateUserRequest
{
    [Required]
    [MaxLength(200)]
    public string FullName { get; set; } = string.Empty;

    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Required]
    public UserRole Role { get; set; }

    public bool IsActive { get; set; }
}
