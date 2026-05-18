namespace LeybedikInfoKiosk.Server.Models;

public class AuditLog
{
    public int Id { get; set; }
    public int ActorUserId { get; set; }
    public User ActorUser { get; set; } = null!;
    public string Action { get; set; } = string.Empty;
    public string EntityType { get; set; } = string.Empty;
    public int? EntityId { get; set; }
    public string? Details { get; set; }
    public DateTime CreatedAtUtc { get; set; }
}
