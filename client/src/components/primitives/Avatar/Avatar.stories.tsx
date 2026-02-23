import type { Meta, StoryObj } from '@storybook/react-vite';
import { Avatar } from './Avatar';

const meta: Meta<typeof Avatar> = {
  title: 'Primitives/Avatar',
  component: Avatar,
};

export default meta;

type Story = StoryObj<typeof Avatar>;

export const InitialsOnly: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
      <Avatar name="John Doe" />
      <Avatar name="Alice Smith" />
      <Avatar name="Bob" />
    </div>
  ),
};

export const WithImage: Story = {
  render: () => (
    <Avatar
      name="Jane Doe"
      src="https://i.pravatar.cc/150?u=jane"
      size="large"
    />
  ),
};

export const Sizes: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
      <Avatar name="Small User" size="small" />
      <Avatar name="Medium User" size="medium" />
      <Avatar name="Large User" size="large" />
    </div>
  ),
};

export const FallbackOnError: Story = {
  render: () => (
    <Avatar
      name="Broken Image"
      src="https://invalid-url.example/avatar.png"
    />
  ),
};

export const ColorVariety: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {[
        'Anna Bell',
        'Carlos Diaz',
        'Emily Fang',
        'George Hill',
        'Irene Jain',
        'Kevin Lee',
        'Maria Nunez',
        'Oscar Park',
        'Quinn Reed',
        'Tanya Voss',
      ].map((name) => (
        <Avatar key={name} name={name} />
      ))}
    </div>
  ),
};
