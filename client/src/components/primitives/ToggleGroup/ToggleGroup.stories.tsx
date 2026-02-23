import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { LayoutGrid, List, Map } from 'lucide-react';
import { ToggleGroup } from './ToggleGroup';

const meta: Meta<typeof ToggleGroup> = {
  title: 'Primitives/ToggleGroup',
  component: ToggleGroup,
  argTypes: {
    size: {
      control: 'select',
      options: ['small', 'medium'],
    },
    disabled: {
      control: 'boolean',
    },
  },
};

export default meta;

type Story = StoryObj<typeof ToggleGroup>;

// ---------------------------------------------------------------------------
// Text-only options
// ---------------------------------------------------------------------------

const textOptions = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
];

export const TextOnly: Story = {
  args: {
    options: textOptions,
    value: 'week',
  },
  render: function Render(args) {
    const [value, setValue] = useState(args.value);
    return <ToggleGroup {...args} value={value} onChange={setValue} />;
  },
};

// ---------------------------------------------------------------------------
// Icon + text options
// ---------------------------------------------------------------------------

const iconTextOptions = [
  { value: 'grid', label: 'Grid', icon: <LayoutGrid size={16} /> },
  { value: 'list', label: 'List', icon: <List size={16} /> },
  { value: 'map', label: 'Map', icon: <Map size={16} /> },
];

export const IconAndText: Story = {
  args: {
    options: iconTextOptions,
    value: 'grid',
  },
  render: function Render(args) {
    const [value, setValue] = useState(args.value);
    return <ToggleGroup {...args} value={value} onChange={setValue} />;
  },
};

// ---------------------------------------------------------------------------
// Disabled state
// ---------------------------------------------------------------------------

export const Disabled: Story = {
  args: {
    options: textOptions,
    value: 'week',
    disabled: true,
  },
};

// ---------------------------------------------------------------------------
// Small size
// ---------------------------------------------------------------------------

export const Small: Story = {
  args: {
    options: textOptions,
    value: 'day',
    size: 'small',
  },
  render: function Render(args) {
    const [value, setValue] = useState(args.value);
    return <ToggleGroup {...args} value={value} onChange={setValue} />;
  },
};

// ---------------------------------------------------------------------------
// Both sizes side by side
// ---------------------------------------------------------------------------

export const BothSizes: Story = {
  render: function Render() {
    const [smallValue, setSmallValue] = useState('day');
    const [mediumValue, setMediumValue] = useState('day');
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <p style={{ margin: '0 0 8px', fontSize: 14, color: '#666' }}>
            Small
          </p>
          <ToggleGroup
            options={textOptions}
            value={smallValue}
            onChange={setSmallValue}
            size="small"
          />
        </div>
        <div>
          <p style={{ margin: '0 0 8px', fontSize: 14, color: '#666' }}>
            Medium
          </p>
          <ToggleGroup
            options={textOptions}
            value={mediumValue}
            onChange={setMediumValue}
            size="medium"
          />
        </div>
      </div>
    );
  },
};
