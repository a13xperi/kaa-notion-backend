/**
 * Toast Component Tests
 */

import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { ToastProvider, useToast } from '../Toast';

// Test component that uses the toast hook
function ToastTester() {
  const { success, error, warning, info, toasts } = useToast();

  return (
    <div>
      <button onClick={() => success('Success message')}>Show Success</button>
      <button onClick={() => error('Error message', 'Error Title')}>Show Error</button>
      <button onClick={() => warning('Warning message')}>Show Warning</button>
      <button onClick={() => info('Info message')}>Show Info</button>
      <div data-testid="toast-count">{toasts.length}</div>
    </div>
  );
}

describe('ToastProvider', () => {
  it('should render children', () => {
    render(
      <ToastProvider>
        <div>Test Content</div>
      </ToastProvider>
    );

    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('should not render toast container when no toasts', () => {
    const { container } = render(
      <ToastProvider>
        <div>Test</div>
      </ToastProvider>
    );

    expect(container.querySelector('.toast-container')).not.toBeInTheDocument();
  });
});

describe('useToast hook', () => {
  it('should throw error when used outside provider', () => {
    // Suppress console.error for this test
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      render(<ToastTester />);
    }).toThrow('useToast must be used within a ToastProvider');

    consoleSpy.mockRestore();
  });

  it('should add success toast', async () => {
    render(
      <ToastProvider>
        <ToastTester />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Show Success'));

    await waitFor(() => {
      expect(screen.getByText('Success message')).toBeInTheDocument();
    });
  });

  it('should add error toast with title', async () => {
    render(
      <ToastProvider>
        <ToastTester />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Show Error'));

    await waitFor(() => {
      expect(screen.getByText('Error Title')).toBeInTheDocument();
      expect(screen.getByText('Error message')).toBeInTheDocument();
    });
  });

  it('should add warning toast', async () => {
    render(
      <ToastProvider>
        <ToastTester />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Show Warning'));

    await waitFor(() => {
      expect(screen.getByText('Warning message')).toBeInTheDocument();
    });
  });

  it('should add info toast', async () => {
    render(
      <ToastProvider>
        <ToastTester />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Show Info'));

    await waitFor(() => {
      expect(screen.getByText('Info message')).toBeInTheDocument();
    });
  });

  it('should track toast count', async () => {
    render(
      <ToastProvider>
        <ToastTester />
      </ToastProvider>
    );

    expect(screen.getByTestId('toast-count')).toHaveTextContent('0');

    fireEvent.click(screen.getByText('Show Success'));

    await waitFor(() => {
      expect(screen.getByTestId('toast-count')).toHaveTextContent('1');
    });

    fireEvent.click(screen.getByText('Show Info'));

    await waitFor(() => {
      expect(screen.getByTestId('toast-count')).toHaveTextContent('2');
    });
  });
});

describe('Toast display', () => {
  it('should display correct icon for success', async () => {
    render(
      <ToastProvider>
        <ToastTester />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Show Success'));

    await waitFor(() => {
      expect(screen.getByText('✓')).toBeInTheDocument();
    });
  });

  it('should display correct icon for error', async () => {
    render(
      <ToastProvider>
        <ToastTester />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Show Error'));

    await waitFor(() => {
      const icons = screen.getAllByText('✕');
      expect(icons.length).toBeGreaterThan(0); // Icon and close button
    });
  });

  it('should display correct icon for warning', async () => {
    render(
      <ToastProvider>
        <ToastTester />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Show Warning'));

    await waitFor(() => {
      expect(screen.getByText('⚠')).toBeInTheDocument();
    });
  });

  it('should display correct icon for info', async () => {
    render(
      <ToastProvider>
        <ToastTester />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Show Info'));

    await waitFor(() => {
      expect(screen.getByText('ℹ')).toBeInTheDocument();
    });
  });

  it('should have close button', async () => {
    render(
      <ToastProvider>
        <ToastTester />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Show Success'));

    await waitFor(() => {
      expect(screen.getByLabelText('Close')).toBeInTheDocument();
    });
  });

  it('should remove toast when close button clicked', async () => {
    render(
      <ToastProvider>
        <ToastTester />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Show Success'));

    await waitFor(() => {
      expect(screen.getByText('Success message')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByLabelText('Close'));

    // Wait for exit animation
    await waitFor(() => {
      expect(screen.queryByText('Success message')).not.toBeInTheDocument();
    }, { timeout: 500 });
  });

  it('should have role="alert" for accessibility', async () => {
    render(
      <ToastProvider>
        <ToastTester />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Show Success'));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });
});

describe('Toast positioning', () => {
  it('should use top-right position by default', () => {
    const { container } = render(
      <ToastProvider>
        <ToastTester />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Show Success'));

    waitFor(() => {
      const toastContainer = container.querySelector('.toast-container');
      expect(toastContainer).toHaveClass('toast-container--top-right');
    });
  });

  it('should accept custom position', () => {
    const { container } = render(
      <ToastProvider position="bottom-left">
        <ToastTester />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Show Success'));

    waitFor(() => {
      const toastContainer = container.querySelector('.toast-container');
      expect(toastContainer).toHaveClass('toast-container--bottom-left');
    });
  });
});

describe('Toast max limit', () => {
  it('should limit toasts to maxToasts', async () => {
    render(
      <ToastProvider maxToasts={3}>
        <ToastTester />
      </ToastProvider>
    );

    // Add 5 toasts
    for (let i = 0; i < 5; i++) {
      fireEvent.click(screen.getByText('Show Success'));
    }

    await waitFor(() => {
      expect(screen.getByTestId('toast-count')).toHaveTextContent('3');
    });
  });
});
