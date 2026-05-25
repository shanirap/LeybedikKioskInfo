namespace LeybedikInfoKiosk.Server.Models;

public class MaterialFavorite
{
    public int MaterialId { get; set; }
    public Material Material { get; set; } = null!;

    public int UserId { get; set; }
    public User User { get; set; } = null!;

    public DateTime CreatedAtUtc { get; set; }
}
