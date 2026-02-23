import type { Meta, StoryObj } from '@storybook/react-vite';
import { Tooltip } from './Tooltip';

const meta: Meta<typeof Tooltip> = {
  title: 'Primitives/Tooltip',
  component: Tooltip,
  argTypes: {
    placement: {
      control: 'select',
      options: ['top', 'bottom', 'left', 'right'],
    },
    content: {
      control: 'text',
    },
  },
  decorators: [
    (Story) => (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: 200,
        }}
      >
        <Story />
      </div>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof Tooltip>;

export const Top: Story = {
  args: {
    content: 'Tooltip on top',
    placement: 'top',
    children: undefined,
  },
  render: (args) => (
    <Tooltip {...args}>
      <button type="button">Hover me (top)</button>
    </Tooltip>
  ),
};

export const Bottom: Story = {
  args: {
    content: 'Tooltip on bottom',
    placement: 'bottom',
    children: undefined,
  },
  render: (args) => (
    <Tooltip {...args}>
      <button type="button">Hover me (bottom)</button>
    </Tooltip>
  ),
};

export const Left: Story = {
  args: {
    content: 'Tooltip on left',
    placement: 'left',
    children: undefined,
  },
  render: (args) => (
    <Tooltip {...args}>
      <button type="button">Hover me (left)</button>
    </Tooltip>
  ),
};

export const Right: Story = {
  args: {
    content: 'Tooltip on right',
    placement: 'right',
    children: undefined,
  },
  render: (args) => (
    <Tooltip {...args}>
      <button type="button">Hover me (right)</button>
    </Tooltip>
  ),
};
