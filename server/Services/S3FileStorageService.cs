using Amazon.Runtime;
using Amazon.S3;
using Amazon.S3.Model;

namespace LeybedikInfoKiosk.Server.Services;

public class S3FileStorageService : IFileStorageService
{
    private readonly IAmazonS3 _client;
    private readonly string _bucketName;

    public S3FileStorageService(IConfiguration configuration)
    {
        var section = configuration.GetSection("Storage:S3");
        var endpoint = section["Endpoint"] ?? throw new InvalidOperationException("Storage:S3:Endpoint is not configured.");
        _bucketName = section["Bucket"] ?? throw new InvalidOperationException("Storage:S3:Bucket is not configured.");
        var accessKey = section["AccessKey"] ?? throw new InvalidOperationException("Storage:S3:AccessKey is not configured.");
        var secretKey = section["SecretKey"] ?? throw new InvalidOperationException("Storage:S3:SecretKey is not configured.");
        var region = section["Region"] ?? "us-east-1";
        var forcePathStyle = section.GetValue("ForcePathStyle", true);

        var config = new AmazonS3Config
        {
            ServiceURL = endpoint,
            ForcePathStyle = forcePathStyle,
            AuthenticationRegion = region,
        };

        _client = new AmazonS3Client(new BasicAWSCredentials(accessKey, secretKey), config);
    }

    public async Task<StoredFileReference> SaveAsync(
        IFormFile file,
        string directoryName,
        string storedFileName,
        CancellationToken cancellationToken = default)
    {
        var key = BuildKey(directoryName, storedFileName);
        await using var stream = file.OpenReadStream();

        await _client.PutObjectAsync(new PutObjectRequest
        {
            BucketName = _bucketName,
            Key = key,
            InputStream = stream,
            ContentType = file.ContentType,
        }, cancellationToken);

        return new StoredFileReference(key);
    }

    public async Task<Stream?> OpenReadAsync(string storedPath, CancellationToken cancellationToken = default)
    {
        try
        {
            using var response = await _client.GetObjectAsync(_bucketName, NormalizeKey(storedPath), cancellationToken);
            var stream = new MemoryStream();
            await response.ResponseStream.CopyToAsync(stream, cancellationToken);
            stream.Position = 0;
            return stream;
        }
        catch (AmazonS3Exception ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound)
        {
            return null;
        }
    }

    private static string BuildKey(string directoryName, string storedFileName)
    {
        var safeDirectoryName = Path.GetFileName(directoryName);
        var safeStoredFileName = Path.GetFileName(storedFileName);
        return $"{safeDirectoryName}/{safeStoredFileName}";
    }

    private static string NormalizeKey(string storedPath)
    {
        return storedPath.Replace('\\', '/').TrimStart('/');
    }
}
