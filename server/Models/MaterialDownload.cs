namespace LeybedikInfoKiosk.Server.Models;

public class MaterialDownload
{
    public int Id { get; set; }
    public int MaterialId { get; set; }
    public Material Material { get; set; } = null!;
    public int UserId { get; set; }
    public User User { get; set; } = null!;
    public DateTime DownloadedAtUtc { get; set; }
}
