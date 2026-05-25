namespace LeybedikInfoKiosk.Server.Models;

public class User
{
    public int Id { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public UserRole Role { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAtUtc { get; set; }

    public ICollection<UserInstrument> UserInstruments { get; set; } = new List<UserInstrument>();
    public ICollection<Material> UploadedMaterials { get; set; } = new List<Material>();
    public ICollection<MaterialLike> MaterialLikes { get; set; } = new List<MaterialLike>();
    public ICollection<MaterialFavorite> MaterialFavorites { get; set; } = new List<MaterialFavorite>();
    public ICollection<MaterialDownload> MaterialDownloads { get; set; } = new List<MaterialDownload>();
}
