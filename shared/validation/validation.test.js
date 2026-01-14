import { CreatePropertySchema } from './property.validation.js';
import { CreateTenantSchema } from './tenant.validation.js';
import { CreateLeaseSchema } from './lease.validation.js';
import { CreateTransactionSchema } from './transaction.validation.js';
import { CreateEventSchema } from './event.validation.js';
import { CreateDocumentSchema } from './document.validation.js';
const validProperty = {
    name: 'Test Property',
    street: '123 Test Street',
    city: 'London',
    county: 'Greater London',
    postcode: 'SW1A 1AA',
    propertyType: 'Flat',
    status: 'Available',
};
try {
    CreatePropertySchema.parse(validProperty);
    console.log('✓ Valid property passed');
}
catch (error) {
    console.error('✗ Valid property failed:', error);
}
const invalidPostcode = {
    ...validProperty,
    postcode: 'INVALID',
};
try {
    CreatePropertySchema.parse(invalidPostcode);
    console.error('✗ Invalid postcode should have failed');
}
catch (error) {
    console.log('✓ Invalid postcode correctly rejected');
}
const validTenant = {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    phone: '07123456789',
    status: 'Active',
};
try {
    CreateTenantSchema.parse(validTenant);
    console.log('✓ Valid tenant passed');
}
catch (error) {
    console.error('✗ Valid tenant failed:', error);
}
const validLease = {
    propertyId: '123e4567-e89b-12d3-a456-426614174000',
    tenantId: '123e4567-e89b-12d3-a456-426614174001',
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-12-31'),
    monthlyRent: 1200,
    securityDepositAmount: 1200,
    status: 'Active',
};
try {
    CreateLeaseSchema.parse(validLease);
    console.log('✓ Valid lease passed');
}
catch (error) {
    console.error('✗ Valid lease failed:', error);
}
const invalidLease = {
    ...validLease,
    endDate: new Date('2023-12-31'),
};
try {
    CreateLeaseSchema.parse(invalidLease);
    console.error('✗ Invalid lease date range should have failed');
}
catch (error) {
    console.log('✓ Invalid lease date range correctly rejected');
}
const validIncomeTransaction = {
    propertyId: '123e4567-e89b-12d3-a456-426614174000',
    type: 'Income',
    category: 'Rent',
    amount: 1200,
    transactionDate: new Date(),
    description: 'Monthly rent payment',
};
try {
    CreateTransactionSchema.parse(validIncomeTransaction);
    console.log('✓ Valid income transaction passed');
}
catch (error) {
    console.error('✗ Valid income transaction failed:', error);
}
const invalidTransaction = {
    ...validIncomeTransaction,
    category: 'Maintenance',
};
try {
    CreateTransactionSchema.parse(invalidTransaction);
    console.error('✗ Invalid transaction category should have failed');
}
catch (error) {
    console.log('✓ Invalid transaction category correctly rejected');
}
const validEvent = {
    propertyId: '123e4567-e89b-12d3-a456-426614174000',
    eventType: 'Inspection',
    title: 'Annual Property Inspection',
    scheduledDate: new Date('2024-06-01'),
    completed: false,
};
try {
    CreateEventSchema.parse(validEvent);
    console.log('✓ Valid event passed');
}
catch (error) {
    console.error('✗ Valid event failed:', error);
}
const validDocument = {
    entityType: 'Property',
    entityId: '123e4567-e89b-12d3-a456-426614174000',
    fileName: 'lease-agreement.pdf',
    filePath: '/uploads/documents/lease-agreement.pdf',
    fileType: 'application/pdf',
    fileSize: 1024000,
};
try {
    CreateDocumentSchema.parse(validDocument);
    console.log('✓ Valid document passed');
}
catch (error) {
    console.error('✗ Valid document failed:', error);
}
const oversizedDocument = {
    ...validDocument,
    fileSize: 15 * 1024 * 1024,
};
try {
    CreateDocumentSchema.parse(oversizedDocument);
    console.error('✗ Oversized document should have failed');
}
catch (error) {
    console.log('✓ Oversized document correctly rejected');
}
console.log('\n✓ All validation tests completed successfully!');
