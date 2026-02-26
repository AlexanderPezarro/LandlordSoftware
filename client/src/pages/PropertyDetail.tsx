import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { format } from 'date-fns';
import {
  ArrowLeft,
  Pencil,
  FileText,
  Landmark,
  Calendar,
  DollarSign,
  Plus,
  AlertCircle,
} from 'lucide-react';
import { Container } from '../components/primitives/Container';
import { Button } from '../components/primitives/Button';
import { TextField } from '../components/primitives/TextField';
import { Select } from '../components/primitives/Select';
import { Card } from '../components/primitives/Card';
import { Chip } from '../components/primitives/Chip';
import { Table } from '../components/primitives/Table';
import { Dialog } from '../components/primitives/Dialog';
import { Spinner } from '../components/primitives/Spinner';
import { EventBadge } from '../components/composed/EventBadge/EventBadge';
import { BalanceCard } from '../components/composed/Settlement/BalanceCard';
import { SettlementForm } from '../components/composed/Settlement/SettlementForm';
import { SettlementHistory } from '../components/composed/Settlement/SettlementHistory';
import { propertiesService } from '../services/api/properties.service';
import { leasesService } from '../services/api/leases.service';
import { transactionsService } from '../services/api/transactions.service';
import { eventsService } from '../services/api/events.service';
import { propertyOwnershipService } from '../services/api/propertyOwnership.service';
import { settlementService } from '../services/api/settlement.service';
import type { PropertyOwnership } from '../services/api/propertyOwnership.service';
import type { Balance, Settlement } from '../services/api/settlement.service';
import type {
  Property,
  Lease,
  Transaction,
  Event,
  UpdatePropertyRequest,
} from '../types/api.types';
import { ApiError } from '../types/api.types';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import styles from './PropertyDetail.module.scss';

type PropertyStatus = 'Available' | 'Occupied' | 'Under Maintenance' | 'For Sale';
type PropertyType = 'House' | 'Flat' | 'Studio' | 'Bungalow' | 'Terraced' | 'Semi-Detached' | 'Detached' | 'Maisonette' | 'Commercial';

const PROPERTY_STATUSES: PropertyStatus[] = ['Available', 'Occupied', 'Under Maintenance', 'For Sale'];
const PROPERTY_TYPES: PropertyType[] = ['House', 'Flat', 'Studio', 'Bungalow', 'Terraced', 'Semi-Detached', 'Detached', 'Maisonette', 'Commercial'];

const PROPERTY_TYPE_OPTIONS = PROPERTY_TYPES.map((t) => ({ value: t, label: t }));
const PROPERTY_STATUS_OPTIONS = PROPERTY_STATUSES.map((s) => ({ value: s, label: s }));

interface TabDef {
  label: string;
  icon: React.ReactNode;
}

export const PropertyDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [property, setProperty] = useState<Property | null>(null);
  const [leases, setLeases] = useState<Lease[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [tabValue, setTabValue] = useState(0);

  // Settlement-related state
  const [balances, setBalances] = useState<Balance[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [owners, setOwners] = useState<PropertyOwnership[]>([]);
  const [settlementLoading, setSettlementLoading] = useState(false);
  const [settlementFormOpen, setSettlementFormOpen] = useState(false);

  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [formData, setFormData] = useState<UpdatePropertyRequest>({});
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const tabs: TabDef[] = [
    { label: 'Overview', icon: <FileText size={18} /> },
    { label: `Leases (${leases.length})`, icon: <Landmark size={18} /> },
    { label: `Transactions (${transactions.length})`, icon: <Landmark size={18} /> },
    { label: `Events (${events.length})`, icon: <Calendar size={18} /> },
    { label: 'Balances & Settlements', icon: <DollarSign size={18} /> },
  ];

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

  const handleTabChange = (newValue: number) => {
    setTabValue(newValue);
    // Load settlement data when Balances tab is selected
    if (newValue === 4 && id) {
      loadBalancesData();
    }
  };

  const loadBalancesData = async () => {
    if (!id) return;

    setSettlementLoading(true);
    try {
      const [balancesData, settlementsData, ownersData] = await Promise.all([
        settlementService.getPropertyBalances(id),
        settlementService.getPropertySettlements(id),
        propertyOwnershipService.listOwners(id),
      ]);

      setBalances(balancesData);
      setSettlements(settlementsData);
      setOwners(ownersData);
    } catch (loadError) {
      console.error('Failed to load balances:', loadError);
      toast.error('Failed to load settlement data');
    } finally {
      setSettlementLoading(false);
    }
  };

  const handleSettlementSuccess = () => {
    loadBalancesData();
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
    return `\u00A3${amount.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM dd, yyyy');
    } catch {
      return dateString;
    }
  };

  const getStatusColor = (status: string): 'default' | 'primary' | 'success' | 'warning' | 'error' => {
    switch (status) {
      case 'Available':
        return 'warning';
      case 'Occupied':
        return 'success';
      case 'For Sale':
        return 'primary';
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
        <div className={styles.loadingWrapper}>
          <Spinner />
        </div>
      </Container>
    );
  }

  if (error || !property) {
    return (
      <Container maxWidth="lg">
        <div className={styles.page}>
          <div className={styles.backButton}>
            <Button variant="text" startIcon={<ArrowLeft size={18} />} onClick={handleBack}>
              Back to Properties
            </Button>
          </div>
          <div className={styles.alert}>
            <AlertCircle size={20} />
            {error || 'Property not found'}
          </div>
        </div>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <div className={styles.page}>
        <div className={styles.backButton}>
          <Button variant="text" startIcon={<ArrowLeft size={18} />} onClick={handleBack}>
            Back to Properties
          </Button>
        </div>

        {/* Property Header Card */}
        <Card className={styles.headerCard}>
          <Card.Content>
            <div className={styles.headerContent}>
              <div className={styles.headerInfo}>
                <h1 className={styles.propertyName}>{property.name}</h1>
                <p className={styles.propertyAddress}>
                  {property.street}, {property.city}, {property.county} {property.postcode}
                </p>
                <div className={styles.chipRow}>
                  <Chip label={property.status} color={getStatusColor(property.status)} size="small" />
                  <Chip label={property.propertyType} color="default" size="small" />
                </div>
              </div>
              <Button variant="primary" startIcon={<Pencil size={18} />} onClick={handleEditClick}>
                Edit
              </Button>
            </div>
          </Card.Content>
        </Card>

        {/* Tab Navigation */}
        <div className={styles.tabBar} role="tablist" aria-label="property tabs">
          {tabs.map((tab, index) => (
            <button
              key={index}
              role="tab"
              id={`property-tab-${index}`}
              aria-controls={`property-tabpanel-${index}`}
              aria-selected={tabValue === index}
              className={`${styles.tab} ${tabValue === index ? styles.tabActive : ''}`}
              onClick={() => handleTabChange(index)}
            >
              <span className={styles.tabIcon}>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Panel: Overview */}
        {tabValue === 0 && (
          <div
            role="tabpanel"
            id="property-tabpanel-0"
            aria-labelledby="property-tab-0"
            className={styles.tabPanel}
          >
            <Card>
              <Card.Content>
                <h2 className={styles.detailsTitle}>Property Details</h2>
                <div className={styles.detailsGrid}>
                  <div>
                    <p className={styles.detailLabel}>Property Type</p>
                    <p className={styles.detailValue}>{property.propertyType}</p>
                  </div>
                  <div>
                    <p className={styles.detailLabel}>Status</p>
                    <p className={styles.detailValue}>{property.status}</p>
                  </div>
                  <div>
                    <p className={styles.detailLabel}>Purchase Date</p>
                    <p className={styles.detailValue}>{property.purchaseDate ? formatDate(property.purchaseDate) : 'N/A'}</p>
                  </div>
                  <div>
                    <p className={styles.detailLabel}>Purchase Price</p>
                    <p className={styles.detailValue}>{formatCurrency(property.purchasePrice)}</p>
                  </div>
                </div>

                {property.notes && (
                  <div className={styles.notesSection}>
                    <h2 className={styles.notesTitle}>Notes</h2>
                    <p className={styles.notesText}>{property.notes}</p>
                  </div>
                )}
              </Card.Content>
            </Card>
          </div>
        )}

        {/* Tab Panel: Leases */}
        {tabValue === 1 && (
          <div
            role="tabpanel"
            id="property-tabpanel-1"
            aria-labelledby="property-tab-1"
            className={styles.tabPanel}
          >
            {leases.length === 0 ? (
              <Card>
                <Card.Content>
                  <div className={styles.emptySection}>
                    <p className={styles.emptyText}>No leases found for this property</p>
                  </div>
                </Card.Content>
              </Card>
            ) : (
              <Table.Container>
                <Table>
                  <Table.Head>
                    <Table.Row>
                      <Table.Cell sortable={false}>Tenant</Table.Cell>
                      <Table.Cell sortable={false}>Start Date</Table.Cell>
                      <Table.Cell sortable={false}>End Date</Table.Cell>
                      <Table.Cell sortable={false}>Rent Amount</Table.Cell>
                      <Table.Cell sortable={false}>Security Deposit</Table.Cell>
                      <Table.Cell sortable={false}>Status</Table.Cell>
                    </Table.Row>
                  </Table.Head>
                  <Table.Body>
                    {leases.map((lease) => (
                      <Table.Row key={lease.id}>
                        <Table.Cell>
                          {lease.tenant ? `${lease.tenant.firstName} ${lease.tenant.lastName}` : 'N/A'}
                        </Table.Cell>
                        <Table.Cell>{formatDate(lease.startDate)}</Table.Cell>
                        <Table.Cell>{lease.endDate ? formatDate(lease.endDate) : 'N/A'}</Table.Cell>
                        <Table.Cell>{formatCurrency(lease.monthlyRent)}</Table.Cell>
                        <Table.Cell>{formatCurrency(lease.securityDepositAmount)}</Table.Cell>
                        <Table.Cell>
                          <Chip label={lease.status} color={getStatusColor(lease.status)} size="small" />
                        </Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table>
              </Table.Container>
            )}
          </div>
        )}

        {/* Tab Panel: Transactions */}
        {tabValue === 2 && (
          <div
            role="tabpanel"
            id="property-tabpanel-2"
            aria-labelledby="property-tab-2"
            className={styles.tabPanel}
          >
            {transactions.length === 0 ? (
              <Card>
                <Card.Content>
                  <div className={styles.emptySection}>
                    <p className={styles.emptyText}>No transactions found for this property</p>
                  </div>
                </Card.Content>
              </Card>
            ) : (
              <Table.Container>
                <Table>
                  <Table.Head>
                    <Table.Row>
                      <Table.Cell sortable={false}>Date</Table.Cell>
                      <Table.Cell sortable={false}>Type</Table.Cell>
                      <Table.Cell sortable={false}>Category</Table.Cell>
                      <Table.Cell sortable={false}>Description</Table.Cell>
                      <Table.Cell sortable={false}>Amount</Table.Cell>
                    </Table.Row>
                  </Table.Head>
                  <Table.Body>
                    {transactions.map((transaction) => (
                      <Table.Row key={transaction.id}>
                        <Table.Cell>{formatDate(transaction.transactionDate)}</Table.Cell>
                        <Table.Cell>
                          <Chip
                            label={transaction.type}
                            color={transaction.type === 'Income' ? 'success' : 'error'}
                            size="small"
                          />
                        </Table.Cell>
                        <Table.Cell>{transaction.category}</Table.Cell>
                        <Table.Cell>{transaction.description || 'N/A'}</Table.Cell>
                        <Table.Cell>
                          <span className={transaction.type === 'Income' ? styles.amountIncome : styles.amountExpense}>
                            {transaction.type === 'Income' ? '+' : '-'}
                            {formatCurrency(transaction.amount)}
                          </span>
                        </Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table>
              </Table.Container>
            )}
          </div>
        )}

        {/* Tab Panel: Events */}
        {tabValue === 3 && (
          <div
            role="tabpanel"
            id="property-tabpanel-3"
            aria-labelledby="property-tab-3"
            className={styles.tabPanel}
          >
            {events.length === 0 ? (
              <Card>
                <Card.Content>
                  <div className={styles.emptySection}>
                    <p className={styles.emptyText}>No events found for this property</p>
                  </div>
                </Card.Content>
              </Card>
            ) : (
              <Table.Container>
                <Table>
                  <Table.Head>
                    <Table.Row>
                      <Table.Cell sortable={false}>Event Type</Table.Cell>
                      <Table.Cell sortable={false}>Title</Table.Cell>
                      <Table.Cell sortable={false}>Scheduled Date</Table.Cell>
                      <Table.Cell sortable={false}>Status</Table.Cell>
                      <Table.Cell sortable={false}>Description</Table.Cell>
                    </Table.Row>
                  </Table.Head>
                  <Table.Body>
                    {events.map((event) => (
                      <Table.Row key={event.id}>
                        <Table.Cell>
                          <EventBadge event={event} />
                        </Table.Cell>
                        <Table.Cell>{event.title}</Table.Cell>
                        <Table.Cell>{formatDate(event.scheduledDate)}</Table.Cell>
                        <Table.Cell>
                          <Chip
                            label={event.completed ? 'Completed' : 'Pending'}
                            color={event.completed ? 'success' : 'warning'}
                            size="small"
                          />
                        </Table.Cell>
                        <Table.Cell>{event.description || 'N/A'}</Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table>
              </Table.Container>
            )}
          </div>
        )}

        {/* Tab Panel: Balances & Settlements */}
        {tabValue === 4 && (
          <div
            role="tabpanel"
            id="property-tabpanel-4"
            aria-labelledby="property-tab-4"
            className={styles.tabPanel}
          >
            {settlementLoading ? (
              <div className={styles.loadingWrapper}>
                <Spinner />
              </div>
            ) : (
              <>
                <div className={styles.sectionHeader}>
                  <h2 className={styles.sectionTitle}>Balances & Settlements</h2>
                  {owners.length > 1 && (
                    <Button
                      variant="primary"
                      startIcon={<Plus size={18} />}
                      onClick={() => setSettlementFormOpen(true)}
                    >
                      Record Settlement
                    </Button>
                  )}
                </div>

                {owners.length < 2 ? (
                  <Card>
                    <Card.Content>
                      <div className={styles.emptySection}>
                        <p className={styles.emptyText}>
                          This property needs at least two owners to track balances and settlements.
                        </p>
                      </div>
                    </Card.Content>
                  </Card>
                ) : (
                  <div className={styles.settlementStack}>
                    <BalanceCard balances={balances} currentUserId={user?.id} />
                    <SettlementHistory settlements={settlements} />
                  </div>
                )}

                {id && (
                  <SettlementForm
                    open={settlementFormOpen}
                    onClose={() => setSettlementFormOpen(false)}
                    propertyId={id}
                    owners={owners}
                    balances={balances}
                    onSuccess={handleSettlementSuccess}
                  />
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onClose={handleCloseEditDialog} size="large">
        <Dialog.Title>Edit Property</Dialog.Title>
        <Dialog.Content>
          <div className={styles.formFields}>
            <TextField
              label="Property Name"
              value={formData.name || ''}
              onChange={(e) => setFormData({ ...formData, name: (e.target as HTMLInputElement).value })}
              error={!!formErrors.name}
              helperText={formErrors.name}
              fullWidth
            />
            <TextField
              label="Street Address"
              value={formData.street || ''}
              onChange={(e) => setFormData({ ...formData, street: (e.target as HTMLInputElement).value })}
              fullWidth
            />
            <div className={styles.formRow}>
              <TextField
                label="City"
                value={formData.city || ''}
                onChange={(e) => setFormData({ ...formData, city: (e.target as HTMLInputElement).value })}
              />
              <TextField
                label="County"
                value={formData.county || ''}
                onChange={(e) => setFormData({ ...formData, county: (e.target as HTMLInputElement).value })}
              />
            </div>
            <TextField
              label="Postcode"
              value={formData.postcode || ''}
              onChange={(e) => setFormData({ ...formData, postcode: (e.target as HTMLInputElement).value })}
              fullWidth
            />
            <Select
              label="Property Type"
              value={formData.propertyType || property.propertyType}
              onChange={(value) => setFormData({ ...formData, propertyType: value as PropertyType })}
              options={PROPERTY_TYPE_OPTIONS}
              fullWidth
            />
            <Select
              label="Status"
              value={formData.status || property.status}
              onChange={(value) => setFormData({ ...formData, status: value as PropertyStatus })}
              options={PROPERTY_STATUS_OPTIONS}
              fullWidth
            />
            <div className={styles.formRow}>
              <TextField
                label="Purchase Date"
                type="date"
                value={(formData.purchaseDate ?? property.purchaseDate ?? '') as string}
                onChange={(e) =>
                  setFormData({ ...formData, purchaseDate: (e.target as HTMLInputElement).value || null })
                }
              />
              <TextField
                label="Purchase Price"
                type="number"
                value={String(formData.purchasePrice ?? property.purchasePrice ?? '')}
                onChange={(e) =>
                  setFormData({ ...formData, purchasePrice: (e.target as HTMLInputElement).value ? parseFloat((e.target as HTMLInputElement).value) : null })
                }
                startAdornment={<span>\u00A3</span>}
              />
            </div>
            <TextField
              label="Notes"
              value={(formData.notes ?? property.notes ?? '') as string}
              onChange={(e) => setFormData({ ...formData, notes: (e.target as HTMLInputElement).value || null })}
              multiline
              rows={3}
              fullWidth
            />
          </div>
        </Dialog.Content>
        <Dialog.Actions>
          <Button variant="text" onClick={handleCloseEditDialog}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSaveEdit}>
            Save
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Container>
  );
};
