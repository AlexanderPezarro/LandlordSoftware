import React, { useEffect, useState } from 'react';
import {
  Container,
  Typography,
  Box,
  Button,
  Tabs,
  Tab,
  CircularProgress,
  Alert,
  Paper,
  Chip,
  useTheme,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  InputAdornment,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  CalendarMonth as CalendarIcon,
  AccountBalance as AccountBalanceIcon,
  Description as DescriptionIcon,
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { propertiesService } from '../services/api/properties.service';
import { leasesService } from '../services/api/leases.service';
import { transactionsService } from '../services/api/transactions.service';
import { eventsService } from '../services/api/events.service';
import type {
  Property,
  Lease,
  Transaction,
  Event,
  UpdatePropertyRequest,
} from '../types/api.types';
import { ApiError } from '../types/api.types';
import EventBadge from '../components/shared/EventBadge';
import { useToast } from '../contexts/ToastContext';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`property-tabpanel-${index}`}
      aria-labelledby={`property-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `property-tab-${index}`,
    'aria-controls': `property-tabpanel-${index}`,
  };
}

type PropertyStatus = 'Available' | 'Occupied' | 'Under Maintenance' | 'For Sale';
type PropertyType = 'House' | 'Flat' | 'Studio' | 'Bungalow' | 'Terraced' | 'Semi-Detached' | 'Detached' | 'Maisonette' | 'Commercial';

const PROPERTY_STATUSES: PropertyStatus[] = ['Available', 'Occupied', 'Under Maintenance', 'For Sale'];
const PROPERTY_TYPES: PropertyType[] = ['House', 'Flat', 'Studio', 'Bungalow', 'Terraced', 'Semi-Detached', 'Detached', 'Maisonette', 'Commercial'];

export const PropertyDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const theme = useTheme();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [property, setProperty] = useState<Property | null>(null);
  const [leases, setLeases] = useState<Lease[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [tabValue, setTabValue] = useState(0);

  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [formData, setFormData] = useState<UpdatePropertyRequest>({});
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (id) {
      fetchPropertyData();
    }
  }, [id]);

  const fetchPropertyData = async () => {
    if (!id) return;

    try {
      setLoading(true);
      setError(null);

      const [propertyData, leasesData, transactionsData, eventsData] = await Promise.all([
        propertiesService.getProperty(id),
        leasesService.getLeases({ propertyId: id }),
        transactionsService.getTransactions({ propertyId: id }),
        eventsService.getEvents({ propertyId: id }),
      ]);

      setProperty(propertyData);
      setLeases(leasesData);
      setTransactions(transactionsData);
      setEvents(eventsData);
    } catch (err) {
      console.error('Error fetching property data:', err);
      const errorMessage = err instanceof ApiError ? err.message : 'Failed to load property details';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleBack = () => {
    navigate('/properties');
  };

  const handleEditClick = () => {
    if (!property) return;

    setFormData({
      name: property.name,
      street: property.street,
      city: property.city,
      county: property.county,
      postcode: property.postcode,
      propertyType: property.propertyType,
      status: property.status,
      purchaseDate: property.purchaseDate,
      purchasePrice: property.purchasePrice,
      notes: property.notes,
    });
    setFormErrors({});
    setEditDialogOpen(true);
  };

  const handleCloseEditDialog = () => {
    setEditDialogOpen(false);
    setFormData({});
    setFormErrors({});
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (formData.name !== undefined && !formData.name.trim()) {
      errors.name = 'Property name is required';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveEdit = async () => {
    if (!property || !validateForm()) return;

    try {
      await propertiesService.updateProperty(property.id, formData);
      toast.success('Property updated successfully');
      handleCloseEditDialog();
      await fetchPropertyData();
    } catch (err) {
      console.error('Error updating property:', err);
      const errorMessage = err instanceof ApiError ? err.message : 'Failed to update property';
      toast.error(errorMessage);
    }
  };

  const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined) return 'N/A';
    return `£${amount.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM dd, yyyy');
    } catch {
      return dateString;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Available':
        return 'warning';
      case 'Occupied':
        return 'success';
      case 'For Sale':
        return 'info';
      case 'Under Maintenance':
        return 'error';
      case 'Active':
        return 'success';
      case 'Draft':
        return 'default';
      case 'Expired':
        return 'warning';
      case 'Terminated':
        return 'error';
      default:
        return 'default';
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error || !property) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ mb: 4 }}>
          <Button startIcon={<ArrowBackIcon />} onClick={handleBack} sx={{ mb: 2 }}>
            Back to Properties
          </Button>
          <Alert severity="error">{error || 'Property not found'}</Alert>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 4 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={handleBack} sx={{ mb: 2 }}>
          Back to Properties
        </Button>

        <Paper sx={{ p: 3, mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Box>
              <Typography variant="h4" component="h1" gutterBottom>
                {property.name}
              </Typography>
              <Typography variant="body1" color="text.secondary" gutterBottom>
                {property.street}, {property.city}, {property.county} {property.postcode}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                <Chip label={property.status} color={getStatusColor(property.status) as any} size="small" />
                <Chip label={property.propertyType} variant="outlined" size="small" />
              </Box>
            </Box>
            <Button variant="contained" startIcon={<EditIcon />} onClick={handleEditClick}>
              Edit
            </Button>
          </Box>
        </Paper>

        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="property tabs">
            <Tab icon={<DescriptionIcon />} iconPosition="start" label="Overview" {...a11yProps(0)} />
            <Tab icon={<AccountBalanceIcon />} iconPosition="start" label={`Leases (${leases.length})`} {...a11yProps(1)} />
            <Tab icon={<AccountBalanceIcon />} iconPosition="start" label={`Transactions (${transactions.length})`} {...a11yProps(2)} />
            <Tab icon={<CalendarIcon />} iconPosition="start" label={`Events (${events.length})`} {...a11yProps(3)} />
          </Tabs>
        </Box>

        <TabPanel value={tabValue} index={0}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Property Details
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2, mt: 2 }}>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Property Type
                </Typography>
                <Typography variant="body1">{property.propertyType}</Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Status
                </Typography>
                <Typography variant="body1">{property.status}</Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Purchase Date
                </Typography>
                <Typography variant="body1">{property.purchaseDate ? formatDate(property.purchaseDate) : 'N/A'}</Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Purchase Price
                </Typography>
                <Typography variant="body1">{formatCurrency(property.purchasePrice)}</Typography>
              </Box>
            </Box>

            {property.notes && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Notes
                </Typography>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                  {property.notes}
                </Typography>
              </Box>
            )}
          </Paper>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          {leases.length === 0 ? (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="body1" color="text.secondary">
                No leases found for this property
              </Typography>
            </Paper>
          ) : (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Tenant</TableCell>
                    <TableCell>Start Date</TableCell>
                    <TableCell>End Date</TableCell>
                    <TableCell>Rent Amount</TableCell>
                    <TableCell>Security Deposit</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {leases.map((lease) => (
                    <TableRow key={lease.id}>
                      <TableCell>
                        {lease.tenant ? `${lease.tenant.firstName} ${lease.tenant.lastName}` : 'N/A'}
                      </TableCell>
                      <TableCell>{formatDate(lease.startDate)}</TableCell>
                      <TableCell>{lease.endDate ? formatDate(lease.endDate) : 'N/A'}</TableCell>
                      <TableCell>{formatCurrency(lease.monthlyRent)}</TableCell>
                      <TableCell>{formatCurrency(lease.securityDepositAmount)}</TableCell>
                      <TableCell>
                        <Chip label={lease.status} color={getStatusColor(lease.status) as any} size="small" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          {transactions.length === 0 ? (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="body1" color="text.secondary">
                No transactions found for this property
              </Typography>
            </Paper>
          ) : (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Category</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell>Amount</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {transactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>{formatDate(transaction.transactionDate)}</TableCell>
                      <TableCell>
                        <Chip
                          label={transaction.type}
                          color={transaction.type === 'Income' ? 'success' : 'error'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{transaction.category}</TableCell>
                      <TableCell>{transaction.description || 'N/A'}</TableCell>
                      <TableCell
                        sx={{
                          color:
                            transaction.type === 'Income'
                              ? theme.palette.success.main
                              : theme.palette.error.main,
                          fontWeight: 600,
                        }}
                      >
                        {transaction.type === 'Income' ? '+' : '-'}
                        {formatCurrency(transaction.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </TabPanel>

        <TabPanel value={tabValue} index={3}>
          {events.length === 0 ? (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="body1" color="text.secondary">
                No events found for this property
              </Typography>
            </Paper>
          ) : (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Event Type</TableCell>
                    <TableCell>Title</TableCell>
                    <TableCell>Scheduled Date</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Description</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {events.map((event) => (
                    <TableRow key={event.id}>
                      <TableCell>
                        <EventBadge event={event} />
                      </TableCell>
                      <TableCell>{event.title}</TableCell>
                      <TableCell>{formatDate(event.scheduledDate)}</TableCell>
                      <TableCell>
                        <Chip
                          label={event.completed ? 'Completed' : 'Pending'}
                          color={event.completed ? 'success' : 'warning'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{event.description || 'N/A'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </TabPanel>
      </Box>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onClose={handleCloseEditDialog} maxWidth="md" fullWidth>
        <DialogTitle>Edit Property</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Property Name"
              value={formData.name || ''}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              error={!!formErrors.name}
              helperText={formErrors.name}
              fullWidth
            />
            <TextField
              label="Street Address"
              value={formData.street || ''}
              onChange={(e) => setFormData({ ...formData, street: e.target.value })}
              fullWidth
            />
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <TextField
                label="City"
                value={formData.city || ''}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              />
              <TextField
                label="County"
                value={formData.county || ''}
                onChange={(e) => setFormData({ ...formData, county: e.target.value })}
              />
            </Box>
            <TextField
              label="Postcode"
              value={formData.postcode || ''}
              onChange={(e) => setFormData({ ...formData, postcode: e.target.value })}
              fullWidth
            />
            <TextField
              label="Property Type"
              select
              value={formData.propertyType || property.propertyType}
              onChange={(e) => setFormData({ ...formData, propertyType: e.target.value as PropertyType })}
              fullWidth
            >
              {PROPERTY_TYPES.map((type) => (
                <MenuItem key={type} value={type}>
                  {type}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Status"
              select
              value={formData.status || property.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as PropertyStatus })}
              fullWidth
            >
              {PROPERTY_STATUSES.map((status) => (
                <MenuItem key={status} value={status}>
                  {status}
                </MenuItem>
              ))}
            </TextField>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <TextField
                label="Purchase Date"
                type="date"
                value={formData.purchaseDate ?? property.purchaseDate ?? ''}
                onChange={(e) =>
                  setFormData({ ...formData, purchaseDate: e.target.value || null })
                }
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                label="Purchase Price"
                type="number"
                value={formData.purchasePrice ?? property.purchasePrice ?? ''}
                onChange={(e) =>
                  setFormData({ ...formData, purchasePrice: e.target.value ? parseFloat(e.target.value) : null })
                }
                InputProps={{
                  startAdornment: <InputAdornment position="start">£</InputAdornment>,
                }}
              />
            </Box>
            <TextField
              label="Notes"
              value={formData.notes ?? property.notes ?? ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value || null })}
              multiline
              rows={3}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEditDialog} color="inherit">
            Cancel
          </Button>
          <Button onClick={handleSaveEdit} variant="contained" color="primary">
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};
