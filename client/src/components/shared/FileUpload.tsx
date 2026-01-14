import React, { useState, useCallback } from 'react';
import { Box, Typography, Paper, IconButton, Alert } from '@mui/material';
import { CloudUpload as UploadIcon, Clear as ClearIcon } from '@mui/icons-material';
import { FileUploadProps } from '../../types/component.types';

const FileUpload: React.FC<FileUploadProps> = ({
  onFileSelect,
  accept = 'image/jpeg,image/png,application/pdf',
  maxSize = 10 * 1024 * 1024, // 10MB default
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateFile = useCallback((file: File): string | null => {
    // Check file size
    if (file.size > maxSize) {
      const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(1);
      return `File size exceeds ${maxSizeMB}MB limit`;
    }

    // Check file type
    const acceptedTypes = accept.split(',').map(type => type.trim());
    const fileType = file.type;
    const isValidType = acceptedTypes.some(type => {
      if (type.endsWith('/*')) {
        const baseType = type.split('/')[0];
        return fileType.startsWith(baseType + '/');
      }
      return fileType === type;
    });

    if (!isValidType) {
      return `File type not accepted. Accepted types: ${accept}`;
    }

    return null;
  }, [accept, maxSize]);

  const handleFile = useCallback((file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      setSelectedFile(null);
      onFileSelect(null);
      return;
    }

    setError(null);
    setSelectedFile(file);
    onFileSelect(file);
  }, [validateFile, onFileSelect]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, [handleFile]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleClear = () => {
    setSelectedFile(null);
    setError(null);
    onFileSelect(null);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <Box>
      <input
        type="file"
        id="file-upload-input"
        accept={accept}
        onChange={handleChange}
        style={{ display: 'none' }}
      />

      {!selectedFile ? (
        <Paper
          elevation={0}
          sx={{
            border: '2px dashed',
            borderColor: dragActive ? 'primary.main' : 'divider',
            backgroundColor: dragActive ? 'action.hover' : 'background.paper',
            padding: 3,
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s',
            '&:hover': {
              borderColor: 'primary.main',
              backgroundColor: 'action.hover',
            },
          }}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => document.getElementById('file-upload-input')?.click()}
        >
          <UploadIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
          <Typography variant="body1" gutterBottom>
            Drag and drop a file here, or click to select
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Max size: {(maxSize / (1024 * 1024)).toFixed(0)}MB
          </Typography>
        </Paper>
      ) : (
        <Paper
          elevation={0}
          sx={{
            border: '1px solid',
            borderColor: 'divider',
            padding: 2,
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {selectedFile.name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {formatFileSize(selectedFile.size)}
              </Typography>
            </Box>
            <IconButton
              size="small"
              onClick={handleClear}
              aria-label="Clear file"
            >
              <ClearIcon />
            </IconButton>
          </Box>
        </Paper>
      )}

      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}
    </Box>
  );
};

export default FileUpload;
