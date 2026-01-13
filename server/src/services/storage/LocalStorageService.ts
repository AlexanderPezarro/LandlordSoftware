import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { IStorageService, FileMetadata, SaveFileResult } from './IStorageService.js';
import {
  FileSizeError,
  InvalidFileTypeError,
  PathTraversalError,
} from './errors.js';
import { storageConfig } from '../../config/storage.js';

/**
 * Local filesystem storage implementation
 */
export class LocalStorageService implements IStorageService {
  private readonly uploadDir: string;

  constructor(uploadDir?: string) {
    this.uploadDir = uploadDir || storageConfig.uploadDir;
  }

  /**
   * Validate file size
   */
  private validateFileSize(size: number): void {
    if (size > storageConfig.maxFileSize) {
      throw new FileSizeError(
        `File size ${size} bytes exceeds maximum allowed size of ${storageConfig.maxFileSize} bytes`
      );
    }
  }

  /**
   * Validate MIME type
   */
  private validateMimeType(mimeType: string): void {
    if (!storageConfig.allowedMimeTypes.includes(mimeType as any)) {
      throw new InvalidFileTypeError(
        `MIME type '${mimeType}' is not allowed. Allowed types: ${storageConfig.allowedMimeTypes.join(', ')}`
      );
    }
  }

  /**
   * Validate path for traversal attempts
   */
  private validatePath(filePath: string): void {
    // Normalize the path
    const normalized = path.normalize(filePath);

    // Check for path traversal patterns
    if (
      normalized.includes('..') ||
      normalized.startsWith('/') ||
      normalized.startsWith('\\') ||
      path.isAbsolute(normalized)
    ) {
      throw new PathTraversalError(
        'Path traversal detected in filename or path'
      );
    }
  }

  /**
   * Generate unique filename with timestamp and random string
   */
  private generateUniqueFilename(originalFilename: string): string {
    // Extract extension
    const ext = path.extname(originalFilename);

    // Validate the original filename for path traversal
    this.validatePath(originalFilename);

    // Generate unique filename: timestamp + random + extension
    const timestamp = Date.now();
    const random = crypto.randomBytes(8).toString('hex');

    return `${timestamp}-${random}${ext}`;
  }

  /**
   * Get directory path for current date (YYYY/MM)
   */
  private getDatePath(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');

    return `${year}/${month}`;
  }

  /**
   * Ensure directory exists, create if it doesn't
   */
  private async ensureDirectory(dirPath: string): Promise<void> {
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (error) {
      // Directory might already exist, ignore error
    }
  }

  /**
   * Save a file to local storage
   */
  async saveFile(file: Buffer, metadata: FileMetadata): Promise<SaveFileResult> {
    // Validate file size
    this.validateFileSize(metadata.size);

    // Validate MIME type
    this.validateMimeType(metadata.mimeType);

    // Validate filename for path traversal
    this.validatePath(metadata.originalFilename);

    // Generate unique filename
    const filename = this.generateUniqueFilename(metadata.originalFilename);

    // Get date-based subdirectory
    const datePath = this.getDatePath();

    // Construct full directory path
    const fullDirPath = path.join(this.uploadDir, datePath);

    // Ensure directory exists
    await this.ensureDirectory(fullDirPath);

    // Construct file path
    const filePath = `${datePath}/${filename}`;
    const fullFilePath = path.join(this.uploadDir, filePath);

    // Write file
    await fs.writeFile(fullFilePath, file);

    // Return result
    return {
      filePath,
      filename,
      url: this.getFileUrl(filePath),
    };
  }

  /**
   * Delete a file from storage
   */
  async deleteFile(filePath: string): Promise<void> {
    // Validate path for traversal
    this.validatePath(filePath);

    // Construct full file path
    const fullFilePath = path.join(this.uploadDir, filePath);

    // Delete file (ignore if doesn't exist)
    try {
      await fs.unlink(fullFilePath);
    } catch (error: any) {
      // Ignore ENOENT (file not found) errors
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }
  }

  /**
   * Get URL for a file
   */
  getFileUrl(filePath: string): string {
    // Validate path for traversal
    this.validatePath(filePath);

    // Return URL with /uploads prefix
    return `/uploads/${filePath}`;
  }
}
