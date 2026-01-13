/**
 * File metadata for storage operations
 */
export interface FileMetadata {
  originalFilename: string;
  mimeType: string;
  size: number;
}

/**
 * Result of successful file save operation
 */
export interface SaveFileResult {
  filePath: string;
  filename: string;
  url: string;
}

/**
 * Storage service interface for file operations
 */
export interface IStorageService {
  /**
   * Save a file to storage
   * @param file - File buffer
   * @param metadata - File metadata
   * @returns Promise with file path, filename, and URL
   */
  saveFile(file: Buffer, metadata: FileMetadata): Promise<SaveFileResult>;

  /**
   * Delete a file from storage
   * @param filePath - Relative path to the file
   */
  deleteFile(filePath: string): Promise<void>;

  /**
   * Get URL for a file
   * @param filePath - Relative path to the file
   * @returns URL string (e.g., /uploads/2026/01/filename.jpg)
   */
  getFileUrl(filePath: string): string;
}
