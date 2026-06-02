using Microsoft.Extensions.Options;

namespace SecureClientPortal.Backend.Storage;

public class LocalFileStorage : IFileStorage
{
    private readonly string _rootPath;

    public LocalFileStorage(IWebHostEnvironment environment, IOptions<StorageOptions> options)
    {
        var configuredRoot = options.Value.LocalRoot.Replace('/', Path.DirectorySeparatorChar);
        _rootPath = Path.IsPathRooted(configuredRoot)
            ? configuredRoot
            : Path.GetFullPath(Path.Combine(environment.ContentRootPath, configuredRoot));
    }

    public async Task<StoredFileResult> SaveAsync(IFormFile file, string clientId, CancellationToken ct = default)
    {
        Directory.CreateDirectory(_rootPath);

        var safeClientId = string.Concat(clientId.Where(ch => char.IsLetterOrDigit(ch) || ch is '_' or '-'));
        var extension = Path.GetExtension(file.FileName);
        var relativePath = Path.Combine(
            safeClientId,
            DateTime.UtcNow.ToString("yyyy"),
            DateTime.UtcNow.ToString("MM"),
            $"{Guid.NewGuid():N}{extension}");

        var absolutePath = Path.Combine(_rootPath, relativePath);
        var directory = Path.GetDirectoryName(absolutePath);
        if (!string.IsNullOrWhiteSpace(directory))
        {
            Directory.CreateDirectory(directory);
        }

        await using var stream = File.Create(absolutePath);
        await file.CopyToAsync(stream, ct);

        var normalizedKey = relativePath.Replace(Path.DirectorySeparatorChar, '/');
        return new StoredFileResult(
            normalizedKey,
            Path.GetFileName(file.FileName),
            string.IsNullOrWhiteSpace(file.ContentType) ? "application/octet-stream" : file.ContentType,
            file.Length);
    }

    public Task<StoredFileReadResult?> OpenReadAsync(string storageKey, CancellationToken ct = default)
    {
        var relativePath = storageKey.Replace('/', Path.DirectorySeparatorChar);
        var absolutePath = Path.GetFullPath(Path.Combine(_rootPath, relativePath));
        if (!absolutePath.StartsWith(_rootPath, StringComparison.OrdinalIgnoreCase) || !File.Exists(absolutePath))
        {
            return Task.FromResult<StoredFileReadResult?>(null);
        }

        Stream stream = new FileStream(absolutePath, FileMode.Open, FileAccess.Read, FileShare.Read);
        var contentType = GuessContentType(Path.GetExtension(absolutePath));
        return Task.FromResult<StoredFileReadResult?>(new StoredFileReadResult(stream, Path.GetFileName(absolutePath), contentType));
    }

    private static string GuessContentType(string extension)
    {
        return extension.Trim().ToLowerInvariant() switch
        {
            ".pdf" => "application/pdf",
            ".jpg" or ".jpeg" => "image/jpeg",
            ".png" => "image/png",
            ".csv" => "text/csv",
            ".xlsx" => "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            ".docx" => "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            _ => "application/octet-stream"
        };
    }
}
