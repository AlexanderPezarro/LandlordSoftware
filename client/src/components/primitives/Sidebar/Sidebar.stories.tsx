import type { Meta, StoryObj } from '@storybook/react-vite';
import { MemoryRouter } from 'react-router-dom';
import { Home, Users, Calendar, Settings, FileText } from 'lucide-react';
import { Sidebar } from './Sidebar';
import type { SidebarItem } from './Sidebar';

const mockItems: SidebarItem[] = [
  { label: 'Dashboard', icon: <Home size={20} />, path: '/dashboard' },
  { label: 'Tenants', icon: <Users size={20} />, path: '/tenants' },
  { label: 'Events', icon: <Calendar size={20} />, path: '/events' },
  { label: 'Documents', icon: <FileText size={20} />, path: '/documents' },
  {
    label: 'Settings',
    icon: <Settings size={20} />,
    path: '/settings',
  },
];

const mockItemsWithBadge: SidebarItem[] = [
  ...mockItems.slice(0, 2),
  { label: 'Events', icon: <Calendar size={20} />, path: '/events', badge: 5 },
  ...mockItems.slice(3),
];

const meta: Meta<typeof Sidebar> = {
  title: 'Primitives/Sidebar',
  component: Sidebar,
  decorators: [
    (Story, context) => (
      <MemoryRouter initialEntries={[context.parameters.initialEntry ?? '/dashboard']}>
        <div style={{ display: 'flex', minHeight: 400 }}>
          <Story />
          <div style={{ flex: 1, padding: 24 }}>
            <p>Page content area</p>
          </div>
        </div>
      </MemoryRouter>
    ),
  ],
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;

type Story = StoryObj<typeof Sidebar>;

export const Desktop: Story = {
  render: () => (
    <Sidebar
      items={mockItems}
      open={false}
      onClose={() => {}}
      header={
        <span style={{ fontSize: '1.25rem', fontWeight: 500 }}>
          Landlord System
        </span>
      }
    />
  ),
  parameters: {
    viewport: { defaultViewport: 'responsive' },
  },
};

export const WithBadge: Story = {
  render: () => (
    <Sidebar
      items={mockItemsWithBadge}
      open={false}
      onClose={() => {}}
      header={
        <span style={{ fontSize: '1.25rem', fontWeight: 500 }}>
          Landlord System
        </span>
      }
    />
  ),
};

export const MobileOpen: Story = {
  render: () => (
    <Sidebar
      items={mockItems}
      open={true}
      onClose={() => {}}
      header={
        <span style={{ fontSize: '1.25rem', fontWeight: 500 }}>
          Landlord System
        </span>
      }
    />
  ),
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
  },
};

export const MobileClosed: Story = {
  render: () => (
    <Sidebar
      items={mockItems}
      open={false}
      onClose={() => {}}
      header={
        <span style={{ fontSize: '1.25rem', fontWeight: 500 }}>
          Landlord System
        </span>
      }
    />
  ),
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
  },
};

export const NoHeader: Story = {
  render: () => (
    <Sidebar items={mockItems} open={false} onClose={() => {}} />
  ),
};

export const ActiveTenants: Story = {
  parameters: {
    initialEntry: '/tenants',
  },
  render: () => (
    <Sidebar
      items={mockItems}
      open={false}
      onClose={() => {}}
      header={
        <span style={{ fontSize: '1.25rem', fontWeight: 500 }}>
          Landlord System
        </span>
      }
    />
  ),
};
