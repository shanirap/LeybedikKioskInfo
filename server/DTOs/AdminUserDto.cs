namespace LeybedikInfoKiosk.Server.DTOs;

public record AdminUserDto(
    int Id,
    string FullName,
    string Email,
    string Role,
    bool IsActive,
    IReadOnlyCollection<InstrumentDto> Instruments
);
