import { useCallback, useRef, useState } from 'react';
import { Upload, X } from 'lucide-react';
import styles from './FileUpload.module.scss';

export interface FileUploadProps {
  accept?: string;
  multiple?: boolean;
  onFilesChange: (files: File[]) => void;
  maxSize?: number; // bytes
  disabled?: boolean;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileUpload({
  accept,
  multiple = false,
  onFilesChange,
  maxSize,
  disabled = false,
}: FileUploadProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateAndAddFiles = useCallback(
    (incoming: File[]) => {
      setError(null);

      if (maxSize) {
        const oversized = incoming.find((f) => f.size > maxSize);
        if (oversized) {
          setError(
            `File "${oversized.name}" exceeds the maximum size of ${formatFileSize(maxSize)}.`
          );
          return;
        }
      }

      const next = multiple ? [...files, ...incoming] : incoming.slice(0, 1);
      setFiles(next);
      onFilesChange(next);
    },
    [files, maxSize, multiple, onFilesChange]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      if (!disabled) {
        setIsDragOver(true);
      }
    },
    [disabled]
  );

  const handleDragEnter = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      if (!disabled) {
        setIsDragOver(true);
      }
    },
    [disabled]
  );

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragOver(false);

      if (disabled) return;

      const dropped = Array.from(e.dataTransfer.files);
      if (dropped.length > 0) {
        validateAndAddFiles(dropped);
      }
    },
    [disabled, validateAndAddFiles]
  );

  const handleClick = useCallback(() => {
    if (!disabled && inputRef.current) {
      inputRef.current.click();
    }
  }, [disabled]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = e.target.files ? Array.from(e.target.files) : [];
      if (selected.length > 0) {
        validateAndAddFiles(selected);
      }
      // Reset input value so the same file can be selected again
      e.target.value = '';
    },
    [validateAndAddFiles]
  );

  const handleRemove = useCallback(
    (index: number) => {
      const next = files.filter((_, i) => i !== index);
      setFiles(next);
      onFilesChange(next);
      setError(null);
    },
    [files, onFilesChange]
  );

  const zoneClasses = [
    styles.dropZone,
    isDragOver && styles.dragOver,
    disabled && styles.disabled,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={styles.fileUpload}>
      <div
        className={zoneClasses}
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        role="button"
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleClick();
          }
        }}
        aria-disabled={disabled}
      >
        <Upload className={styles.uploadIcon} />
        <span className={styles.dropText}>
          Drag &amp; drop files here, or click to browse
        </span>
        {accept && (
          <span className={styles.acceptHint}>Accepted: {accept}</span>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        className={styles.hiddenInput}
        accept={accept}
        multiple={multiple}
        onChange={handleInputChange}
        tabIndex={-1}
        aria-hidden="true"
      />

      {error && <p className={styles.error}>{error}</p>}

      {files.length > 0 && (
        <ul className={styles.fileList}>
          {files.map((file, index) => (
            <li key={`${file.name}-${file.size}-${index}`} className={styles.fileItem}>
              <span className={styles.fileName}>{file.name}</span>
              <span className={styles.fileSize}>{formatFileSize(file.size)}</span>
              <button
                type="button"
                className={styles.removeButton}
                onClick={() => handleRemove(index)}
                aria-label={`Remove ${file.name}`}
                disabled={disabled}
              >
                <X size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
