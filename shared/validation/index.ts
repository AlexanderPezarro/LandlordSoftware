// Property Validation
export {
  PropertyTypeSchema,
  PropertyStatusSchema,
  CreatePropertySchema,
  UpdatePropertySchema,
  PropertySchema,
  type PropertyType,
  type PropertyStatus,
  type CreateProperty,
  type UpdateProperty,
  type Property,
} from './property.validation.js';

// Tenant Validation
export {
  TenantStatusSchema,
  CreateTenantSchema,
  UpdateTenantSchema,
  TenantSchema,
  type TenantStatus,
  type CreateTenant,
  type UpdateTenant,
  type Tenant,
} from './tenant.validation.js';

// Lease Validation
export {
  LeaseStatusSchema,
  CreateLeaseSchema,
  UpdateLeaseSchema,
  LeaseSchema,
  type LeaseStatus,
  type CreateLease,
  type UpdateLease,
  type Lease,
} from './lease.validation.js';

// Transaction Validation
export {
  TransactionTypeSchema,
  IncomeCategorySchema,
  ExpenseCategorySchema,
  TransactionCategorySchema,
  CreateTransactionSchema,
  UpdateTransactionSchema,
  TransactionSchema,
  type TransactionType,
  type IncomeCategory,
  type ExpenseCategory,
  type TransactionCategory,
  type CreateTransaction,
  type UpdateTransaction,
  type Transaction,
} from './transaction.validation.js';

// Event Validation
export {
  EventTypeSchema,
  CreateEventSchema,
  UpdateEventSchema,
  EventSchema,
  type EventType,
  type CreateEvent,
  type UpdateEvent,
  type Event,
} from './event.validation.js';

// Document Validation
export {
  AllowedMimeTypesSchema,
  EntityTypeSchema,
  CreateDocumentSchema,
  UpdateDocumentSchema,
  DocumentSchema,
  FileUploadSchema,
  MAX_DOCUMENT_SIZE,
  ALLOWED_MIME_TYPES,
  type AllowedMimeTypes,
  type EntityType,
  type CreateDocument,
  type UpdateDocument,
  type Document,
  type FileUpload,
} from './document.validation.js';

// Auth Validation
export {
  LoginFormSchema,
  type LoginFormData,
} from './auth.validation.js';

// User Validation
export {
  CreateUserSchema,
  UpdateUserSchema,
  UpdateUserRoleSchema,
  RoleSchema,
  LoginSchema,
  ChangePasswordSchema,
  type CreateUser,
  type UpdateUser,
  type UpdateUserRole,
  type Login,
  type ChangePassword,
} from './user.validation.js';

// User Types
export { type Role } from '../types/user.types.js';
