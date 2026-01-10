/**
 * LoadingButton Component Tests
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { LoadingButton } from '../LoadingButton';

describe('LoadingButton', () => {
  it('should render button text', () => {
    render(<LoadingButton>Click Me</LoadingButton>);

    expect(screen.getByText('Click Me')).toBeInTheDocument();
  });

  it('should render as button element', () => {
    render(<LoadingButton>Click Me</LoadingButton>);

    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('should handle click events', () => {
    const handleClick = jest.fn();

    render(<LoadingButton onClick={handleClick}>Click Me</LoadingButton>);

    fireEvent.click(screen.getByRole('button'));

    expect(handleClick).toHaveBeenCalled();
  });

  it('should be disabled when isLoading is true', () => {
    render(<LoadingButton isLoading>Click Me</LoadingButton>);

    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('should be disabled when disabled prop is true', () => {
    render(<LoadingButton disabled>Click Me</LoadingButton>);

    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('should show spinner when loading', () => {
    const { container } = render(
      <LoadingButton isLoading>Click Me</LoadingButton>
    );

    expect(container.querySelector('.loading-button__spinner')).toBeInTheDocument();
  });

  it('should show loading text when provided', () => {
    render(
      <LoadingButton isLoading loadingText="Saving...">
        Click Me
      </LoadingButton>
    );

    expect(screen.getByText('Saving...')).toBeInTheDocument();
    expect(screen.queryByText('Click Me')).not.toBeInTheDocument();
  });

  it('should show button text as loading text if not provided', () => {
    render(<LoadingButton isLoading>Submit</LoadingButton>);

    expect(screen.getByText('Submit')).toBeInTheDocument();
  });

  it('should apply primary variant by default', () => {
    const { container } = render(<LoadingButton>Click</LoadingButton>);

    expect(container.querySelector('.loading-button--primary')).toBeInTheDocument();
  });

  it('should apply secondary variant', () => {
    const { container } = render(
      <LoadingButton variant="secondary">Click</LoadingButton>
    );

    expect(container.querySelector('.loading-button--secondary')).toBeInTheDocument();
  });

  it('should apply danger variant', () => {
    const { container } = render(
      <LoadingButton variant="danger">Click</LoadingButton>
    );

    expect(container.querySelector('.loading-button--danger')).toBeInTheDocument();
  });

  it('should apply ghost variant', () => {
    const { container } = render(
      <LoadingButton variant="ghost">Click</LoadingButton>
    );

    expect(container.querySelector('.loading-button--ghost')).toBeInTheDocument();
  });

  it('should apply sm size', () => {
    const { container } = render(
      <LoadingButton size="sm">Click</LoadingButton>
    );

    expect(container.querySelector('.loading-button--sm')).toBeInTheDocument();
  });

  it('should apply md size by default', () => {
    const { container } = render(<LoadingButton>Click</LoadingButton>);

    expect(container.querySelector('.loading-button--md')).toBeInTheDocument();
  });

  it('should apply lg size', () => {
    const { container } = render(
      <LoadingButton size="lg">Click</LoadingButton>
    );

    expect(container.querySelector('.loading-button--lg')).toBeInTheDocument();
  });

  it('should apply full width class', () => {
    const { container } = render(
      <LoadingButton fullWidth>Click</LoadingButton>
    );

    expect(container.querySelector('.loading-button--full')).toBeInTheDocument();
  });

  it('should render left icon', () => {
    render(<LoadingButton leftIcon={<span data-testid="icon">←</span>}>Click</LoadingButton>);

    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });

  it('should render right icon', () => {
    render(<LoadingButton rightIcon={<span data-testid="icon">→</span>}>Click</LoadingButton>);

    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });

  it('should not render icons when loading', () => {
    render(
      <LoadingButton
        isLoading
        leftIcon={<span data-testid="left-icon">←</span>}
        rightIcon={<span data-testid="right-icon">→</span>}
      >
        Click
      </LoadingButton>
    );

    expect(screen.queryByTestId('left-icon')).not.toBeInTheDocument();
    expect(screen.queryByTestId('right-icon')).not.toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(
      <LoadingButton className="custom-class">Click</LoadingButton>
    );

    expect(container.querySelector('.custom-class')).toBeInTheDocument();
  });

  it('should pass through button attributes', () => {
    render(<LoadingButton type="submit">Click</LoadingButton>);

    expect(screen.getByRole('button')).toHaveAttribute('type', 'submit');
  });

  it('should have loading class when loading', () => {
    const { container } = render(
      <LoadingButton isLoading>Click</LoadingButton>
    );

    expect(container.querySelector('.loading-button--loading')).toBeInTheDocument();
  });

  it('should not have loading class when not loading', () => {
    const { container } = render(<LoadingButton>Click</LoadingButton>);

    expect(container.querySelector('.loading-button--loading')).not.toBeInTheDocument();
  });
});
