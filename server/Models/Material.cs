namespace LeybedikInfoKiosk.Server.Models;

public class Material
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }

    public int InstrumentId { get; set; }
    public Instrument Instrument { get; set; } = null!;

    public int UploadedByUserId { get; set; }
    public User UploadedByUser { get; set; } = null!;

    public MaterialStatus Status { get; set; } = MaterialStatus.Pending;

    public string OriginalFilePath { get; set; } = string.Empty;
    public string OriginalFileName { get; set; } = string.Empty;
    public string? ApprovedFilePath { get; set; }
    public string? ApprovedFileName { get; set; }

    public int DownloadCount { get; set; }
    public int LikeCount { get; set; }

    public DateTime CreatedAtUtc { get; set; }
    public DateTime? ApprovedAtUtc { get; set; }
    public int? ApprovedByUserId { get; set; }

    public ICollection<MaterialLike> MaterialLikes { get; set; } = new List<MaterialLike>();
}
