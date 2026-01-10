/**
 * LoadingButton Component Tests
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { LoadingButton } from '../LoadingButton';

describe('LoadingButton', () => {
  it('renders children correctly', () => {
    render(<LoadingButton>Submit</LoadingButton>);
    expect(screen.getByText('Submit')).toBeInTheDocument();
  });

  it('shows loading state with spinner', () => {
    render(<LoadingButton loading>Submit</LoadingButton>);
    expect(screen.getByRole('button')).toHaveClass('loading-button--loading');
  });

  it('shows loading text when provided', () => {
    render(
      <LoadingButton loading loadingText="Submitting...">
        Submit
      </LoadingButton>
    );
    expect(screen.getByText('Submitting...')).toBeInTheDocument();
  });

  it('is disabled when loading', () => {
    render(<LoadingButton loading>Submit</LoadingButton>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('is disabled when disabled prop is true', () => {
    render(<LoadingButton disabled>Submit</LoadingButton>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('handles click events when not loading', () => {
    const handleClick = jest.fn();
    render(<LoadingButton onClick={handleClick}>Submit</LoadingButton>);
    
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('renders with correct variant class', () => {
    const { rerender } = render(
      <LoadingButton variant="primary">Submit</LoadingButton>
    );
    expect(screen.getByRole('button')).toHaveClass('loading-button--primary');

    rerender(<LoadingButton variant="danger">Submit</LoadingButton>);
    expect(screen.getByRole('button')).toHaveClass('loading-button--danger');

    rerender(<LoadingButton variant="outline">Submit</LoadingButton>);
    expect(screen.getByRole('button')).toHaveClass('loading-button--outline');
  });

  it('renders with correct size class', () => {
    const { rerender } = render(
      <LoadingButton size="sm">Submit</LoadingButton>
    );
    expect(screen.getByRole('button')).toHaveClass('loading-button--sm');

    rerender(<LoadingButton size="lg">Submit</LoadingButton>);
    expect(screen.getByRole('button')).toHaveClass('loading-button--lg');
  });

  it('renders full width when fullWidth prop is true', () => {
    render(<LoadingButton fullWidth>Submit</LoadingButton>);
    expect(screen.getByRole('button')).toHaveClass('loading-button--full-width');
  });

  it('renders left icon when provided', () => {
    render(
      <LoadingButton leftIcon={<span data-testid="left-icon">←</span>}>
        Submit
      </LoadingButton>
    );
    expect(screen.getByTestId('left-icon')).toBeInTheDocument();
  });

  it('renders right icon when provided', () => {
    render(
      <LoadingButton rightIcon={<span data-testid="right-icon">→</span>}>
        Submit
      </LoadingButton>
    );
    expect(screen.getByTestId('right-icon')).toBeInTheDocument();
  });

  it('hides icons when loading', () => {
    render(
      <LoadingButton
        loading
        leftIcon={<span data-testid="left-icon">←</span>}
        rightIcon={<span data-testid="right-icon">→</span>}
      >
        Submit
      </LoadingButton>
    );
    expect(screen.queryByTestId('left-icon')).not.toBeInTheDocument();
    expect(screen.queryByTestId('right-icon')).not.toBeInTheDocument();
  });

  it('passes through additional HTML button props', () => {
    render(
      <LoadingButton type="submit" name="submit-btn">
        Submit
      </LoadingButton>
    );
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('type', 'submit');
    expect(button).toHaveAttribute('name', 'submit-btn');
  });
});
