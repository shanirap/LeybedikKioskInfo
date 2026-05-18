namespace LeybedikInfoKiosk.Server.DTOs;

public class UpdateUserInstrumentsRequest
{
    public IReadOnlyCollection<int> InstrumentIds { get; set; } = [];
}
