/**
 * EmptyState Component Tests
 */

import { render, screen } from '@testing-library/react';
import {
  EmptyState,
  EmptySearch,
  EmptyList,
  EmptyProjects,
  EmptyDeliverables,
  EmptyMessages,
  EmptyNotifications,
} from '../EmptyState';

describe('EmptyState', () => {
  it('should render title', () => {
    render(<EmptyState title="No Items" />);

    expect(screen.getByText('No Items')).toBeInTheDocument();
  });

  it('should render description when provided', () => {
    render(<EmptyState title="No Items" description="Add some items to get started." />);

    expect(screen.getByText('Add some items to get started.')).toBeInTheDocument();
  });

  it('should render default icon when not provided', () => {
    render(<EmptyState title="No Items" />);

    expect(screen.getByText('📭')).toBeInTheDocument();
  });

  it('should render custom icon when provided', () => {
    render(<EmptyState title="No Items" icon="🔍" />);

    expect(screen.getByText('🔍')).toBeInTheDocument();
  });

  it('should render action when provided', () => {
    render(
      <EmptyState
        title="No Items"
        action={<button>Add Item</button>}
      />
    );

    expect(screen.getByRole('button', { name: 'Add Item' })).toBeInTheDocument();
  });

  it('should apply size classes', () => {
    const { container, rerender } = render(<EmptyState title="Test" size="sm" />);
    expect(container.querySelector('.empty-state--sm')).toBeInTheDocument();

    rerender(<EmptyState title="Test" size="md" />);
    expect(container.querySelector('.empty-state--md')).toBeInTheDocument();

    rerender(<EmptyState title="Test" size="lg" />);
    expect(container.querySelector('.empty-state--lg')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(
      <EmptyState title="Test" className="custom-empty" />
    );

    expect(container.querySelector('.custom-empty')).toBeInTheDocument();
  });
});

describe('EmptySearch', () => {
  it('should render search icon', () => {
    render(<EmptySearch />);

    expect(screen.getByText('🔍')).toBeInTheDocument();
  });

  it('should render default title', () => {
    render(<EmptySearch />);

    expect(screen.getByText('No results found')).toBeInTheDocument();
  });

  it('should render query in description when provided', () => {
    render(<EmptySearch query="landscape" />);

    expect(screen.getByText(/No matches for "landscape"/)).toBeInTheDocument();
  });

  it('should render generic description when no query', () => {
    render(<EmptySearch />);

    expect(screen.getByText(/Try adjusting your search or filters/)).toBeInTheDocument();
  });
});

describe('EmptyList', () => {
  it('should render list icon', () => {
    render(<EmptyList />);

    expect(screen.getByText('📋')).toBeInTheDocument();
  });

  it('should render default item name', () => {
    render(<EmptyList />);

    expect(screen.getByText('No items yet')).toBeInTheDocument();
  });

  it('should render custom item name', () => {
    render(<EmptyList itemName="projects" />);

    expect(screen.getByText('No projects yet')).toBeInTheDocument();
  });

  it('should render action when provided', () => {
    render(<EmptyList action={<button>Create</button>} />);

    expect(screen.getByRole('button', { name: 'Create' })).toBeInTheDocument();
  });
});

describe('EmptyProjects', () => {
  it('should render projects icon', () => {
    render(<EmptyProjects />);

    expect(screen.getByText('🏗️')).toBeInTheDocument();
  });

  it('should render title', () => {
    render(<EmptyProjects />);

    expect(screen.getByText('No projects yet')).toBeInTheDocument();
  });

  it('should render description', () => {
    render(<EmptyProjects />);

    expect(screen.getByText(/Start your landscape journey/)).toBeInTheDocument();
  });

  it('should render action when provided', () => {
    render(<EmptyProjects action={<button>Start Project</button>} />);

    expect(screen.getByRole('button', { name: 'Start Project' })).toBeInTheDocument();
  });
});

describe('EmptyDeliverables', () => {
  it('should render deliverables icon', () => {
    render(<EmptyDeliverables />);

    expect(screen.getByText('📦')).toBeInTheDocument();
  });

  it('should render title', () => {
    render(<EmptyDeliverables />);

    expect(screen.getByText('No deliverables yet')).toBeInTheDocument();
  });

  it('should render description', () => {
    render(<EmptyDeliverables />);

    expect(screen.getByText(/deliverables will appear here/)).toBeInTheDocument();
  });
});

describe('EmptyMessages', () => {
  it('should render messages icon', () => {
    render(<EmptyMessages />);

    expect(screen.getByText('💬')).toBeInTheDocument();
  });

  it('should render title', () => {
    render(<EmptyMessages />);

    expect(screen.getByText('No messages yet')).toBeInTheDocument();
  });

  it('should render description', () => {
    render(<EmptyMessages />);

    expect(screen.getByText(/Start a conversation/)).toBeInTheDocument();
  });
});

describe('EmptyNotifications', () => {
  it('should render notifications icon', () => {
    render(<EmptyNotifications />);

    expect(screen.getByText('🔔')).toBeInTheDocument();
  });

  it('should render title', () => {
    render(<EmptyNotifications />);

    expect(screen.getByText('All caught up!')).toBeInTheDocument();
  });

  it('should render description', () => {
    render(<EmptyNotifications />);

    expect(screen.getByText(/no new notifications/)).toBeInTheDocument();
  });

  it('should use small size', () => {
    const { container } = render(<EmptyNotifications />);

    expect(container.querySelector('.empty-state--sm')).toBeInTheDocument();
  });
});
