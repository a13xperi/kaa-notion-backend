/**
 * SearchInput Component
 * Search input with debounce and clear button.
 */

import { useState, useEffect, useRef, InputHTMLAttributes } from 'react';
import './SearchInput.css';

interface SearchInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'size'> {
  value?: string;
  onChange: (value: string) => void;
  debounceMs?: number;
  placeholder?: string;
  showIcon?: boolean;
  showClear?: boolean;
  isLoading?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function SearchInput({
  value: externalValue,
  onChange,
  debounceMs = 300,
  placeholder = 'Search...',
  showIcon = true,
  showClear = true,
  isLoading = false,
  size = 'md',
  className = '',
  ...props
}: SearchInputProps) {
  const [internalValue, setInternalValue] = useState(externalValue || '');
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync with external value
  useEffect(() => {
    if (externalValue !== undefined && externalValue !== internalValue) {
      setInternalValue(externalValue);
    }
  }, [externalValue, internalValue]);

  // Handle input change with debounce
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInternalValue(newValue);

    // Clear existing timeout
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Set new debounced callback
    debounceRef.current = setTimeout(() => {
      onChange(newValue);
    }, debounceMs);
  };

  // Handle clear
  const handleClear = () => {
    setInternalValue('');
    onChange('');
    inputRef.current?.focus();
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const showClearButton = showClear && internalValue.length > 0;

  return (
    <div className={`search-input search-input--${size} ${className}`}>
      {showIcon && (
        <span className="search-input__icon" aria-hidden="true">
          🔍
        </span>
      )}

      <input
        ref={inputRef}
        type="search"
        className="search-input__field"
        value={internalValue}
        onChange={handleChange}
        placeholder={placeholder}
        {...props}
      />

      {isLoading && (
        <span className="search-input__spinner" aria-label="Searching">
          <span className="search-input__spinner-icon" />
        </span>
      )}

      {showClearButton && !isLoading && (
        <button
          type="button"
          className="search-input__clear"
          onClick={handleClear}
          aria-label="Clear search"
        >
          ✕
        </button>
      )}
    </div>
  );
}

export default SearchInput;
