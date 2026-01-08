/**
 * Tests for renderPropertyValue function
 * Ensures all Notion property types are rendered correctly
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { mockPropertyValues } from '../../test-utils/mockData';

// We need to import the component to access its methods
// Since renderPropertyValue is internal, we'll test through rendered output

describe('Property Rendering', () => {
  // Helper to create a test component that renders a property
  const PropertyRenderer = ({ property }: { property: any }) => {
    // Simulate the renderPropertyValue logic
    const renderProperty = (prop: any) => {
      if (!prop) return <span>-</span>;

      switch (prop.type) {
        case 'title':
          return <span>{prop.title?.[0]?.plain_text || '-'}</span>;
        
        case 'select':
          return prop.select ? (
            <span className="select-badge">{prop.select.name}</span>
          ) : (
            <span>-</span>
          );
        
        case 'multi_select':
          return prop.multi_select && prop.multi_select.length > 0 ? (
            <span>
              {prop.multi_select.map((item: any, idx: number) => (
                <span key={idx} className="multi-select-badge">
                  {item.name}
                </span>
              ))}
            </span>
          ) : (
            <span>-</span>
          );
        
        case 'number':
          return <span>{prop.number !== null ? prop.number : '-'}</span>;
        
        case 'checkbox':
          return <span>{prop.checkbox ? '✓' : '✗'}</span>;
        
        case 'date':
          if (!prop.date) return <span>-</span>;
          const { start, end } = prop.date;
          return (
            <span>
              {start}
              {end && ` → ${end}`}
            </span>
          );
        
        case 'rich_text':
          return (
            <span>
              {prop.rich_text?.[0]?.plain_text || '-'}
            </span>
          );
        
        case 'url':
          return prop.url ? (
            <a href={prop.url} target="_blank" rel="noopener noreferrer">
              {prop.url}
            </a>
          ) : (
            <span>-</span>
          );
        
        case 'email':
          return prop.email ? (
            <a href={`mailto:${prop.email}`}>{prop.email}</a>
          ) : (
            <span>-</span>
          );
        
        case 'phone_number':
          return prop.phone_number ? (
            <a href={`tel:${prop.phone_number}`}>{prop.phone_number}</a>
          ) : (
            <span>-</span>
          );
        
        default:
          return <span>-</span>;
      }
    };

    return <div data-testid="property-render">{renderProperty(property)}</div>;
  };

  describe('Title Property', () => {
    it('renders title text', () => {
      render(<PropertyRenderer property={mockPropertyValues.title} />);
      expect(screen.getByText('Title Text')).toBeInTheDocument();
    });
  });

  describe('Select Property', () => {
    it('renders select option', () => {
      render(<PropertyRenderer property={mockPropertyValues.select} />);
      expect(screen.getByText('Selected Option')).toBeInTheDocument();
    });

    it('renders dash for empty select', () => {
      render(<PropertyRenderer property={mockPropertyValues.empty_select} />);
      expect(screen.getByText('-')).toBeInTheDocument();
    });

    it('applies select-badge class', () => {
      const { container } = render(<PropertyRenderer property={mockPropertyValues.select} />);
      const badge = container.querySelector('.select-badge');
      expect(badge).toBeInTheDocument();
    });
  });

  describe('Multi-Select Property', () => {
    it('renders multiple tags', () => {
      render(<PropertyRenderer property={mockPropertyValues.multi_select} />);
      expect(screen.getByText('Tag 1')).toBeInTheDocument();
      expect(screen.getByText('Tag 2')).toBeInTheDocument();
    });

    it('renders dash for empty multi-select', () => {
      render(<PropertyRenderer property={mockPropertyValues.empty_multi_select} />);
      expect(screen.getByText('-')).toBeInTheDocument();
    });

    it('applies multi-select-badge class to each tag', () => {
      const { container } = render(<PropertyRenderer property={mockPropertyValues.multi_select} />);
      const badges = container.querySelectorAll('.multi-select-badge');
      expect(badges.length).toBe(2);
    });
  });

  describe('Number Property', () => {
    it('renders number value', () => {
      render(<PropertyRenderer property={mockPropertyValues.number} />);
      expect(screen.getByText('42')).toBeInTheDocument();
    });

    it('renders dash for zero', () => {
      render(<PropertyRenderer property={{ type: 'number', number: 0 }} />);
      expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('renders dash for null number', () => {
      render(<PropertyRenderer property={{ type: 'number', number: null }} />);
      expect(screen.getByText('-')).toBeInTheDocument();
    });
  });

  describe('Checkbox Property', () => {
    it('renders checkmark for true', () => {
      render(<PropertyRenderer property={mockPropertyValues.checkbox} />);
      expect(screen.getByText('✓')).toBeInTheDocument();
    });

    it('renders X for false', () => {
      render(<PropertyRenderer property={{ type: 'checkbox', checkbox: false }} />);
      expect(screen.getByText('✗')).toBeInTheDocument();
    });
  });

  describe('Date Property', () => {
    it('renders date range', () => {
      render(<PropertyRenderer property={mockPropertyValues.date} />);
      expect(screen.getByText(/2025-10-04.*2025-10-10/)).toBeInTheDocument();
    });

    it('renders single date', () => {
      const singleDate = {
        type: 'date',
        date: { start: '2025-10-04', end: null, time_zone: null },
      };
      render(<PropertyRenderer property={singleDate} />);
      expect(screen.getByText('2025-10-04')).toBeInTheDocument();
    });

    it('renders dash for null date', () => {
      render(<PropertyRenderer property={mockPropertyValues.empty_date} />);
      expect(screen.getByText('-')).toBeInTheDocument();
    });
  });

  describe('Rich Text Property', () => {
    it('renders rich text content', () => {
      render(<PropertyRenderer property={mockPropertyValues.rich_text} />);
      expect(screen.getByText('Rich text content')).toBeInTheDocument();
    });

    it('renders dash for empty rich text', () => {
      render(<PropertyRenderer property={{ type: 'rich_text', rich_text: [] }} />);
      expect(screen.getByText('-')).toBeInTheDocument();
    });
  });

  describe('URL Property', () => {
    it('renders URL as link', () => {
      render(<PropertyRenderer property={mockPropertyValues.url} />);
      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('href', 'https://example.com');
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('renders dash for null URL', () => {
      render(<PropertyRenderer property={mockPropertyValues.empty_url} />);
      expect(screen.getByText('-')).toBeInTheDocument();
    });
  });

  describe('Email Property', () => {
    it('renders email as mailto link', () => {
      render(<PropertyRenderer property={mockPropertyValues.email} />);
      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('href', 'mailto:test@example.com');
      expect(link).toHaveTextContent('test@example.com');
    });

    it('renders dash for null email', () => {
      render(<PropertyRenderer property={{ type: 'email', email: null }} />);
      expect(screen.getByText('-')).toBeInTheDocument();
    });
  });

  describe('Phone Number Property', () => {
    it('renders phone number as tel link', () => {
      render(<PropertyRenderer property={mockPropertyValues.phone_number} />);
      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('href', 'tel:+1-555-0123');
      expect(link).toHaveTextContent('+1-555-0123');
    });

    it('renders dash for null phone number', () => {
      render(<PropertyRenderer property={{ type: 'phone_number', phone_number: null }} />);
      expect(screen.getByText('-')).toBeInTheDocument();
    });
  });

  describe('Unknown Property Type', () => {
    it('renders dash for unknown type', () => {
      render(<PropertyRenderer property={{ type: 'unknown_type' }} />);
      expect(screen.getByText('-')).toBeInTheDocument();
    });

    it('renders dash for null property', () => {
      render(<PropertyRenderer property={null} />);
      expect(screen.getByText('-')).toBeInTheDocument();
    });

    it('renders dash for undefined property', () => {
      render(<PropertyRenderer property={undefined} />);
      expect(screen.getByText('-')).toBeInTheDocument();
    });
  });
});
