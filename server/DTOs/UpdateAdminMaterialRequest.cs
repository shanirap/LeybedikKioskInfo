using System.ComponentModel.DataAnnotations;
using LeybedikInfoKiosk.Server.Models;

namespace LeybedikInfoKiosk.Server.DTOs;

public class UpdateAdminMaterialRequest
{
    [Required]
    [MaxLength(250)]
    public string Title { get; set; } = string.Empty;

    public string? Description { get; set; }

    [Required]
    public int InstrumentId { get; set; }

    [Required]
    public MaterialLevel Level { get; set; } = MaterialLevel.Beginner;

    public IFormFile? File { get; set; }
}
