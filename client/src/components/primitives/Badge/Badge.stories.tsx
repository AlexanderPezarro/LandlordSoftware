import type { Meta, StoryObj } from '@storybook/react-vite';
import { Badge } from './Badge';

const meta: Meta<typeof Badge> = {
  title: 'Primitives/Badge',
  component: Badge,
  argTypes: {
    count: {
      control: 'number',
    },
    max: {
      control: 'number',
    },
    color: {
      control: 'select',
      options: ['primary', 'error'],
    },
  },
};

export default meta;

type Story = StoryObj<typeof Badge>;

const MailIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
  </svg>
);

export const Zero: Story = {
  args: {
    count: 0,
    children: undefined,
  },
  render: (args) => (
    <Badge {...args}>
      <MailIcon />
    </Badge>
  ),
};

export const LowCount: Story = {
  args: {
    count: 5,
    children: undefined,
  },
  render: (args) => (
    <Badge {...args}>
      <MailIcon />
    </Badge>
  ),
};

export const HighCount: Story = {
  args: {
    count: 150,
    max: 99,
    children: undefined,
  },
  render: (args) => (
    <Badge {...args}>
      <MailIcon />
    </Badge>
  ),
};

export const PrimaryColor: Story = {
  args: {
    count: 5,
    color: 'primary',
    children: undefined,
  },
  render: (args) => (
    <Badge {...args}>
      <MailIcon />
    </Badge>
  ),
};
