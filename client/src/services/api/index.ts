// Export all API services
export { authService } from './auth.service';
export { propertiesService } from './properties.service';
export { tenantsService } from './tenants.service';
export { leasesService } from './leases.service';
export { transactionsService } from './transactions.service';
export { eventsService } from './events.service';
export { documentsService } from './documents.service';
export { usersService } from './users.service';

// Export main API client
export { default as apiClient, api } from '../api';

// Export types
export * from '../../types/api.types';
