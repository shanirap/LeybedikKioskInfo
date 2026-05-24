namespace LeybedikInfoKiosk.Server.DTOs;

public record TeacherWalletDto(
    int TotalLikes,
    int TotalUniqueDownloads,
    int TotalMaterials,
    IReadOnlyCollection<TeacherWalletMaterialDto> Materials);

public record TeacherWalletMaterialDto(
    int MaterialId,
    string Title,
    string InstrumentName,
    string Status,
    int LikesCount,
    int UniqueDownloadsCount);
