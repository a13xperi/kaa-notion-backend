/**
 * ConfirmDialog Component Tests
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ConfirmDialog } from '../ConfirmDialog';

describe('ConfirmDialog', () => {
  const mockOnClose = jest.fn();
  const mockOnConfirm = jest.fn();

  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    onConfirm: mockOnConfirm,
    title: 'Confirm Action',
    message: 'Are you sure?',
  };

  beforeEach(() => {
    mockOnClose.mockClear();
    mockOnConfirm.mockClear();
  });

  it('should render title and message', () => {
    render(<ConfirmDialog {...defaultProps} />);

    expect(screen.getByText('Confirm Action')).toBeInTheDocument();
    expect(screen.getByText('Are you sure?')).toBeInTheDocument();
  });

  it('should render default button text', () => {
    render(<ConfirmDialog {...defaultProps} />);

    expect(screen.getByText('Cancel')).toBeInTheDocument();
    expect(screen.getByText('Confirm')).toBeInTheDocument();
  });

  it('should render custom button text', () => {
    render(
      <ConfirmDialog
        {...defaultProps}
        confirmText="Delete"
        cancelText="Go Back"
      />
    );

    expect(screen.getByText('Go Back')).toBeInTheDocument();
    expect(screen.getByText('Delete')).toBeInTheDocument();
  });

  it('should call onClose when cancel clicked', () => {
    render(<ConfirmDialog {...defaultProps} />);

    fireEvent.click(screen.getByText('Cancel'));

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should call onConfirm and onClose when confirm clicked', async () => {
    mockOnConfirm.mockResolvedValue(undefined);

    render(<ConfirmDialog {...defaultProps} />);

    fireEvent.click(screen.getByText('Confirm'));

    await waitFor(() => {
      expect(mockOnConfirm).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('should show loading state while confirming', async () => {
    mockOnConfirm.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 100))
    );

    render(<ConfirmDialog {...defaultProps} />);

    fireEvent.click(screen.getByText('Confirm'));

    expect(screen.getByText('Processing...')).toBeInTheDocument();

    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('should disable buttons when loading', async () => {
    mockOnConfirm.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 100))
    );

    render(<ConfirmDialog {...defaultProps} />);

    fireEvent.click(screen.getByText('Confirm'));

    const cancelButton = screen.getByText('Cancel').closest('button');
    expect(cancelButton).toBeDisabled();

    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('should render info variant icon', () => {
    render(<ConfirmDialog {...defaultProps} variant="info" />);

    expect(screen.getByText('ℹ️')).toBeInTheDocument();
  });

  it('should render danger variant icon', () => {
    render(<ConfirmDialog {...defaultProps} variant="danger" />);

    expect(screen.getByText('⚠️')).toBeInTheDocument();
  });

  it('should render warning variant icon', () => {
    render(<ConfirmDialog {...defaultProps} variant="warning" />);

    expect(screen.getByText('⚡')).toBeInTheDocument();
  });

  it('should handle async confirm error gracefully', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation();
    mockOnConfirm.mockRejectedValue(new Error('Failed'));

    render(<ConfirmDialog {...defaultProps} />);

    fireEvent.click(screen.getByText('Confirm'));

    await waitFor(() => {
      expect(consoleError).toHaveBeenCalled();
    });

    consoleError.mockRestore();
  });

  it('should not render when isOpen is false', () => {
    render(<ConfirmDialog {...defaultProps} isOpen={false} />);

    expect(screen.queryByText('Confirm Action')).not.toBeInTheDocument();
  });

  it('should apply correct variant class to confirm button', () => {
    const { container } = render(
      <ConfirmDialog {...defaultProps} variant="danger" />
    );

    expect(
      container.querySelector('.confirm-dialog__button--danger')
    ).toBeInTheDocument();
  });

  it('should support external loading state', () => {
    render(<ConfirmDialog {...defaultProps} isLoading={true} />);

    expect(screen.getByText('Processing...')).toBeInTheDocument();
  });
});
