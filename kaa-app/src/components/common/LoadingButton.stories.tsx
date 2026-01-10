/**
 * LoadingButton Stories
 */

import type { Meta, StoryObj } from '@storybook/react';
import { LoadingButton } from './LoadingButton';

const meta: Meta<typeof LoadingButton> = {
  title: 'Components/Common/LoadingButton',
  component: LoadingButton,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'outline', 'danger', 'ghost'],
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
    loading: {
      control: 'boolean',
    },
    disabled: {
      control: 'boolean',
    },
    fullWidth: {
      control: 'boolean',
    },
  },
};

export default meta;
type Story = StoryObj<typeof LoadingButton>;

// Default
export const Default: Story = {
  args: {
    children: 'Click Me',
  },
};

// Loading State
export const Loading: Story = {
  args: {
    children: 'Submit',
    loading: true,
    loadingText: 'Submitting...',
  },
};

// Variants
export const Primary: Story = {
  args: {
    children: 'Primary Button',
    variant: 'primary',
  },
};

export const Secondary: Story = {
  args: {
    children: 'Secondary Button',
    variant: 'secondary',
  },
};

export const Outline: Story = {
  args: {
    children: 'Outline Button',
    variant: 'outline',
  },
};

export const Danger: Story = {
  args: {
    children: 'Delete',
    variant: 'danger',
  },
};

export const Ghost: Story = {
  args: {
    children: 'Ghost Button',
    variant: 'ghost',
  },
};

// Sizes
export const Small: Story = {
  args: {
    children: 'Small',
    size: 'sm',
  },
};

export const Medium: Story = {
  args: {
    children: 'Medium',
    size: 'md',
  },
};

export const Large: Story = {
  args: {
    children: 'Large',
    size: 'lg',
  },
};

// Full Width
export const FullWidth: Story = {
  args: {
    children: 'Full Width Button',
    fullWidth: true,
  },
};

// Disabled
export const Disabled: Story = {
  args: {
    children: 'Disabled',
    disabled: true,
  },
};

// With Icons
export const WithLeftIcon: Story = {
  args: {
    children: 'Save',
    leftIcon: '💾',
  },
};

export const WithRightIcon: Story = {
  args: {
    children: 'Next',
    rightIcon: '→',
  },
};

// All Variants Grid
export const AllVariants: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <LoadingButton variant="primary">Primary</LoadingButton>
        <LoadingButton variant="secondary">Secondary</LoadingButton>
        <LoadingButton variant="outline">Outline</LoadingButton>
        <LoadingButton variant="danger">Danger</LoadingButton>
        <LoadingButton variant="ghost">Ghost</LoadingButton>
      </div>
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <LoadingButton size="sm">Small</LoadingButton>
        <LoadingButton size="md">Medium</LoadingButton>
        <LoadingButton size="lg">Large</LoadingButton>
      </div>
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <LoadingButton loading loadingText="Loading...">Loading</LoadingButton>
        <LoadingButton disabled>Disabled</LoadingButton>
      </div>
    </div>
  ),
};
