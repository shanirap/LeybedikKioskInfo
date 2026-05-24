using System.Net.Mail;
using LeybedikInfoKiosk.Server.Data;
using LeybedikInfoKiosk.Server.Models;
using LeybedikInfoKiosk.Server.Security;
using Microsoft.EntityFrameworkCore;

namespace LeybedikInfoKiosk.Server.Services;

public class BootstrapAdminService
{
    public const int MinimumPasswordLength = 8;

    private readonly AppDbContext _db;
    private readonly IConfiguration _configuration;
    private readonly IWebHostEnvironment _environment;
    private readonly ILogger<BootstrapAdminService> _logger;

    public BootstrapAdminService(
        AppDbContext db,
        IConfiguration configuration,
        IWebHostEnvironment environment,
        ILogger<BootstrapAdminService> logger)
    {
        _db = db;
        _configuration = configuration;
        _environment = environment;
        _logger = logger;
    }

    public async Task<BootstrapAdminOutcome> TryBootstrapAsync(CancellationToken cancellationToken = default)
    {
        if (_environment.IsDevelopment())
            return BootstrapAdminOutcome.SkippedDevelopment;

        if (!_configuration.GetValue<bool>("BootstrapAdmin:Enabled"))
            return BootstrapAdminOutcome.SkippedDisabled;

        if (await _db.Users.AnyAsync(u => u.Role == UserRole.Admin, cancellationToken))
            return BootstrapAdminOutcome.SkippedAdminExists;

        var fullName = _configuration["BootstrapAdmin:FullName"]?.Trim();
        var email = NormalizeEmail(_configuration["BootstrapAdmin:Email"]);
        var password = _configuration["BootstrapAdmin:Password"];

        if (string.IsNullOrWhiteSpace(fullName))
        {
            _logger.LogWarning("Bootstrap admin skipped because BootstrapAdmin:FullName is missing.");
            return BootstrapAdminOutcome.SkippedInvalidConfiguration;
        }

        if (!IsValidEmail(email))
        {
            _logger.LogWarning("Bootstrap admin skipped because BootstrapAdmin:Email is invalid.");
            return BootstrapAdminOutcome.SkippedInvalidConfiguration;
        }

        if (string.IsNullOrWhiteSpace(password) || password.Length < MinimumPasswordLength)
        {
            _logger.LogWarning(
                "Bootstrap admin skipped because BootstrapAdmin:Password must be at least {MinimumPasswordLength} characters.",
                MinimumPasswordLength);
            return BootstrapAdminOutcome.SkippedInvalidConfiguration;
        }

        if (await _db.Users.AnyAsync(u => u.Email == email, cancellationToken))
        {
            _logger.LogWarning("Bootstrap admin skipped because user {Email} already exists.", email);
            return BootstrapAdminOutcome.SkippedInvalidConfiguration;
        }

        var admin = new User
        {
            FullName = fullName,
            Email = email,
            PasswordHash = PasswordHasher.HashPassword(password),
            Role = UserRole.Admin,
            IsActive = true,
            CreatedAtUtc = DateTime.UtcNow,
        };

        _db.Users.Add(admin);
        await _db.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Created first admin user {Email}.", email);
        return BootstrapAdminOutcome.Created;
    }

    internal static string NormalizeEmail(string? email)
    {
        return email?.Trim().ToLowerInvariant() ?? string.Empty;
    }

    internal static bool IsValidEmail(string email)
    {
        if (string.IsNullOrWhiteSpace(email))
            return false;

        try
        {
            var parsed = new MailAddress(email);
            return parsed.Address.Equals(email, StringComparison.OrdinalIgnoreCase);
        }
        catch (FormatException)
        {
            return false;
        }
    }
}

public enum BootstrapAdminOutcome
{
    SkippedDevelopment,
    SkippedDisabled,
    SkippedAdminExists,
    SkippedInvalidConfiguration,
    Created,
}
