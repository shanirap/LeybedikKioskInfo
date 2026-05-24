using System.ComponentModel.DataAnnotations;

namespace LeybedikInfoKiosk.Server.DTOs;

public class RejectMaterialRequest
{
    [MaxLength(1000)]
    public string? Reason { get; set; }
}
