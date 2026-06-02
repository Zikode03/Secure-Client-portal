namespace SecureClientPortal.Backend.Storage;

public interface IFileStorage
{
    Task<StoredFileResult> SaveAsync(IFormFile file, string clientId, CancellationToken ct = default);
    Task<StoredFileReadResult?> OpenReadAsync(string storageKey, CancellationToken ct = default);
}
