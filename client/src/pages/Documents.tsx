import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import {
  Container,
  Typography,
  Box,
  Button,
  TextField,
  MenuItem,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  useMediaQuery,
  useTheme,
  Stack,
  Card,
  CardContent,
  Chip,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Download as DownloadIcon,
  Delete as DeleteIcon,
  Description as DescriptionIcon,
  Image as ImageIcon,
  PictureAsPdf as PdfIcon,
  InsertDriveFile as FileIcon,
} from '@mui/icons-material';
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
import ConfirmDialog from '../components/shared/ConfirmDialog';
import { useToast } from '../contexts/ToastContext';

type EntityType = 'Property' | 'Tenant' | 'Lease' | 'Transaction';

const ENTITY_TYPES: EntityType[] = ['Property', 'Tenant', 'Lease', 'Transaction'];

const ALLOWED_FILE_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const getEntityTypeColor = (
  entityType: EntityType
): 'primary' | 'secondary' | 'success' | 'warning' => {
  switch (entityType) {
    case 'Property':
      return 'primary';
    case 'Tenant':
      return 'secondary';
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
    return <PdfIcon color="error" />;
  }
  if (fileType.startsWith('image/')) {
    return <ImageIcon color="primary" />;
  }
  return <FileIcon color="action" />;
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
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const fileInputRef = useRef<HTMLInputElement>(null);

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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
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
    setSelectedFile(null);
    setSelectedEntityType('');
    setSelectedEntityId('');
    setUploadErrors({});
    setUploadDialogOpen(true);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCloseUploadDialog = () => {
    setUploadDialogOpen(false);
    setSelectedFile(null);
    setSelectedEntityType('');
    setSelectedEntityId('');
    setUploadErrors({});
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      // Clear file error if there was one
      if (uploadErrors.file) {
        setUploadErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors.file;
          return newErrors;
        });
      }
    }
  };

  const validateUploadForm = (): boolean => {
    const errors: Record<string, string> = {};

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

  if (loading && documents.length === 0) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error && documents.length === 0) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Documents
          </Typography>
          <Alert severity="error">{error}</Alert>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="h1">
            Documents
          </Typography>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={handleOpenUploadDialog}
          >
            Upload Document
          </Button>
        </Box>

        {/* Filters */}
        <Box sx={{ mb: 3 }}>
          <Stack direction={isMobile ? 'column' : 'row'} spacing={2}>
            <TextField
              select
              fullWidth
              size="small"
              label="Entity Type"
              value={entityTypeFilter}
              onChange={(e) => setEntityTypeFilter(e.target.value)}
            >
              <MenuItem value="all">All Entity Types</MenuItem>
              {ENTITY_TYPES.map((type) => (
                <MenuItem key={type} value={type}>
                  {type}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              fullWidth
              size="small"
              label="Entity"
              value={entityIdFilter}
              onChange={(e) => setEntityIdFilter(e.target.value)}
              disabled={entityTypeFilter === 'all'}
            >
              <MenuItem value="all">All Entities</MenuItem>
              {filteredEntityOptions.map((option) => (
                <MenuItem key={option.id} value={option.id}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
        </Box>

        {/* Documents Grid */}
        {documents.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <DescriptionIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No documents found
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Upload your first document to get started
            </Typography>
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={handleOpenUploadDialog}
            >
              Upload First Document
            </Button>
          </Box>
        ) : (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2, 1fr)',
                md: 'repeat(3, 1fr)',
              },
              gap: 3,
            }}
          >
            {documents.map((doc) => (
              <Card
                key={doc.id}
                sx={{
                  position: 'relative',
                  '&:hover': {
                    boxShadow: 4,
                  },
                }}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 2 }}>
                    <Box sx={{ flexShrink: 0 }}>{getFileIcon(doc.fileType)}</Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography
                        variant="subtitle1"
                        component="div"
                        noWrap
                        title={doc.fileName}
                        sx={{ fontWeight: 500 }}
                      >
                        {doc.fileName}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {formatFileSize(doc.fileSize)}
                      </Typography>
                    </Box>
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Chip
                      label={doc.entityType}
                      color={getEntityTypeColor(doc.entityType)}
                      size="small"
                      sx={{ mb: 1 }}
                    />
                    <Typography variant="body2" color="text.secondary" noWrap title={getEntityName(doc.entityType, doc.entityId)}>
                      {getEntityName(doc.entityType, doc.entityId)}
                    </Typography>
                  </Box>

                  <Typography variant="caption" color="text.secondary">
                    Uploaded: {formatDate(doc.uploadedAt)}
                  </Typography>

                  <Box sx={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 0.5 }}>
                    <Tooltip title="Download">
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => handleDownload(doc)}
                        aria-label="Download document"
                      >
                        <DownloadIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={(e) => handleDeleteClick(doc, e)}
                        aria-label="Delete document"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Box>
        )}
      </Box>

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onClose={handleCloseUploadDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Upload Document</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              select
              label="Entity Type"
              value={selectedEntityType}
              onChange={(e) => setSelectedEntityType(e.target.value as EntityType | '')}
              error={!!uploadErrors.entityType}
              helperText={uploadErrors.entityType}
              required
              fullWidth
            >
              <MenuItem value="" disabled>
                Select entity type
              </MenuItem>
              {ENTITY_TYPES.map((type) => (
                <MenuItem key={type} value={type}>
                  {type}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              label="Entity"
              value={selectedEntityId}
              onChange={(e) => setSelectedEntityId(e.target.value)}
              error={!!uploadErrors.entityId}
              helperText={uploadErrors.entityId}
              required
              fullWidth
              disabled={!selectedEntityType}
            >
              <MenuItem value="" disabled>
                Select entity
              </MenuItem>
              {uploadEntityOptions.map((option) => (
                <MenuItem key={option.id} value={option.id}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>

            <Box>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileChange}
                style={{ display: 'none' }}
                id="document-file-input"
              />
              <label htmlFor="document-file-input">
                <Button
                  variant="outlined"
                  component="span"
                  fullWidth
                  sx={{ py: 2 }}
                >
                  {selectedFile ? selectedFile.name : 'Choose File'}
                </Button>
              </label>
              {uploadErrors.file && (
                <Typography variant="caption" color="error" sx={{ mt: 0.5, display: 'block' }}>
                  {uploadErrors.file}
                </Typography>
              )}
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                Allowed formats: PDF, JPG, PNG (max 10MB)
              </Typography>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseUploadDialog} color="inherit" disabled={uploadLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleUpload}
            variant="contained"
            color="primary"
            disabled={uploadLoading}
            startIcon={uploadLoading ? <CircularProgress size={16} /> : undefined}
          >
            {uploadLoading ? 'Uploading...' : 'Upload'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        title="Delete Document"
        message={`Are you sure you want to delete "${documentToDelete?.fileName}"? This action cannot be undone.`}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
        loading={deleteLoading}
      />
    </Container>
  );
};
