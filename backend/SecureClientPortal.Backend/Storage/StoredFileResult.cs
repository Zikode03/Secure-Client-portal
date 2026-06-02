namespace SecureClientPortal.Backend.Storage;

public record StoredFileResult(string StorageKey, string OriginalFileName, string ContentType, long SizeBytes);

public record StoredFileReadResult(Stream Stream, string FileName, string ContentType);
