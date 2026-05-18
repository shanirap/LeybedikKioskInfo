namespace LeybedikInfoKiosk.Server.DTOs;

public record AuditLogDto(
    int Id,
    int ActorUserId,
    string ActorName,
    string Action,
    string EntityType,
    int? EntityId,
    string? Details,
    DateTime CreatedAtUtc
);
