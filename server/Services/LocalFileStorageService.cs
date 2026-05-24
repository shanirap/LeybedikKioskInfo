namespace LeybedikInfoKiosk.Server.Services;

public class LocalFileStorageService : IFileStorageService
{
    private readonly IWebHostEnvironment _environment;
    private readonly IConfiguration _configuration;

    public LocalFileStorageService(IWebHostEnvironment environment, IConfiguration configuration)
    {
        _environment = environment;
        _configuration = configuration;
    }

    public async Task<StoredFileReference> SaveAsync(
        IFormFile file,
        string directoryName,
        string storedFileName,
        CancellationToken cancellationToken = default)
    {
        var safeDirectoryName = Path.GetFileName(directoryName);
        var safeStoredFileName = Path.GetFileName(storedFileName);
        var storageDirectory = Path.Combine(GetStorageRoot(), safeDirectoryName);
        Directory.CreateDirectory(storageDirectory);

        var physicalPath = Path.Combine(storageDirectory, safeStoredFileName);
        await using var stream = File.Create(physicalPath);
        await file.CopyToAsync(stream, cancellationToken);

        return new StoredFileReference(Path.Combine(safeDirectoryName, safeStoredFileName));
    }

    public Task<Stream?> OpenReadAsync(string storedPath, CancellationToken cancellationToken = default)
    {
        var physicalPath = ResolveStoragePath(storedPath);
        if (!File.Exists(physicalPath))
            return Task.FromResult<Stream?>(null);

        return Task.FromResult<Stream?>(File.OpenRead(physicalPath));
    }

    private string ResolveStoragePath(string path)
    {
        if (Path.IsPathRooted(path))
            return path;

        var normalizedPath = path.Replace('\\', '/');
        if (normalizedPath.StartsWith("Storage/", StringComparison.OrdinalIgnoreCase))
            return Path.Combine(_environment.ContentRootPath, path);

        return Path.Combine(GetStorageRoot(), path);
    }

    private string GetStorageRoot()
    {
        var configured = _configuration["Storage:RootPath"];
        if (!string.IsNullOrWhiteSpace(configured))
            return Path.IsPathRooted(configured) ? configured : Path.Combine(_environment.ContentRootPath, configured);

        return Path.Combine(_environment.ContentRootPath, "Storage");
    }
}
