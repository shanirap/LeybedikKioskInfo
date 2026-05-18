namespace LeybedikInfoKiosk.Server.DTOs;

public record MaterialDto(
    int Id,
    string Title,
    string? Description,
    int InstrumentId,
    string InstrumentName,
    string UploadedByName,
    string FileName,
    string Status,
    int DownloadCount,
    int LikeCount,
    bool IsLikedByCurrentUser,
    DateTime CreatedAtUtc,
    DateTime? ApprovedAtUtc
);
