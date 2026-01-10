/**
 * NotFoundPage Component Tests
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { NotFoundPage } from '../NotFoundPage';

// Mock window.history.back
const mockHistoryBack = jest.fn();
Object.defineProperty(window, 'history', {
  value: { back: mockHistoryBack },
  writable: true,
});

describe('NotFoundPage', () => {
  beforeEach(() => {
    mockHistoryBack.mockClear();
  });

  it('should render 404 code', () => {
    render(<NotFoundPage />);
    
    expect(screen.getByText('404')).toBeInTheDocument();
  });

  it('should render default title', () => {
    render(<NotFoundPage />);
    
    expect(screen.getByText('Page Not Found')).toBeInTheDocument();
  });

  it('should render default message', () => {
    render(<NotFoundPage />);
    
    expect(screen.getByText("Sorry, we couldn't find the page you're looking for.")).toBeInTheDocument();
  });

  it('should render custom title', () => {
    render(<NotFoundPage title="Custom Title" />);
    
    expect(screen.getByText('Custom Title')).toBeInTheDocument();
  });

  it('should render custom message', () => {
    render(<NotFoundPage message="Custom error message" />);
    
    expect(screen.getByText('Custom error message')).toBeInTheDocument();
  });

  it('should render decorative icon', () => {
    render(<NotFoundPage />);
    
    expect(screen.getByText('🌿')).toBeInTheDocument();
  });
});

describe('NotFoundPage navigation', () => {
  beforeEach(() => {
    mockHistoryBack.mockClear();
  });

  it('should render Go Back button by default', () => {
    render(<NotFoundPage />);
    
    expect(screen.getByText('← Go Back')).toBeInTheDocument();
  });

  it('should render Return Home link by default', () => {
    render(<NotFoundPage />);
    
    expect(screen.getByText('Return Home')).toBeInTheDocument();
  });

  it('should call history.back when Go Back clicked', () => {
    render(<NotFoundPage />);
    
    fireEvent.click(screen.getByText('← Go Back'));
    
    expect(mockHistoryBack).toHaveBeenCalled();
  });

  it('should have correct home link', () => {
    render(<NotFoundPage />);
    
    const homeLink = screen.getByText('Return Home');
    expect(homeLink).toHaveAttribute('href', '/');
  });

  it('should hide Go Back button when showBackLink is false', () => {
    render(<NotFoundPage showBackLink={false} />);
    
    expect(screen.queryByText('← Go Back')).not.toBeInTheDocument();
  });

  it('should hide Return Home link when showHomeLink is false', () => {
    render(<NotFoundPage showHomeLink={false} />);
    
    expect(screen.queryByText('Return Home')).not.toBeInTheDocument();
  });

  it('should hide both buttons when both are false', () => {
    render(<NotFoundPage showBackLink={false} showHomeLink={false} />);
    
    expect(screen.queryByText('← Go Back')).not.toBeInTheDocument();
    expect(screen.queryByText('Return Home')).not.toBeInTheDocument();
  });
});

describe('NotFoundPage help section', () => {
  it('should render help section', () => {
    render(<NotFoundPage />);
    
    expect(screen.getByText('Looking for something specific?')).toBeInTheDocument();
  });

  it('should have pricing link', () => {
    render(<NotFoundPage />);
    
    expect(screen.getByText('View Pricing')).toHaveAttribute('href', '/pricing');
  });

  it('should have portal link', () => {
    render(<NotFoundPage />);
    
    expect(screen.getByText('Client Portal')).toHaveAttribute('href', '/portal');
  });

  it('should have contact link', () => {
    render(<NotFoundPage />);
    
    expect(screen.getByText('Contact Support')).toHaveAttribute('href', '/contact');
  });
});
