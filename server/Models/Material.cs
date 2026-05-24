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

    public MaterialLevel Level { get; set; } = MaterialLevel.Beginner;
    public MaterialStatus Status { get; set; } = MaterialStatus.Pending;

    public string OriginalFilePath { get; set; } = string.Empty;
    public string OriginalFileName { get; set; } = string.Empty;
    public string? ApprovedFilePath { get; set; }
    public string? ApprovedFileName { get; set; }

    public int DownloadCount { get; set; }
    public int LikeCount { get; set; }
    public long? FileSizeBytes { get; set; }
    public string? FileHashSha256 { get; set; }

    public DateTime CreatedAtUtc { get; set; }
    public DateTime? ApprovedAtUtc { get; set; }
    public int? ApprovedByUserId { get; set; }
    public bool IsDeleted { get; set; }
    public DateTime? DeletedAtUtc { get; set; }
    public int? DeletedByUserId { get; set; }
    public User? DeletedByUser { get; set; }
    public DateTime? RestoredAtUtc { get; set; }
    public int? RestoredByUserId { get; set; }
    public User? RestoredByUser { get; set; }
    public DateTime? RejectedAtUtc { get; set; }
    public int? RejectedByUserId { get; set; }
    public User? RejectedByUser { get; set; }
    public string? RejectionReason { get; set; }

    public ICollection<MaterialLike> MaterialLikes { get; set; } = new List<MaterialLike>();
}
