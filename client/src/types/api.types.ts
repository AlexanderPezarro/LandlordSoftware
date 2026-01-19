// API Response Types
export interface ApiSuccessResponse {
  success: true;
  [key: string]: unknown;
}

export interface ApiErrorResponse {
  success: false;
  error: string | { code: string; message: string; details?: unknown };
}

export type ApiResponse = ApiSuccessResponse | ApiErrorResponse;

// Custom Error Class
export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

// Auth Types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface User {
  id: string;
  email: string;
}

export interface AuthResponse {
  success: boolean;
  user?: User;
  error?: string;
}

// Properties Types
export interface Property {
  id: string;
  name: string;
  street: string;
  city: string;
  county: string;
  postcode: string;
  propertyType: 'House' | 'Flat' | 'Studio' | 'Bungalow' | 'Terraced' | 'Semi-Detached' | 'Detached' | 'Maisonette' | 'Commercial';
  purchaseDate?: string | null;
  purchasePrice?: number | null;
  status: 'Available' | 'Occupied' | 'Under Maintenance' | 'For Sale';
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePropertyRequest {
  name: string;
  street: string;
  city: string;
  county: string;
  postcode: string;
  propertyType: 'House' | 'Flat' | 'Studio' | 'Bungalow' | 'Terraced' | 'Semi-Detached' | 'Detached' | 'Maisonette' | 'Commercial';
  purchaseDate?: string | null;
  purchasePrice?: number | null;
  status: 'Available' | 'Occupied' | 'Under Maintenance' | 'For Sale';
  notes?: string | null;
}

export interface UpdatePropertyRequest {
  name?: string;
  street?: string;
  city?: string;
  county?: string;
  postcode?: string;
  propertyType?: 'House' | 'Flat' | 'Studio' | 'Bungalow' | 'Terraced' | 'Semi-Detached' | 'Detached' | 'Maisonette' | 'Commercial';
  purchaseDate?: string | null;
  purchasePrice?: number | null;
  status?: 'Available' | 'Occupied' | 'Under Maintenance' | 'For Sale';
  notes?: string | null;
}

export interface PropertyFilters {
  status?: 'Available' | 'Occupied' | 'Under Maintenance' | 'For Sale';
  propertyType?: 'House' | 'Flat' | 'Studio' | 'Bungalow' | 'Terraced' | 'Semi-Detached' | 'Detached' | 'Maisonette' | 'Commercial';
  search?: string;
}

export interface PropertiesResponse {
  success: true;
  properties: Property[];
}

export interface PropertyResponse {
  success: true;
  property: Property;
}

// Tenants Types
export interface Tenant {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  status: 'Prospective' | 'Active' | 'Former';
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTenantRequest {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  status: 'Prospective' | 'Active' | 'Former';
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  notes?: string | null;
}

export interface UpdateTenantRequest {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string | null;
  status?: 'Prospective' | 'Active' | 'Former';
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  notes?: string | null;
}

export interface TenantFilters {
  status?: 'Prospective' | 'Active' | 'Former';
  search?: string;
}

export interface LeaseHistoryFilters {
  fromDate?: string;
  toDate?: string;
}

export interface TenantsResponse {
  success: true;
  tenants: Tenant[];
}

export interface TenantResponse {
  success: true;
  tenant: Tenant;
}

// Leases Types
export interface Lease {
  id: string;
  propertyId: string;
  tenantId: string;
  startDate: string;
  endDate?: string | null;
  monthlyRent: number;
  securityDepositAmount: number;
  securityDepositPaidDate?: string | null;
  status: 'Draft' | 'Active' | 'Expired' | 'Terminated';
  createdAt: string;
  updatedAt: string;
  property?: Property;
  tenant?: Tenant;
}

export interface CreateLeaseRequest {
  propertyId: string;
  tenantId: string;
  startDate: string;
  endDate?: string | null;
  monthlyRent: number;
  securityDepositAmount: number;
  securityDepositPaidDate?: string | null;
  status: 'Draft' | 'Active' | 'Expired' | 'Terminated';
}

export interface UpdateLeaseRequest {
  propertyId?: string;
  tenantId?: string;
  startDate?: string;
  endDate?: string | null;
  monthlyRent?: number;
  securityDepositAmount?: number;
  securityDepositPaidDate?: string | null;
  status?: 'Draft' | 'Active' | 'Expired' | 'Terminated';
}

export interface LeaseFilters {
  propertyId?: string | string[];
  tenantId?: string;
  status?: 'Draft' | 'Active' | 'Expired' | 'Terminated';
}

export interface LeasesResponse {
  success: true;
  leases: Lease[];
}

export interface LeaseResponse {
  success: true;
  lease: Lease;
}

// Transactions Types
export interface Transaction {
  id: string;
  propertyId: string;
  leaseId?: string | null;
  type: 'Income' | 'Expense';
  category: string;
  amount: number;
  transactionDate: string;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
  property?: Property;
  lease?: Lease;
}

export interface CreateTransactionRequest {
  propertyId: string;
  leaseId?: string | null;
  type: 'Income' | 'Expense';
  category: string;
  amount: number;
  transactionDate: string;
  description?: string | null;
}

export interface UpdateTransactionRequest {
  propertyId?: string;
  leaseId?: string | null;
  type?: 'Income' | 'Expense';
  category?: string;
  amount?: number;
  transactionDate?: string;
  description?: string | null;
}

export interface TransactionFilters {
  propertyId?: string;
  type?: 'Income' | 'Expense';
  category?: string;
  startDate?: string;
  endDate?: string;
}

export interface TransactionSummary {
  total_income: number;
  total_expense: number;
  net: number;
  transaction_count: number;
}

export interface TransactionsResponse {
  success: true;
  transactions: Transaction[];
}

export interface TransactionResponse {
  success: true;
  transaction: Transaction;
}

export interface TransactionSummaryResponse {
  success: true;
  summary: TransactionSummary;
}

// Events Types
export interface Event {
  id: string;
  propertyId: string;
  eventType: 'Inspection' | 'Maintenance' | 'Repair' | 'Meeting' | 'Rent Due Date' | 'Lease Renewal' | 'Viewing';
  title: string;
  scheduledDate: string;
  completed: boolean;
  completedDate?: string | null;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEventRequest {
  propertyId: string;
  eventType: 'Inspection' | 'Maintenance' | 'Repair' | 'Meeting' | 'Rent Due Date' | 'Lease Renewal' | 'Viewing';
  title: string;
  scheduledDate: string;
  completed?: boolean;
  completedDate?: string | null;
  description?: string | null;
}

export interface UpdateEventRequest {
  propertyId?: string;
  eventType?: 'Inspection' | 'Maintenance' | 'Repair' | 'Meeting' | 'Rent Due Date' | 'Lease Renewal' | 'Viewing';
  title?: string;
  scheduledDate?: string;
  completed?: boolean;
  completedDate?: string | null;
  description?: string | null;
}

export interface EventFilters {
  propertyId?: string;
  eventType?: 'Inspection' | 'Maintenance' | 'Repair' | 'Meeting' | 'Rent Due Date' | 'Lease Renewal' | 'Viewing';
  completed?: boolean;
  fromDate?: string;
  toDate?: string;
}

export interface EventsResponse {
  success: true;
  events: Event[];
}

export interface EventResponse {
  success: true;
  event: Event;
}

// Documents Types
export interface Document {
  id: string;
  entityType: 'Property' | 'Tenant' | 'Lease' | 'Transaction';
  entityId: string;
  fileName: string;
  filePath: string;
  fileType: string;
  fileSize: number;
  uploadedAt: string;
}

export interface DocumentsResponse {
  success: true;
  documents: Document[];
}

export interface DocumentResponse {
  success: true;
  document: Document;
}

// Reports Types
export interface MonthlyPLData {
  [monthKey: string]: {
    income: Record<string, number>;
    expense: Record<string, number>;
  };
}

export interface CategoryBreakdown {
  income: Record<string, number>;
  expense: Record<string, number>;
}

export interface PropertyPerformance {
  propertyId: string;
  propertyName: string;
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
}

export interface PLReportResponse {
  success: true;
  data: MonthlyPLData;
}

export interface CategoryBreakdownResponse {
  success: true;
  data: CategoryBreakdown;
}

export interface PropertyPerformanceResponse {
  success: true;
  data: PropertyPerformance[];
}
