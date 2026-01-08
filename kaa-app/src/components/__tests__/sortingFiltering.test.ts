/**
 * Tests for sorting and filtering logic
 * Ensures pages are sorted correctly by different criteria
 */

import { mockPagesList, mockNotionPage } from '../../test-utils/mockData';
import { NotionPage } from '../../api/notionApi';

// Replicate the sortPages function from NotionWorkspaceViewer
const sortPages = (pages: NotionPage[], sortOrder: string): NotionPage[] => {
    const sorted = [...pages];
    
    switch (sortOrder) {
      case 'title-asc':
        return sorted.sort((a, b) => a.title.localeCompare(b.title));
      
      case 'title-desc':
        return sorted.sort((a, b) => b.title.localeCompare(a.title));
      
      case 'modified-desc':
        return sorted.sort((a, b) => 
          new Date(b.last_edited_time).getTime() - new Date(a.last_edited_time).getTime()
        );
      
      case 'modified-asc':
        return sorted.sort((a, b) => 
          new Date(a.last_edited_time).getTime() - new Date(b.last_edited_time).getTime()
        );
      
      case 'created-desc':
        return sorted.sort((a, b) => 
          new Date(b.created_time).getTime() - new Date(a.created_time).getTime()
        );
      
      case 'created-asc':
        return sorted.sort((a, b) => 
          new Date(a.created_time).getTime() - new Date(b.created_time).getTime()
        );
      
      default:
        return sorted;
    }
};

describe('Sorting Logic', () => {
  describe('Sort by Title', () => {
    it('sorts pages by title ascending', () => {
      const sorted = sortPages(mockPagesList, 'title-asc');
      
      // Verify sorted order
      for (let i = 0; i < sorted.length - 1; i++) {
        expect(sorted[i].title.localeCompare(sorted[i + 1].title)).toBeLessThanOrEqual(0);
      }
    });

    it('sorts pages by title descending', () => {
      const sorted = sortPages(mockPagesList, 'title-desc');
      
      // Verify sorted order
      for (let i = 0; i < sorted.length - 1; i++) {
        expect(sorted[i].title.localeCompare(sorted[i + 1].title)).toBeGreaterThanOrEqual(0);
      }
    });

    it('handles case-insensitive sorting', () => {
      const pages = [
        { ...mockNotionPage, id: '1', title: 'apple' },
        { ...mockNotionPage, id: '2', title: 'Banana' },
        { ...mockNotionPage, id: '3', title: 'cherry' },
      ];
      
      const sorted = sortPages(pages, 'title-asc');
      expect(sorted[0].title.toLowerCase()).toBe('apple');
      expect(sorted[1].title.toLowerCase()).toBe('banana');
      expect(sorted[2].title.toLowerCase()).toBe('cherry');
    });
  });

  describe('Sort by Last Edited Time', () => {
    it('sorts pages by last edited time descending (newest first)', () => {
      const sorted = sortPages(mockPagesList, 'modified-desc');
      
      // Verify sorted order
      for (let i = 0; i < sorted.length - 1; i++) {
        const time1 = new Date(sorted[i].last_edited_time).getTime();
        const time2 = new Date(sorted[i + 1].last_edited_time).getTime();
        expect(time1).toBeGreaterThanOrEqual(time2);
      }
    });

    it('sorts pages by last edited time ascending (oldest first)', () => {
      const sorted = sortPages(mockPagesList, 'modified-asc');
      
      // Verify sorted order
      for (let i = 0; i < sorted.length - 1; i++) {
        const time1 = new Date(sorted[i].last_edited_time).getTime();
        const time2 = new Date(sorted[i + 1].last_edited_time).getTime();
        expect(time1).toBeLessThanOrEqual(time2);
      }
    });

    it('handles same timestamp correctly', () => {
      const pages = [
        { ...mockNotionPage, id: '1', title: 'Page 1', last_edited_time: '2025-10-04T12:00:00.000Z' },
        { ...mockNotionPage, id: '2', title: 'Page 2', last_edited_time: '2025-10-04T12:00:00.000Z' },
      ];
      
      const sorted = sortPages(pages, 'modified-desc');
      expect(sorted.length).toBe(2);
    });
  });

  describe('Sort by Created Time', () => {
    it('sorts pages by created time descending', () => {
      const sorted = sortPages(mockPagesList, 'created-desc');
      
      // Verify sorted order
      for (let i = 0; i < sorted.length - 1; i++) {
        const time1 = new Date(sorted[i].created_time).getTime();
        const time2 = new Date(sorted[i + 1].created_time).getTime();
        expect(time1).toBeGreaterThanOrEqual(time2);
      }
    });

    it('sorts pages by created time ascending', () => {
      const sorted = sortPages(mockPagesList, 'created-asc');
      
      // Verify sorted order
      for (let i = 0; i < sorted.length - 1; i++) {
        const time1 = new Date(sorted[i].created_time).getTime();
        const time2 = new Date(sorted[i + 1].created_time).getTime();
        expect(time1).toBeLessThanOrEqual(time2);
      }
    });
  });

  describe('Default Sorting', () => {
    it('returns pages in original order for unknown sort option', () => {
      const sorted = sortPages(mockPagesList, 'unknown-sort');
      
      expect(sorted).toEqual(mockPagesList);
    });

    it('does not mutate original array', () => {
      const original = [...mockPagesList];
      sortPages(mockPagesList, 'title-asc');
      
      expect(mockPagesList).toEqual(original);
    });
  });

  describe('Edge Cases', () => {
    it('handles empty array', () => {
      const sorted = sortPages([], 'title-asc');
      expect(sorted).toEqual([]);
    });

    it('handles single page', () => {
      const singlePage = [mockNotionPage];
      const sorted = sortPages(singlePage, 'title-asc');
      expect(sorted).toEqual(singlePage);
    });

    it('handles pages with identical titles', () => {
      const pages = [
        { ...mockNotionPage, id: '1', title: 'Same Title' },
        { ...mockNotionPage, id: '2', title: 'Same Title' },
        { ...mockNotionPage, id: '3', title: 'Same Title' },
      ];
      
      const sorted = sortPages(pages, 'title-asc');
      expect(sorted.length).toBe(3);
      expect(sorted.every(p => p.title === 'Same Title')).toBe(true);
    });
  });
});

// Replicate the filterPages function from NotionWorkspaceViewer
const filterPages = (pages: NotionPage[], searchQuery: string): NotionPage[] => {
  if (!searchQuery.trim()) return pages;
  
  const query = searchQuery.toLowerCase();
  return pages.filter(page => 
    page.title.toLowerCase().includes(query)
  );
};

describe('Filtering Logic', () => {
  describe('Search Filtering', () => {
    it('filters pages by title', () => {
      const filtered = filterPages(mockPagesList, 'Test');
      expect(filtered.every(p => p.title.toLowerCase().includes('test'))).toBe(true);
    });

    it('is case-insensitive', () => {
      const filtered = filterPages(mockPagesList, 'TEST');
      expect(filtered.length).toBeGreaterThan(0);
      expect(filtered.every(p => p.title.toLowerCase().includes('test'))).toBe(true);
    });

    it('returns all pages for empty query', () => {
      const filtered = filterPages(mockPagesList, '');
      expect(filtered).toEqual(mockPagesList);
    });

    it('returns all pages for whitespace-only query', () => {
      const filtered = filterPages(mockPagesList, '   ');
      expect(filtered).toEqual(mockPagesList);
    });

    it('returns empty array when no matches', () => {
      const filtered = filterPages(mockPagesList, 'NonexistentPage123456');
      expect(filtered).toEqual([]);
    });

    it('handles partial matches', () => {
      const filtered = filterPages(mockPagesList, 'Page');
      expect(filtered.length).toBeGreaterThan(0);
      expect(filtered.every(p => p.title.toLowerCase().includes('page'))).toBe(true);
    });

    it('handles special characters in search', () => {
      const pages = [
        { ...mockNotionPage, id: '1', title: 'Page (with parentheses)' },
        { ...mockNotionPage, id: '2', title: 'Normal Page' },
      ];
      
      const filtered = filterPages(pages, '(with');
      expect(filtered.length).toBe(1);
      expect(filtered[0].title).toContain('(with');
    });
  });

  describe('Combined Filtering and Sorting', () => {
    it('filters then sorts correctly', () => {
      const filtered = filterPages(mockPagesList, 'Page');
      const sorted = sortPages(filtered, 'title-asc');
      
      expect(sorted.every(p => p.title.toLowerCase().includes('page'))).toBe(true);
      
      for (let i = 0; i < sorted.length - 1; i++) {
        expect(sorted[i].title.localeCompare(sorted[i + 1].title)).toBeLessThanOrEqual(0);
      }
    });
  });
});
