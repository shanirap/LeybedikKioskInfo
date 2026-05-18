namespace LeybedikInfoKiosk.Server.Models;

public class UserInstrument
{
    public int UserId { get; set; }
    public User User { get; set; } = null!;

    public int InstrumentId { get; set; }
    public Instrument Instrument { get; set; } = null!;
}
