namespace LeybedikInfoKiosk.Server.Models;

public class Instrument
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;

    public ICollection<UserInstrument> UserInstruments { get; set; } = new List<UserInstrument>();
    public ICollection<Material> Materials { get; set; } = new List<Material>();
}
