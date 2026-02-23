import type { Meta, StoryObj } from '@storybook/react';
import { Container } from './Container';

const meta: Meta<typeof Container> = {
  title: 'Primitives/Container',
  component: Container,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof Container>;

const PlaceholderContent = ({ label }: { label: string }) => (
  <div
    style={{
      backgroundColor: '#e3f2fd',
      border: '2px dashed #1976d2',
      borderRadius: '8px',
      padding: '24px',
      textAlign: 'center',
      fontFamily: 'sans-serif',
    }}
  >
    <strong>{label}</strong>
    <p style={{ margin: '8px 0 0' }}>
      This colored box shows the container width. Resize the viewport to see
      responsive behavior.
    </p>
  </div>
);

export const Default: Story = {
  render: () => (
    <Container>
      <PlaceholderContent label="Default (lg: 1200px)" />
    </Container>
  ),
};

export const Small: Story = {
  render: () => (
    <Container maxWidth="sm">
      <PlaceholderContent label="Small (sm: 600px)" />
    </Container>
  ),
};

export const Medium: Story = {
  render: () => (
    <Container maxWidth="md">
      <PlaceholderContent label="Medium (md: 900px)" />
    </Container>
  ),
};

export const Large: Story = {
  render: () => (
    <Container maxWidth="lg">
      <PlaceholderContent label="Large (lg: 1200px)" />
    </Container>
  ),
};

export const ExtraLarge: Story = {
  render: () => (
    <Container maxWidth="xl">
      <PlaceholderContent label="Extra Large (xl: 1536px)" />
    </Container>
  ),
};

export const AllSizes: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <Container maxWidth="sm">
        <PlaceholderContent label="sm: 600px" />
      </Container>
      <Container maxWidth="md">
        <PlaceholderContent label="md: 900px" />
      </Container>
      <Container maxWidth="lg">
        <PlaceholderContent label="lg: 1200px" />
      </Container>
      <Container maxWidth="xl">
        <PlaceholderContent label="xl: 1536px" />
      </Container>
    </div>
  ),
};
