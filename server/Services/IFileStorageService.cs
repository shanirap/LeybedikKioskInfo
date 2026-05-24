namespace LeybedikInfoKiosk.Server.Services;

public interface IFileStorageService
{
    Task<StoredFileReference> SaveAsync(
        IFormFile file,
        string directoryName,
        string storedFileName,
        CancellationToken cancellationToken = default);

    Task<Stream?> OpenReadAsync(string storedPath, CancellationToken cancellationToken = default);
}

public record StoredFileReference(string Path);
