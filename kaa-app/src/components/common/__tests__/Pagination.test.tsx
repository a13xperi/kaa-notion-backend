/**
 * Pagination Component Tests
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { Pagination } from '../Pagination';

describe('Pagination', () => {
  const mockOnPageChange = jest.fn();

  beforeEach(() => {
    mockOnPageChange.mockClear();
  });

  it('should not render when totalPages is 1', () => {
    const { container } = render(
      <Pagination currentPage={1} totalPages={1} onPageChange={mockOnPageChange} />
    );

    expect(container.firstChild).toBeNull();
  });

  it('should render page buttons', () => {
    render(
      <Pagination currentPage={1} totalPages={5} onPageChange={mockOnPageChange} />
    );

    expect(screen.getByLabelText('Go to page 1')).toBeInTheDocument();
    expect(screen.getByLabelText('Go to page 5')).toBeInTheDocument();
  });

  it('should highlight current page', () => {
    render(
      <Pagination currentPage={3} totalPages={5} onPageChange={mockOnPageChange} />
    );

    const currentButton = screen.getByLabelText('Go to page 3');
    expect(currentButton).toHaveAttribute('aria-current', 'page');
  });

  it('should call onPageChange when page clicked', () => {
    render(
      <Pagination currentPage={1} totalPages={5} onPageChange={mockOnPageChange} />
    );

    fireEvent.click(screen.getByLabelText('Go to page 2'));

    expect(mockOnPageChange).toHaveBeenCalledWith(2);
  });

  it('should call onPageChange when next clicked', () => {
    render(
      <Pagination currentPage={2} totalPages={5} onPageChange={mockOnPageChange} />
    );

    fireEvent.click(screen.getByLabelText('Go to next page'));

    expect(mockOnPageChange).toHaveBeenCalledWith(3);
  });

  it('should call onPageChange when previous clicked', () => {
    render(
      <Pagination currentPage={3} totalPages={5} onPageChange={mockOnPageChange} />
    );

    fireEvent.click(screen.getByLabelText('Go to previous page'));

    expect(mockOnPageChange).toHaveBeenCalledWith(2);
  });

  it('should disable previous on first page', () => {
    render(
      <Pagination currentPage={1} totalPages={5} onPageChange={mockOnPageChange} />
    );

    expect(screen.getByLabelText('Go to previous page')).toBeDisabled();
  });

  it('should disable next on last page', () => {
    render(
      <Pagination currentPage={5} totalPages={5} onPageChange={mockOnPageChange} />
    );

    expect(screen.getByLabelText('Go to next page')).toBeDisabled();
  });

  it('should show first/last buttons by default', () => {
    render(
      <Pagination currentPage={3} totalPages={10} onPageChange={mockOnPageChange} />
    );

    expect(screen.getByLabelText('Go to first page')).toBeInTheDocument();
    expect(screen.getByLabelText('Go to last page')).toBeInTheDocument();
  });

  it('should hide first/last buttons when showFirstLast is false', () => {
    render(
      <Pagination
        currentPage={3}
        totalPages={10}
        onPageChange={mockOnPageChange}
        showFirstLast={false}
      />
    );

    expect(screen.queryByLabelText('Go to first page')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Go to last page')).not.toBeInTheDocument();
  });

  it('should go to first page when first button clicked', () => {
    render(
      <Pagination currentPage={5} totalPages={10} onPageChange={mockOnPageChange} />
    );

    fireEvent.click(screen.getByLabelText('Go to first page'));

    expect(mockOnPageChange).toHaveBeenCalledWith(1);
  });

  it('should go to last page when last button clicked', () => {
    render(
      <Pagination currentPage={5} totalPages={10} onPageChange={mockOnPageChange} />
    );

    fireEvent.click(screen.getByLabelText('Go to last page'));

    expect(mockOnPageChange).toHaveBeenCalledWith(10);
  });

  it('should show ellipsis for many pages', () => {
    render(
      <Pagination currentPage={5} totalPages={10} onPageChange={mockOnPageChange} />
    );

    expect(screen.getAllByText('…').length).toBeGreaterThanOrEqual(1);
  });

  it('should disable all buttons when disabled is true', () => {
    render(
      <Pagination
        currentPage={3}
        totalPages={5}
        onPageChange={mockOnPageChange}
        disabled={true}
      />
    );

    const buttons = screen.getAllByRole('button');
    buttons.forEach((button) => {
      expect(button).toBeDisabled();
    });
  });

  it('should have pagination role', () => {
    render(
      <Pagination currentPage={1} totalPages={5} onPageChange={mockOnPageChange} />
    );

    expect(screen.getByRole('navigation')).toHaveAttribute('aria-label', 'Pagination');
  });

  it('should apply custom className', () => {
    const { container } = render(
      <Pagination
        currentPage={1}
        totalPages={5}
        onPageChange={mockOnPageChange}
        className="custom-pagination"
      />
    );

    expect(container.querySelector('.custom-pagination')).toBeInTheDocument();
  });
});
