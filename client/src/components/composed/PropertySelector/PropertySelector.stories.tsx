import type { Meta, StoryObj } from '@storybook/react-vite';
import { Select } from '../../primitives/Select';
import type { SelectOption } from '../../primitives/Select';

const sampleProperties: SelectOption[] = [
  { value: 'prop-1', label: '12 Oak Avenue - 12 Oak Avenue, SW1A 1AA' },
  { value: 'prop-2', label: 'Riverside Flat - 45 River Road, E1 6AN' },
  { value: 'prop-3', label: 'High Street Studio - 88 High Street, M1 1AE' },
];

const allPropertiesOption: SelectOption = { value: '', label: 'All Properties' };

/**
 * PropertySelector is a composed component that wraps the Select primitive
 * with property-specific options and an optional "All Properties" entry.
 *
 * These stories render the underlying Select primitive directly to avoid
 * requiring the PropertiesContext provider.
 */
const meta: Meta<typeof Select> = {
  title: 'Composed/PropertySelector',
  component: Select,
  argTypes: {
    disabled: { control: 'boolean' },
  },
};

export default meta;

type Story = StoryObj<typeof Select>;

export const WithProperties: Story = {
  args: {
    label: 'Property',
    name: 'property-selector',
    options: [allPropertiesOption, ...sampleProperties],
    value: 'prop-1',
    fullWidth: true,
    size: 'small',
  },
};

export const AllSelected: Story = {
  args: {
    label: 'Property',
    name: 'property-selector',
    options: [allPropertiesOption, ...sampleProperties],
    value: '',
    fullWidth: true,
    size: 'small',
  },
};

export const EmptyList: Story = {
  args: {
    label: 'Property',
    name: 'property-selector',
    options: [allPropertiesOption],
    value: '',
    fullWidth: true,
    size: 'small',
  },
};
