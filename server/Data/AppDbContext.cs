using LeybedikInfoKiosk.Server.Models;
using Microsoft.EntityFrameworkCore;

namespace LeybedikInfoKiosk.Server.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options)
        : base(options)
    {
    }

    public DbSet<User> Users => Set<User>();
    public DbSet<Instrument> Instruments => Set<Instrument>();
    public DbSet<UserInstrument> UserInstruments => Set<UserInstrument>();
    public DbSet<Material> Materials => Set<Material>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
    public DbSet<MaterialLike> MaterialLikes => Set<MaterialLike>();
    public DbSet<MaterialDownload> MaterialDownloads => Set<MaterialDownload>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<User>(entity =>
        {
            entity.Property(e => e.FullName).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Email).IsRequired();
            entity.Property(e => e.PasswordHash).IsRequired();
            entity.Property(e => e.IsActive).HasDefaultValue(true);
            entity.HasIndex(e => e.Email).IsUnique();
        });

        modelBuilder.Entity<Instrument>(entity =>
        {
            entity.Property(e => e.Name).IsRequired().HasMaxLength(100);
            entity.Property(e => e.IsActive).HasDefaultValue(true);
            entity.HasIndex(e => e.Name).IsUnique();
        });

        modelBuilder.Entity<UserInstrument>(entity =>
        {
            entity.HasKey(e => new { e.UserId, e.InstrumentId });

            entity.HasOne(e => e.User)
                .WithMany(u => u.UserInstruments)
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.Instrument)
                .WithMany(i => i.UserInstruments)
                .HasForeignKey(e => e.InstrumentId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Material>(entity =>
        {
            entity.Property(e => e.Title).IsRequired().HasMaxLength(250);
            entity.Property(e => e.OriginalFilePath).IsRequired();
            entity.Property(e => e.OriginalFileName).IsRequired();
            entity.Property(e => e.Level).HasDefaultValue(MaterialLevel.Beginner);
            entity.Property(e => e.Status).HasDefaultValue(MaterialStatus.Pending);
            entity.Property(e => e.DownloadCount).HasDefaultValue(0);
            entity.Property(e => e.LikeCount).HasDefaultValue(0);
            entity.Property(e => e.IsDeleted).HasDefaultValue(false);
            entity.Property(e => e.RejectionReason).HasMaxLength(1000);
            entity.Property(e => e.FileHashSha256).HasMaxLength(64);

            entity.HasIndex(e => new { e.IsDeleted, e.Status, e.ApprovedAtUtc });
            entity.HasIndex(e => new { e.UploadedByUserId, e.IsDeleted, e.CreatedAtUtc });
            entity.HasIndex(e => new { e.InstrumentId, e.Status, e.IsDeleted });
            entity.HasIndex(e => e.CreatedAtUtc);
            entity.HasIndex(e => e.DeletedAtUtc);

            entity.HasOne(e => e.Instrument)
                .WithMany(i => i.Materials)
                .HasForeignKey(e => e.InstrumentId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.UploadedByUser)
                .WithMany(u => u.UploadedMaterials)
                .HasForeignKey(e => e.UploadedByUserId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne<User>()
                .WithMany()
                .HasForeignKey(e => e.ApprovedByUserId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(e => e.DeletedByUser)
                .WithMany()
                .HasForeignKey(e => e.DeletedByUserId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.RestoredByUser)
                .WithMany()
                .HasForeignKey(e => e.RestoredByUserId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.RejectedByUser)
                .WithMany()
                .HasForeignKey(e => e.RejectedByUserId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<AuditLog>(entity =>
        {
            entity.Property(e => e.Action).IsRequired().HasMaxLength(100);
            entity.Property(e => e.EntityType).IsRequired().HasMaxLength(100);

            entity.HasOne(e => e.ActorUser)
                .WithMany()
                .HasForeignKey(e => e.ActorUserId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(e => e.CreatedAtUtc);
            entity.HasIndex(e => new { e.EntityType, e.EntityId });
        });

        modelBuilder.Entity<MaterialLike>(entity =>
        {
            entity.HasKey(e => new { e.MaterialId, e.UserId });

            entity.HasOne(e => e.Material)
                .WithMany(m => m.MaterialLikes)
                .HasForeignKey(e => e.MaterialId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.User)
                .WithMany(u => u.MaterialLikes)
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<MaterialDownload>(entity =>
        {
            entity.HasIndex(e => new { e.MaterialId, e.UserId }).IsUnique();

            entity.HasOne(e => e.Material)
                .WithMany(m => m.MaterialDownloads)
                .HasForeignKey(e => e.MaterialId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.User)
                .WithMany(u => u.MaterialDownloads)
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
