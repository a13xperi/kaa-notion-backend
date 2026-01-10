/**
 * Badge Stories
 */

import type { Meta, StoryObj } from '@storybook/react';
import { Badge, StatusBadge, TierBadge } from './Badge';

// Badge
const badgeMeta: Meta<typeof Badge> = {
  title: 'Components/Common/Badge',
  component: Badge,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'primary', 'secondary', 'success', 'warning', 'danger', 'info'],
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
  },
};

export default badgeMeta;
type BadgeStory = StoryObj<typeof Badge>;

export const Default: BadgeStory = {
  args: {
    children: 'Badge',
  },
};

export const Primary: BadgeStory = {
  args: {
    children: 'Primary',
    variant: 'primary',
  },
};

export const Success: BadgeStory = {
  args: {
    children: 'Success',
    variant: 'success',
  },
};

export const Warning: BadgeStory = {
  args: {
    children: 'Warning',
    variant: 'warning',
  },
};

export const Danger: BadgeStory = {
  args: {
    children: 'Danger',
    variant: 'danger',
  },
};

export const AllVariants: BadgeStory = {
  render: () => (
    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
      <Badge variant="default">Default</Badge>
      <Badge variant="primary">Primary</Badge>
      <Badge variant="secondary">Secondary</Badge>
      <Badge variant="success">Success</Badge>
      <Badge variant="warning">Warning</Badge>
      <Badge variant="danger">Danger</Badge>
      <Badge variant="info">Info</Badge>
    </div>
  ),
};

export const Sizes: BadgeStory = {
  render: () => (
    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
      <Badge size="sm">Small</Badge>
      <Badge size="md">Medium</Badge>
      <Badge size="lg">Large</Badge>
    </div>
  ),
};

// StatusBadge Stories
export const StatusBadges: BadgeStory = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <h4>Project Status</h4>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <StatusBadge status="ONBOARDING" />
        <StatusBadge status="IN_PROGRESS" />
        <StatusBadge status="AWAITING_FEEDBACK" />
        <StatusBadge status="REVISIONS" />
        <StatusBadge status="DELIVERED" />
        <StatusBadge status="CLOSED" />
      </div>
      
      <h4>Lead Status</h4>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <StatusBadge status="NEW" />
        <StatusBadge status="QUALIFIED" />
        <StatusBadge status="NEEDS_REVIEW" />
      </div>
      
      <h4>Milestone Status</h4>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <StatusBadge status="PENDING" />
        <StatusBadge status="COMPLETED" />
      </div>
    </div>
  ),
};

// TierBadge Stories
export const TierBadges: BadgeStory = {
  render: () => (
    <div style={{ display: 'flex', gap: '0.5rem' }}>
      <TierBadge tier={1} />
      <TierBadge tier={2} />
      <TierBadge tier={3} />
      <TierBadge tier={4} />
    </div>
  ),
};
