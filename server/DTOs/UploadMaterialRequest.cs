using System.ComponentModel.DataAnnotations;

namespace LeybedikInfoKiosk.Server.DTOs;

public class UploadMaterialRequest
{
    [Required]
    [MaxLength(250)]
    public string Title { get; set; } = string.Empty;

    public string? Description { get; set; }

    [Required]
    public int InstrumentId { get; set; }

    [Required]
    public IFormFile File { get; set; } = null!;
}
