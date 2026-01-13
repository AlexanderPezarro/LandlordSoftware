import multer from 'multer';
import { Request } from 'express';
import { storageConfig } from '../config/storage.js';

/**
 * Multer configuration for file uploads
 * Uses memory storage to pass files to LocalStorageService
 */

// Configure multer to use memory storage
// Files will be available as req.file.buffer
const storage = multer.memoryStorage();

// File filter to validate MIME types
const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  // Check if MIME type is allowed
  // Cast to readonly string array for includes() method compatibility
  if ((storageConfig.allowedMimeTypes as readonly string[]).includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `Invalid file type. Allowed types: ${storageConfig.allowedMimeTypes.join(', ')}`
      )
    );
  }
};

// Create multer instance with configuration
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: storageConfig.maxFileSize,
    files: 1, // Allow only one file per request
  },
});

/**
 * Middleware to handle multer errors
 */
export const handleUploadError = (
  error: any,
  _req: Request,
  res: any,
  next: any
) => {
  if (error instanceof multer.MulterError) {
    // Multer-specific errors
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        success: false,
        error: `File too large. Maximum size is ${storageConfig.maxFileSize / (1024 * 1024)}MB`,
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        error: 'Too many files. Only one file allowed per upload',
      });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        error: 'Unexpected field name. Use "file" as the field name',
      });
    }
    return res.status(400).json({
      success: false,
      error: error.message,
    });
  } else if (error) {
    // Other errors (like file filter errors)
    return res.status(400).json({
      success: false,
      error: error.message,
    });
  }
  next();
};
