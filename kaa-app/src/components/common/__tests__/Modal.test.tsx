/**
 * Modal Component Tests
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { Modal } from '../Modal';

describe('Modal', () => {
  const mockOnClose = jest.fn();

  beforeEach(() => {
    mockOnClose.mockClear();
  });

  it('should not render when isOpen is false', () => {
    render(
      <Modal isOpen={false} onClose={mockOnClose}>
        <div>Content</div>
      </Modal>
    );

    expect(screen.queryByText('Content')).not.toBeInTheDocument();
  });

  it('should render when isOpen is true', () => {
    render(
      <Modal isOpen={true} onClose={mockOnClose}>
        <div>Content</div>
      </Modal>
    );

    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('should render title when provided', () => {
    render(
      <Modal isOpen={true} onClose={mockOnClose} title="Test Title">
        <div>Content</div>
      </Modal>
    );

    expect(screen.getByText('Test Title')).toBeInTheDocument();
  });

  it('should render close button by default', () => {
    render(
      <Modal isOpen={true} onClose={mockOnClose} title="Test">
        <div>Content</div>
      </Modal>
    );

    expect(screen.getByLabelText('Close modal')).toBeInTheDocument();
  });

  it('should not render close button when showCloseButton is false', () => {
    render(
      <Modal isOpen={true} onClose={mockOnClose} showCloseButton={false}>
        <div>Content</div>
      </Modal>
    );

    expect(screen.queryByLabelText('Close modal')).not.toBeInTheDocument();
  });

  it('should call onClose when close button clicked', () => {
    render(
      <Modal isOpen={true} onClose={mockOnClose} title="Test">
        <div>Content</div>
      </Modal>
    );

    fireEvent.click(screen.getByLabelText('Close modal'));

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should call onClose when overlay clicked', () => {
    const { container } = render(
      <Modal isOpen={true} onClose={mockOnClose}>
        <div>Content</div>
      </Modal>
    );

    const overlay = container.querySelector('.modal-overlay');
    fireEvent.click(overlay!);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should not call onClose when closeOnOverlay is false', () => {
    const { container } = render(
      <Modal isOpen={true} onClose={mockOnClose} closeOnOverlay={false}>
        <div>Content</div>
      </Modal>
    );

    const overlay = container.querySelector('.modal-overlay');
    fireEvent.click(overlay!);

    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('should call onClose when Escape pressed', () => {
    render(
      <Modal isOpen={true} onClose={mockOnClose}>
        <div>Content</div>
      </Modal>
    );

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should not call onClose when closeOnEscape is false', () => {
    render(
      <Modal isOpen={true} onClose={mockOnClose} closeOnEscape={false}>
        <div>Content</div>
      </Modal>
    );

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('should render footer when provided', () => {
    render(
      <Modal
        isOpen={true}
        onClose={mockOnClose}
        footer={<button>Save</button>}
      >
        <div>Content</div>
      </Modal>
    );

    expect(screen.getByText('Save')).toBeInTheDocument();
  });

  it('should have correct size class', () => {
    const { container } = render(
      <Modal isOpen={true} onClose={mockOnClose} size="lg">
        <div>Content</div>
      </Modal>
    );

    expect(container.querySelector('.modal--lg')).toBeInTheDocument();
  });

  it('should have role="dialog" for accessibility', () => {
    render(
      <Modal isOpen={true} onClose={mockOnClose}>
        <div>Content</div>
      </Modal>
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('should have aria-modal="true"', () => {
    render(
      <Modal isOpen={true} onClose={mockOnClose}>
        <div>Content</div>
      </Modal>
    );

    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
  });
});
