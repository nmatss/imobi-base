import type { Meta, StoryObj } from '@storybook/react';
import { LoadingState, TextSkeleton, CardSkeleton, ListItemSkeleton, TableRowSkeleton } from './LoadingState';

const meta: Meta<typeof LoadingState> = {
  title: 'UI/LoadingState',
  component: LoadingState,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['card', 'text', 'circle', 'table', 'list'],
    },
    spacing: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof LoadingState>;

export const SingleCard: Story = {
  args: {
    variant: 'card',
  },
};

export const SingleText: Story = {
  args: {
    variant: 'text',
  },
};

export const SingleCircle: Story = {
  args: {
    variant: 'circle',
    className: 'w-12 h-12',
  },
};

export const MultipleTexts: Story = {
  args: {
    variant: 'text',
    count: 5,
    spacing: 'md',
  },
};

export const MultipleCards: Story = {
  args: {
    variant: 'card',
    count: 3,
    spacing: 'lg',
  },
};

export const TableRows: Story = {
  args: {
    variant: 'table',
    count: 5,
    spacing: 'sm',
  },
};

export const TextSkeletonExample: Story = {
  render: () => (
    <div className="max-w-md">
      <TextSkeleton lines={5} />
    </div>
  ),
};

export const CardSkeletonExample: Story = {
  render: () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <CardSkeleton />
      <CardSkeleton />
      <CardSkeleton />
    </div>
  ),
};

export const ListItemSkeletonExample: Story = {
  render: () => (
    <div className="max-w-2xl space-y-1 border rounded-lg overflow-hidden">
      <ListItemSkeleton />
      <ListItemSkeleton />
      <ListItemSkeleton />
      <ListItemSkeleton />
    </div>
  ),
};

export const TableRowSkeletonExample: Story = {
  render: () => (
    <div className="max-w-4xl space-y-2">
      <TableRowSkeleton columns={4} />
      <TableRowSkeleton columns={4} />
      <TableRowSkeleton columns={4} />
      <TableRowSkeleton columns={4} />
    </div>
  ),
};

export const PropertyListLoading: Story = {
  render: () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <CardSkeleton />
      <CardSkeleton />
      <CardSkeleton />
      <CardSkeleton />
      <CardSkeleton />
      <CardSkeleton />
    </div>
  ),
};

export const DashboardLoading: Story = {
  render: () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <LoadingState variant="card" />
        <LoadingState variant="card" />
        <LoadingState variant="card" />
        <LoadingState variant="card" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border rounded-lg p-6">
          <div className="h-6 w-32 bg-muted rounded mb-4 animate-pulse" />
          <LoadingState variant="table" count={5} spacing="sm" />
        </div>
        <div className="border rounded-lg p-6">
          <div className="h-6 w-32 bg-muted rounded mb-4 animate-pulse" />
          <TextSkeleton lines={8} />
        </div>
      </div>
    </div>
  ),
};
