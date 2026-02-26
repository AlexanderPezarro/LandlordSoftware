import type { Meta, StoryObj } from '@storybook/react-vite';
import { Card } from './Card';

const meta: Meta<typeof Card> = {
  title: 'Primitives/Card',
  component: Card,
};

export default meta;

type Story = StoryObj<typeof Card>;

export const Minimal: Story = {
  render: () => (
    <Card>
      <Card.Content>
        <p>This card has content only — no header or actions.</p>
      </Card.Content>
    </Card>
  ),
};

export const Full: Story = {
  render: () => (
    <Card>
      <Card.Header>
        <strong>Property Details</strong>
      </Card.Header>
      <Card.Content>
        <p>123 Main Street — 3 bed / 2 bath single-family home.</p>
      </Card.Content>
      <Card.Actions>
        <button type="button">Cancel</button>
        <button type="button">Save</button>
      </Card.Actions>
    </Card>
  ),
};

export const Clickable: Story = {
  render: () => (
    <Card onClick={() => alert('Card clicked!')}>
      <Card.Header>
        <strong>Clickable Card</strong>
      </Card.Header>
      <Card.Content>
        <p>Hover to see the elevated shadow, then click.</p>
      </Card.Content>
    </Card>
  ),
};
