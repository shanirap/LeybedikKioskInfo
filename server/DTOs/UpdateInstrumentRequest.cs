using System.ComponentModel.DataAnnotations;

namespace LeybedikInfoKiosk.Server.DTOs;

public class UpdateInstrumentRequest
{
    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    public bool IsActive { get; set; }
}
