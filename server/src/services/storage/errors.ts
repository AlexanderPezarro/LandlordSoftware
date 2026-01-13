/**
 * Base storage error class
 */
export class StorageError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly errorCode: string
  ) {
    super(message);
    this.name = 'StorageError';
    Object.setPrototypeOf(this, StorageError.prototype);
  }
}

/**
 * Error for file size exceeding limits
 */
export class FileSizeError extends StorageError {
  constructor(message: string = 'File size exceeds maximum allowed size') {
    super(message, 413, 'FILE_TOO_LARGE');
    this.name = 'FileSizeError';
    Object.setPrototypeOf(this, FileSizeError.prototype);
  }
}

/**
 * Error for invalid file types
 */
export class InvalidFileTypeError extends StorageError {
  constructor(message: string = 'File type is not allowed') {
    super(message, 400, 'INVALID_FILE_TYPE');
    this.name = 'InvalidFileTypeError';
    Object.setPrototypeOf(this, InvalidFileTypeError.prototype);
  }
}

/**
 * Error for path traversal attempts
 */
export class PathTraversalError extends StorageError {
  constructor(message: string = 'Path traversal detected') {
    super(message, 400, 'PATH_TRAVERSAL');
    this.name = 'PathTraversalError';
    Object.setPrototypeOf(this, PathTraversalError.prototype);
  }
}
