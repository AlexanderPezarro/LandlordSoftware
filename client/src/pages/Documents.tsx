import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  FileText,
  Image as ImageIcon,
  File as FileIcon,
  Download,
  Trash2,
  Plus,
  AlertTriangle,
} from 'lucide-react';
import { Container } from '../components/primitives/Container';
import { Button } from '../components/primitives/Button';
import { Select } from '../components/primitives/Select';
import { Card } from '../components/primitives/Card';
import { Chip } from '../components/primitives/Chip';
import { Dialog } from '../components/primitives/Dialog';
import { Spinner } from '../components/primitives/Spinner';
import { FileUpload } from '../components/primitives/FileUpload';
import { Tooltip } from '../components/primitives/Tooltip';
import { documentsService } from '../services/api/documents.service';
import { propertiesService } from '../services/api/properties.service';
import { tenantsService } from '../services/api/tenants.service';
import { leasesService } from '../services/api/leases.service';
import { transactionsService } from '../services/api/transactions.service';
import type {
  Document,
  Property,
  Tenant,
  Lease,
  Transaction,
} from '../types/api.types';
import { ApiError } from '../types/api.types';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import styles from './Documents.module.scss';

type EntityType = 'Property' | 'Tenant' | 'Lease' | 'Transaction';

const ENTITY_TYPES: EntityType[] = ['Property', 'Tenant', 'Lease', 'Transaction'];

const ALLOWED_FILE_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const getEntityTypeColor = (
  entityType: EntityType
): 'primary' | 'default' | 'success' | 'warning' => {
  switch (entityType) {
    case 'Property':
      return 'primary';
    case 'Tenant':
      return 'default';
    case 'Lease':
      return 'success';
    case 'Transaction':
      return 'warning';
    default:
      return 'primary';
  }
};

const getFileIcon = (fileType: string) => {
  if (fileType === 'application/pdf') {
    return <FileText size={24} className={styles.fileIconPdf} />;
  }
  if (fileType.startsWith('image/')) {
    return <ImageIcon size={24} className={styles.fileIconImage} />;
  }
  return <FileIcon size={24} className={styles.fileIconGeneric} />;
};

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

export const Documents: React.FC = () => {
  const toast = useToast();
  const { canWrite } = useAuth();

  // Data states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [leases, setLeases] = useState<Lease[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  // Filter states
  const [entityTypeFilter, setEntityTypeFilter] = useState<string>('all');
  const [entityIdFilter, setEntityIdFilter] = useState<string>('all');

  // Upload dialog states
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [selectedEntityType, setSelectedEntityType] = useState<EntityType | ''>('');
  const [selectedEntityId, setSelectedEntityId] = useState<string>('');
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadErrors, setUploadErrors] = useState<Record<string, string>>({});

  // Delete dialog states
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<Document | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Fetch entities for dropdowns
  const fetchEntities = useCallback(async () => {
    try {
      const [props, tens, leas, trans] = await Promise.all([
        propertiesService.getProperties(),
        tenantsService.getTenants(),
        leasesService.getLeases(),
        transactionsService.getTransactions(),
      ]);
      setProperties(props);
      setTenants(tens);
      setLeases(leas);
      setTransactions(trans);
    } catch (err) {
      console.error('Error fetching entities:', err);
      const errorMessage = err instanceof ApiError ? err.message : 'Failed to load entities';
      toast.error(errorMessage);
    }
  }, [toast]);

  // Fetch documents with filters
  const fetchDocuments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const entityType = entityTypeFilter !== 'all' ? entityTypeFilter : undefined;
      const entityId = entityIdFilter !== 'all' ? entityIdFilter : undefined;
      const docs = await documentsService.getDocuments(entityType, entityId);
      setDocuments(docs);
    } catch (err) {
      console.error('Error fetching documents:', err);
      const errorMessage = err instanceof ApiError ? err.message : 'Failed to load documents';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [entityTypeFilter, entityIdFilter, toast]);

  useEffect(() => {
    fetchEntities();
  }, [fetchEntities]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // Reset entity filter when entity type changes
  useEffect(() => {
    setEntityIdFilter('all');
  }, [entityTypeFilter]);

  // Get entity options based on selected entity type
  const getEntityOptions = useCallback(
    (entityType: string) => {
      switch (entityType) {
        case 'Property':
          return properties.map((p) => ({ id: p.id, label: p.name }));
        case 'Tenant':
          return tenants.map((t) => ({ id: t.id, label: `${t.firstName} ${t.lastName}` }));
        case 'Lease':
          return leases.map((l) => {
            const property = properties.find((p) => p.id === l.propertyId);
            const tenant = tenants.find((t) => t.id === l.tenantId);
            const propertyName = property?.name || 'Unknown Property';
            const tenantName = tenant ? `${tenant.firstName} ${tenant.lastName}` : 'Unknown Tenant';
            return { id: l.id, label: `${propertyName} - ${tenantName}` };
          });
        case 'Transaction':
          return transactions.map((t) => {
            const property = properties.find((p) => p.id === t.propertyId);
            const propertyName = property?.name || 'Unknown Property';
            return {
              id: t.id,
              label: `${propertyName} - ${t.type} - £${t.amount.toFixed(2)}`,
            };
          });
        default:
          return [];
      }
    },
    [properties, tenants, leases, transactions]
  );

  // Get entity name for display
  const getEntityName = useCallback(
    (entityType: EntityType, entityId: string): string => {
      switch (entityType) {
        case 'Property': {
          const property = properties.find((p) => p.id === entityId);
          return property?.name || 'Unknown Property';
        }
        case 'Tenant': {
          const tenant = tenants.find((t) => t.id === entityId);
          return tenant ? `${tenant.firstName} ${tenant.lastName}` : 'Unknown Tenant';
        }
        case 'Lease': {
          const lease = leases.find((l) => l.id === entityId);
          if (!lease) return 'Unknown Lease';
          const property = properties.find((p) => p.id === lease.propertyId);
          const tenant = tenants.find((t) => t.id === lease.tenantId);
          const propertyName = property?.name || 'Unknown Property';
          const tenantName = tenant
            ? `${tenant.firstName} ${tenant.lastName}`
            : 'Unknown Tenant';
          return `${propertyName} - ${tenantName}`;
        }
        case 'Transaction': {
          const transaction = transactions.find((t) => t.id === entityId);
          if (!transaction) return 'Unknown Transaction';
          const property = properties.find((p) => p.id === transaction.propertyId);
          const propertyName = property?.name || 'Unknown Property';
          return `${propertyName} - ${transaction.type}`;
        }
        default:
          return 'Unknown';
      }
    },
    [properties, tenants, leases, transactions]
  );

  // Upload dialog handlers
  const handleOpenUploadDialog = () => {
    setUploadFiles([]);
    setSelectedEntityType('');
    setSelectedEntityId('');
    setUploadErrors({});
    setUploadDialogOpen(true);
  };

  const handleCloseUploadDialog = () => {
    setUploadDialogOpen(false);
    setUploadFiles([]);
    setSelectedEntityType('');
    setSelectedEntityId('');
    setUploadErrors({});
  };

  const handleFilesChange = (files: File[]) => {
    setUploadFiles(files);
    // Clear file error if there was one
    if (uploadErrors.file) {
      setUploadErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.file;
        return newErrors;
      });
    }
  };

  const validateUploadForm = (): boolean => {
    const errors: Record<string, string> = {};
    const selectedFile = uploadFiles[0] || null;

    if (!selectedFile) {
      errors.file = 'Please select a file to upload';
    } else {
      // Check file type
      const fileExtension = '.' + selectedFile.name.split('.').pop()?.toLowerCase();
      if (
        !ALLOWED_FILE_TYPES.includes(selectedFile.type) &&
        !ALLOWED_EXTENSIONS.includes(fileExtension)
      ) {
        errors.file = 'Only PDF, JPG, and PNG files are allowed';
      }
      // Check file size
      if (selectedFile.size > MAX_FILE_SIZE) {
        errors.file = 'File size must be less than 10MB';
      }
    }

    if (!selectedEntityType) {
      errors.entityType = 'Please select an entity type';
    }

    if (!selectedEntityId) {
      errors.entityId = 'Please select an entity';
    }

    setUploadErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleUpload = async () => {
    const selectedFile = uploadFiles[0] || null;
    if (!validateUploadForm() || !selectedFile || !selectedEntityType) {
      return;
    }

    try {
      setUploadLoading(true);
      await documentsService.uploadDocument(
        selectedFile,
        selectedEntityType as EntityType,
        selectedEntityId
      );
      toast.success('Document uploaded successfully');
      handleCloseUploadDialog();
      await fetchDocuments();
    } catch (err) {
      console.error('Error uploading document:', err);
      const errorMessage = err instanceof ApiError ? err.message : 'Failed to upload document';
      toast.error(errorMessage);
    } finally {
      setUploadLoading(false);
    }
  };

  // Download handler
  const handleDownload = async (doc: Document) => {
    try {
      const blob = await documentsService.downloadDocument(doc.id);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = doc.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading document:', err);
      const errorMessage = err instanceof ApiError ? err.message : 'Failed to download document';
      toast.error(errorMessage);
    }
  };

  // Delete handlers
  const handleDeleteClick = (doc: Document, event: React.MouseEvent) => {
    event.stopPropagation();
    setDocumentToDelete(doc);
    setDeleteDialogOpen(true);
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setDocumentToDelete(null);
  };

  const handleDeleteConfirm = async () => {
    if (!documentToDelete) return;

    try {
      setDeleteLoading(true);
      await documentsService.deleteDocument(documentToDelete.id);
      toast.success('Document deleted successfully');
      setDeleteDialogOpen(false);
      setDocumentToDelete(null);
      await fetchDocuments();
    } catch (err) {
      console.error('Error deleting document:', err);
      const errorMessage = err instanceof ApiError ? err.message : 'Failed to delete document';
      toast.error(errorMessage);
    } finally {
      setDeleteLoading(false);
    }
  };

  // Filtered entity options for filter dropdown
  const filteredEntityOptions = useMemo(() => {
    if (entityTypeFilter === 'all') {
      return [];
    }
    return getEntityOptions(entityTypeFilter);
  }, [entityTypeFilter, getEntityOptions]);

  // Upload entity options based on selected entity type
  const uploadEntityOptions = useMemo(() => {
    if (!selectedEntityType) {
      return [];
    }
    return getEntityOptions(selectedEntityType);
  }, [selectedEntityType, getEntityOptions]);

  // Reset selected entity when entity type changes in upload dialog
  useEffect(() => {
    setSelectedEntityId('');
  }, [selectedEntityType]);

  // Build Select options for filters
  const entityTypeFilterOptions = [
    { value: 'all', label: 'All Entity Types' },
    ...ENTITY_TYPES.map((type) => ({ value: type, label: type })),
  ];

  const entityIdFilterOptions = [
    { value: 'all', label: 'All Entities' },
    ...filteredEntityOptions.map((opt) => ({ value: opt.id, label: opt.label })),
  ];

  // Build Select options for upload dialog
  const uploadEntityTypeOptions = ENTITY_TYPES.map((type) => ({
    value: type,
    label: type,
  }));

  const uploadEntityIdOptions = uploadEntityOptions.map((opt) => ({
    value: opt.id,
    label: opt.label,
  }));

  if (loading && documents.length === 0) {
    return (
      <Container maxWidth="lg">
        <div className={styles.loadingWrapper}>
          <Spinner />
        </div>
      </Container>
    );
  }

  if (error && documents.length === 0) {
    return (
      <Container maxWidth="lg">
        <div className={styles.page}>
          <h1 className={styles.title}>Documents</h1>
          <div className={styles.alert}>{error}</div>
        </div>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <div className={styles.page}>
        <div className={styles.header}>
          <h1 className={styles.title}>Documents</h1>
          {canWrite() && (
            <Button
              variant="primary"
              startIcon={<Plus size={18} />}
              onClick={handleOpenUploadDialog}
            >
              Upload Document
            </Button>
          )}
        </div>

        {/* Filters */}
        <div className={styles.filters}>
          <Select
            label="Entity Type"
            value={entityTypeFilter}
            onChange={(value) => setEntityTypeFilter(value)}
            options={entityTypeFilterOptions}
            size="small"
            fullWidth
          />
          <Select
            label="Entity"
            value={entityIdFilter}
            onChange={(value) => setEntityIdFilter(value)}
            options={entityIdFilterOptions}
            disabled={entityTypeFilter === 'all'}
            size="small"
            fullWidth
          />
        </div>

        {/* Documents Grid */}
        {documents.length === 0 ? (
          <div className={styles.emptyState}>
            <FileText size={64} className={styles.emptyIcon} />
            <h2 className={styles.emptyTitle}>No documents found</h2>
            <p className={styles.emptyDescription}>
              Upload your first document to get started
            </p>
            {canWrite() && (
              <Button
                variant="secondary"
                startIcon={<Plus size={18} />}
                onClick={handleOpenUploadDialog}
              >
                Upload First Document
              </Button>
            )}
          </div>
        ) : (
          <div className={styles.documentsGrid}>
            {documents.map((doc) => (
              <Card key={doc.id} className={styles.documentCard}>
                <Card.Content>
                  <div className={styles.cardBody}>
                    <div className={styles.fileIcon}>{getFileIcon(doc.fileType)}</div>
                    <div className={styles.fileInfo}>
                      <span className={styles.fileName} title={doc.fileName}>
                        {doc.fileName}
                      </span>
                      <span className={styles.fileSize}>
                        {formatFileSize(doc.fileSize)}
                      </span>
                    </div>
                  </div>

                  <div className={styles.entitySection}>
                    <div className={styles.entityChip}>
                      <Chip
                        label={doc.entityType}
                        color={getEntityTypeColor(doc.entityType)}
                        size="small"
                      />
                    </div>
                    <span
                      className={styles.entityName}
                      title={getEntityName(doc.entityType, doc.entityId)}
                    >
                      {getEntityName(doc.entityType, doc.entityId)}
                    </span>
                  </div>

                  <span className={styles.uploadDate}>
                    Uploaded: {formatDate(doc.uploadedAt)}
                  </span>

                  <div className={styles.cardActions}>
                    <Tooltip content="Download">
                      <button
                        className={`${styles.actionButton} ${styles.downloadButton}`}
                        onClick={() => handleDownload(doc)}
                        aria-label="Download document"
                        type="button"
                      >
                        <Download size={18} />
                      </button>
                    </Tooltip>
                    {canWrite() && (
                      <Tooltip content="Delete">
                        <button
                          className={`${styles.actionButton} ${styles.deleteButton}`}
                          onClick={(e) => handleDeleteClick(doc, e)}
                          aria-label="Delete document"
                          type="button"
                        >
                          <Trash2 size={18} />
                        </button>
                      </Tooltip>
                    )}
                  </div>
                </Card.Content>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onClose={handleCloseUploadDialog} size="medium">
        <Dialog.Title>Upload Document</Dialog.Title>
        <Dialog.Content>
          <div className={styles.uploadForm}>
            <Select
              label="Entity Type"
              placeholder="Select entity type"
              value={selectedEntityType}
              onChange={(value) => setSelectedEntityType(value as EntityType | '')}
              options={uploadEntityTypeOptions}
              error={!!uploadErrors.entityType}
              helperText={uploadErrors.entityType}
              fullWidth
              name="upload-entity-type"
            />

            <Select
              label="Entity"
              placeholder="Select entity"
              value={selectedEntityId}
              onChange={(value) => setSelectedEntityId(value)}
              options={uploadEntityIdOptions}
              error={!!uploadErrors.entityId}
              helperText={uploadErrors.entityId}
              disabled={!selectedEntityType}
              fullWidth
              name="upload-entity-id"
            />

            <div>
              <FileUpload
                accept=".pdf,.jpg,.jpeg,.png"
                onFilesChange={handleFilesChange}
                maxSize={MAX_FILE_SIZE}
                disabled={uploadLoading}
              />
              {uploadErrors.file && (
                <span className={styles.fileInputError}>{uploadErrors.file}</span>
              )}
              <span className={styles.fileInputHint}>
                Allowed formats: PDF, JPG, PNG (max 10MB)
              </span>
            </div>
          </div>
        </Dialog.Content>
        <Dialog.Actions>
          <Button variant="text" onClick={handleCloseUploadDialog} disabled={uploadLoading}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleUpload}
            disabled={uploadLoading}
            loading={uploadLoading}
          >
            {uploadLoading ? 'Uploading...' : 'Upload'}
          </Button>
        </Dialog.Actions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={deleteLoading ? () => {} : handleDeleteCancel}
        size="small"
      >
        <Dialog.Title>
          <span className={styles.deleteDialogTitle}>
            <AlertTriangle size={20} className={styles.deleteIcon} />
            Delete Document
          </span>
        </Dialog.Title>
        <Dialog.Content>
          <p className={styles.deleteMessage}>
            Are you sure you want to delete &quot;{documentToDelete?.fileName}&quot;? This action
            cannot be undone.
          </p>
        </Dialog.Content>
        <Dialog.Actions>
          <Button variant="text" onClick={handleDeleteCancel} disabled={deleteLoading}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleDeleteConfirm}
            disabled={deleteLoading}
            loading={deleteLoading}
          >
            {deleteLoading ? 'Processing...' : 'Confirm'}
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Container>
  );
};
