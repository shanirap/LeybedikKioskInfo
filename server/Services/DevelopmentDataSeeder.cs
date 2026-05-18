using LeybedikInfoKiosk.Server.Data;
using LeybedikInfoKiosk.Server.Models;
using LeybedikInfoKiosk.Server.Security;
using Microsoft.EntityFrameworkCore;

namespace LeybedikInfoKiosk.Server.Services;

public class DevelopmentDataSeeder
{
    private readonly AppDbContext _db;

    public DevelopmentDataSeeder(AppDbContext db)
    {
        _db = db;
    }

    public async Task SeedAsync()
    {
        var createdAtUtc = new DateTime(2026, 1, 1, 12, 0, 0, DateTimeKind.Utc);

        var admin = await EnsureUser(
            "admin@leybedik.local",
            "System Admin",
            "Admin123!",
            UserRole.Admin,
            createdAtUtc);
        var teacher = await EnsureUser(
            "teacher@leybedik.local",
            "Demo Teacher",
            "Teacher123!",
            UserRole.Teacher,
            createdAtUtc);

        var piano = await EnsureInstrument("Piano");
        var guitar = await EnsureInstrument("Guitar");
        var violin = await EnsureInstrument("Violin");
        var drums = await EnsureInstrument("Drums");

        await EnsureTeacherInstrument(teacher.Id, piano.Id);
        await EnsureTeacherInstrument(teacher.Id, guitar.Id);

        await EnsureMaterial(
            "Piano Basics",
            "Demo approved piano material.",
            piano.Id,
            teacher.Id,
            admin.Id,
            MaterialStatus.Approved,
            "Storage/demo/piano-basics.pdf",
            "piano-basics.pdf",
            createdAtUtc);
        await EnsureMaterial(
            "Guitar Chords",
            "Demo approved guitar material.",
            guitar.Id,
            teacher.Id,
            admin.Id,
            MaterialStatus.Approved,
            "Storage/demo/guitar-chords.pdf",
            "guitar-chords.pdf",
            createdAtUtc);
        await EnsureMaterial(
            "Violin Warmups",
            "Demo approved violin material for admin visibility.",
            violin.Id,
            teacher.Id,
            admin.Id,
            MaterialStatus.Approved,
            "Storage/demo/violin-warmups.pdf",
            "violin-warmups.pdf",
            createdAtUtc);
        await EnsureMaterial(
            "Piano Pending Exercise",
            "Demo pending piano material.",
            piano.Id,
            teacher.Id,
            null,
            MaterialStatus.Pending,
            "Storage/demo/piano-pending.pdf",
            "piano-pending.pdf",
            createdAtUtc);
        await EnsureMaterial(
            "Drums Pending Rhythm",
            "Demo pending drums material.",
            drums.Id,
            teacher.Id,
            null,
            MaterialStatus.Pending,
            "Storage/demo/drums-pending.pdf",
            "drums-pending.pdf",
            createdAtUtc);
    }

    private async Task<User> EnsureUser(
        string email,
        string fullName,
        string password,
        UserRole role,
        DateTime createdAtUtc)
    {
        var existing = await _db.Users.FirstOrDefaultAsync(u => u.Email == email);
        if (existing is not null)
            return existing;

        var user = new User
        {
            FullName = fullName,
            Email = email,
            PasswordHash = PasswordHasher.HashPassword(password),
            Role = role,
            IsActive = true,
            CreatedAtUtc = createdAtUtc,
        };

        _db.Users.Add(user);
        await _db.SaveChangesAsync();
        return user;
    }

    private async Task<Instrument> EnsureInstrument(string name)
    {
        var existing = await _db.Instruments.FirstOrDefaultAsync(i => i.Name == name);
        if (existing is not null)
            return existing;

        var instrument = new Instrument { Name = name, IsActive = true };
        _db.Instruments.Add(instrument);
        await _db.SaveChangesAsync();
        return instrument;
    }

    private async Task EnsureTeacherInstrument(int userId, int instrumentId)
    {
        if (await _db.UserInstruments.AnyAsync(ui => ui.UserId == userId && ui.InstrumentId == instrumentId))
            return;

        _db.UserInstruments.Add(new UserInstrument { UserId = userId, InstrumentId = instrumentId });
        await _db.SaveChangesAsync();
    }

    private async Task EnsureMaterial(
        string title,
        string description,
        int instrumentId,
        int uploadedByUserId,
        int? approvedByUserId,
        MaterialStatus status,
        string filePath,
        string fileName,
        DateTime createdAtUtc)
    {
        if (await _db.Materials.AnyAsync(m => m.Title == title && m.OriginalFileName == fileName))
            return;

        var isApproved = status == MaterialStatus.Approved;
        _db.Materials.Add(new Material
        {
            Title = title,
            Description = description,
            InstrumentId = instrumentId,
            UploadedByUserId = uploadedByUserId,
            Status = status,
            OriginalFilePath = filePath,
            OriginalFileName = fileName,
            ApprovedFilePath = isApproved ? filePath : null,
            ApprovedFileName = isApproved ? fileName : null,
            DownloadCount = 0,
            LikeCount = 0,
            CreatedAtUtc = createdAtUtc,
            ApprovedAtUtc = isApproved ? createdAtUtc.AddDays(1) : null,
            ApprovedByUserId = approvedByUserId,
        });
        await _db.SaveChangesAsync();
    }
}
