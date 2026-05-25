namespace LeybedikInfoKiosk.Server.DTOs;

public record MaterialDto(
    int Id,
    string Title,
    string? Description,
    int InstrumentId,
    string InstrumentName,
    string UploadedByName,
    string UploadedByEmail,
    string Level,
    string FileName,
    string Status,
    int DownloadCount,
    int LikeCount,
    bool IsLikedByCurrentUser,
    bool IsFavoritedByCurrentUser,
    DateTime CreatedAtUtc,
    DateTime? ApprovedAtUtc,
    DateTime? RejectedAtUtc,
    string? RejectionReason,
    long? FileSizeBytes,
    string? FileHashSha256
);
