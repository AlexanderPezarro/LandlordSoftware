import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { FileUpload } from './FileUpload';

const meta: Meta<typeof FileUpload> = {
  title: 'Primitives/FileUpload',
  component: FileUpload,
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    accept: { control: 'text' },
    multiple: { control: 'boolean' },
    maxSize: { control: 'number' },
    disabled: { control: 'boolean' },
  },
  args: {
    onFilesChange: fn(),
  },
};

export default meta;

type Story = StoryObj<typeof FileUpload>;

export const Empty: Story = {
  args: {},
};

export const AcceptImages: Story = {
  args: {
    accept: 'image/*',
    multiple: true,
  },
};

export const SingleFile: Story = {
  args: {
    multiple: false,
  },
};

export const WithMaxSize: Story = {
  args: {
    multiple: true,
    maxSize: 5 * 1024 * 1024, // 5MB
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
};
