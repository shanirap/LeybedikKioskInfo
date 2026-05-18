using System.ComponentModel.DataAnnotations;
using LeybedikInfoKiosk.Server.Models;

namespace LeybedikInfoKiosk.Server.DTOs;

public class CreateUserRequest
{
    [Required]
    [MaxLength(200)]
    public string FullName { get; set; } = string.Empty;

    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Required]
    [MinLength(8)]
    public string Password { get; set; } = string.Empty;

    [Required]
    public UserRole Role { get; set; } = UserRole.Teacher;

    public bool IsActive { get; set; } = true;

    public IReadOnlyCollection<int> InstrumentIds { get; set; } = [];
}
