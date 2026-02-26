import type { Meta, StoryObj } from '@storybook/react-vite';
import { StatsCard } from './StatsCard';

const meta: Meta<typeof StatsCard> = {
  title: 'Composed/StatsCard',
  component: StatsCard,
};

export default meta;

type Story = StoryObj<typeof StatsCard>;

export const PositiveTrend: Story = {
  args: {
    title: 'Monthly Revenue',
    value: '$12,450',
    trend: 'up',
    trendValue: '+8.2%',
  },
};

export const NegativeTrend: Story = {
  args: {
    title: 'Vacancy Rate',
    value: '15%',
    trend: 'down',
    trendValue: '-3.1%',
  },
};

export const Neutral: Story = {
  args: {
    title: 'Total Properties',
    value: 24,
    trend: 'neutral',
    trendValue: '0%',
  },
};

export const NoTrend: Story = {
  args: {
    title: 'Active Leases',
    value: 18,
  },
};
