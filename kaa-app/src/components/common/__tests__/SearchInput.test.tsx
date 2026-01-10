/**
 * SearchInput Component Tests
 */

import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { SearchInput } from '../SearchInput';

describe('SearchInput', () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should render input with placeholder', () => {
    render(<SearchInput onChange={mockOnChange} placeholder="Search items..." />);

    expect(screen.getByPlaceholderText('Search items...')).toBeInTheDocument();
  });

  it('should render search icon by default', () => {
    render(<SearchInput onChange={mockOnChange} />);

    expect(screen.getByText('🔍')).toBeInTheDocument();
  });

  it('should hide icon when showIcon is false', () => {
    render(<SearchInput onChange={mockOnChange} showIcon={false} />);

    expect(screen.queryByText('🔍')).not.toBeInTheDocument();
  });

  it('should debounce onChange calls', async () => {
    render(<SearchInput onChange={mockOnChange} debounceMs={300} />);

    const input = screen.getByRole('searchbox');
    fireEvent.change(input, { target: { value: 'test' } });

    expect(mockOnChange).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(mockOnChange).toHaveBeenCalledWith('test');
  });

  it('should only call onChange once for rapid typing', () => {
    render(<SearchInput onChange={mockOnChange} debounceMs={300} />);

    const input = screen.getByRole('searchbox');
    fireEvent.change(input, { target: { value: 't' } });
    fireEvent.change(input, { target: { value: 'te' } });
    fireEvent.change(input, { target: { value: 'tes' } });
    fireEvent.change(input, { target: { value: 'test' } });

    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(mockOnChange).toHaveBeenCalledTimes(1);
    expect(mockOnChange).toHaveBeenCalledWith('test');
  });

  it('should show clear button when input has value', () => {
    render(<SearchInput onChange={mockOnChange} value="test" />);

    expect(screen.getByLabelText('Clear search')).toBeInTheDocument();
  });

  it('should not show clear button when input is empty', () => {
    render(<SearchInput onChange={mockOnChange} value="" />);

    expect(screen.queryByLabelText('Clear search')).not.toBeInTheDocument();
  });

  it('should hide clear button when showClear is false', () => {
    render(<SearchInput onChange={mockOnChange} value="test" showClear={false} />);

    expect(screen.queryByLabelText('Clear search')).not.toBeInTheDocument();
  });

  it('should clear input when clear button clicked', () => {
    render(<SearchInput onChange={mockOnChange} value="test" />);

    fireEvent.click(screen.getByLabelText('Clear search'));

    expect(mockOnChange).toHaveBeenCalledWith('');
  });

  it('should show spinner when isLoading is true', () => {
    render(<SearchInput onChange={mockOnChange} isLoading />);

    expect(screen.getByLabelText('Searching')).toBeInTheDocument();
  });

  it('should not show clear button when loading', () => {
    render(<SearchInput onChange={mockOnChange} value="test" isLoading />);

    expect(screen.queryByLabelText('Clear search')).not.toBeInTheDocument();
  });

  it('should apply size class', () => {
    const { container } = render(
      <SearchInput onChange={mockOnChange} size="lg" />
    );

    expect(container.querySelector('.search-input--lg')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(
      <SearchInput onChange={mockOnChange} className="custom-search" />
    );

    expect(container.querySelector('.custom-search')).toBeInTheDocument();
  });

  it('should update internal value when external value changes', () => {
    const { rerender } = render(
      <SearchInput onChange={mockOnChange} value="initial" />
    );

    const input = screen.getByRole('searchbox') as HTMLInputElement;
    expect(input.value).toBe('initial');

    rerender(<SearchInput onChange={mockOnChange} value="updated" />);

    expect(input.value).toBe('updated');
  });

  it('should pass through additional props', () => {
    render(
      <SearchInput
        onChange={mockOnChange}
        disabled
        aria-describedby="helper-text"
      />
    );

    const input = screen.getByRole('searchbox');
    expect(input).toBeDisabled();
    expect(input).toHaveAttribute('aria-describedby', 'helper-text');
  });
});
