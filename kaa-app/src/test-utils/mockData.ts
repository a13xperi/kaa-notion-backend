/**
 * Mock data for testing Notion components and API
 * Provides realistic test fixtures for all Notion property types
 */

import { NotionPage, NotionPropertyValue, NotionDatabase } from '../api/notionApi';

/**
 * Mock Notion page with various property types
 */
export const mockNotionPage: NotionPage = {
  id: 'test-page-123',
  object: 'page',
  title: 'Test Page Title',
  icon: {
    type: 'emoji',
    emoji: '📝',
  },
  cover: null,
  archived: false,
  url: 'https://www.notion.so/test-page-123',
  last_edited_time: '2025-10-04T12:00:00.000Z',
  created_time: '2025-10-01T12:00:00.000Z',
  created_by: {
    object: 'user',
    id: 'user-123',
    name: 'Test User',
    type: 'person',
  },
  last_edited_by: {
    object: 'user',
    id: 'user-123',
    name: 'Test User',
    type: 'person',
  },
  parent: {
    type: 'workspace',
  },
  properties: {
    'Name': {
      type: 'title',
      id: 'prop-name',
      title: [
        {
          type: 'text',
          plain_text: 'Test Page Title',
          text: {
            content: 'Test Page Title',
            link: null,
          },
          annotations: {
            bold: false,
            italic: false,
            strikethrough: false,
            underline: false,
            code: false,
            color: 'default',
          },
        },
      ],
    },
    'Status': {
      type: 'select',
      id: 'prop-status',
      select: {
        id: 'status-1',
        name: 'In Progress',
        color: 'blue',
      },
    },
    'Priority': {
      type: 'select',
      id: 'prop-priority',
      select: {
        id: 'priority-1',
        name: 'High',
        color: 'red',
      },
    },
    'Tags': {
      type: 'multi_select',
      id: 'prop-tags',
      multi_select: [
        { id: 'tag-1', name: 'urgent', color: 'red' },
        { id: 'tag-2', name: 'feature', color: 'blue' },
      ],
    },
    'Progress': {
      type: 'number',
      id: 'prop-progress',
      number: 75,
    },
    'Completed': {
      type: 'checkbox',
      id: 'prop-completed',
      checkbox: false,
    },
    'Due Date': {
      type: 'date',
      id: 'prop-due-date',
      date: {
        start: '2025-10-15',
        end: null,
        time_zone: null,
      },
    },
    'Description': {
      type: 'rich_text',
      id: 'prop-description',
      rich_text: [
        {
          type: 'text',
          plain_text: 'This is a test description',
          text: {
            content: 'This is a test description',
            link: null,
          },
          annotations: {
            bold: false,
            italic: false,
            strikethrough: false,
            underline: false,
            code: false,
            color: 'default',
          },
        },
      ],
    },
    'Project URL': {
      type: 'url',
      id: 'prop-url',
      url: 'https://example.com/project',
    },
    'Contact Email': {
      type: 'email',
      id: 'prop-email',
      email: 'test@example.com',
    },
    'Phone': {
      type: 'phone_number',
      id: 'prop-phone',
      phone_number: '+1-555-0123',
    },
  },
};

/**
 * Mock page with database parent
 */
export const mockPageWithDatabaseParent: NotionPage = {
  ...mockNotionPage,
  id: 'page-with-db-parent',
  title: 'Page in Database',
  parent: {
    type: 'database_id',
    database_id: 'database-123',
  },
};

/**
 * Mock page with page parent (child page)
 */
export const mockChildPage: NotionPage = {
  ...mockNotionPage,
  id: 'child-page-123',
  title: 'Child Page',
  parent: {
    type: 'page_id',
    page_id: 'test-page-123',
  },
};

/**
 * Mock page with minimal properties
 */
export const mockMinimalPage: NotionPage = {
  id: 'minimal-page',
  object: 'page',
  title: 'Minimal Page',
  icon: null,
  cover: null,
  last_edited_time: '2025-10-04T12:00:00.000Z',
  created_time: '2025-10-04T12:00:00.000Z',
  created_by: { object: 'user', id: 'user-1' },
  last_edited_by: { object: 'user', id: 'user-1' },
  archived: false,
  url: 'https://notion.so/minimal-page',
  parent: {
    type: 'workspace',
  },
  properties: {},
};

/**
 * Mock array of pages for list testing
 */
export const mockPagesList: NotionPage[] = [
  mockNotionPage,
  mockChildPage,
  mockMinimalPage,
  {
    ...mockNotionPage,
    id: 'page-2',
    title: 'Another Test Page',
    last_edited_time: '2025-10-03T12:00:00.000Z',
  },
  {
    ...mockNotionPage,
    id: 'page-3',
    title: 'Completed Task',
    properties: {
      ...mockNotionPage.properties,
      'Status': {
        type: 'select',
        id: 'prop-status',
        select: {
          id: 'status-done',
          name: 'Done',
          color: 'green',
        },
      },
      'Completed': {
        type: 'checkbox',
        id: 'prop-completed',
        checkbox: true,
      },
    },
  },
];

/**
 * Mock database schema
 */
export const mockDatabase: NotionDatabase = {
  id: 'database-123',
  object: 'database',
  created_time: '2025-10-01T12:00:00.000Z',
  last_edited_time: '2025-10-04T12:00:00.000Z',
  created_by: { object: 'user', id: 'user-1' },
  last_edited_by: { object: 'user', id: 'user-1' },
  cover: null,
  icon: null,
  parent: { type: 'workspace' },
  archived: false,
  url: 'https://notion.so/database-123',
  is_inline: false,
  public_url: null,
  description: [],
  title: [
    {
      type: 'text',
      plain_text: 'Test Database',
      text: {
        content: 'Test Database',
        link: null,
      },
      annotations: {
        bold: false,
        italic: false,
        strikethrough: false,
        underline: false,
        code: false,
        color: 'default',
      },
    },
  ],
  properties: {
    'Name': {
      id: 'title',
      type: 'title',
      title: {},
    },
    'Status': {
      id: 'status',
      type: 'select',
      select: {
        options: [
          { id: '1', name: 'Not Started', color: 'gray' },
          { id: '2', name: 'In Progress', color: 'blue' },
          { id: '3', name: 'Done', color: 'green' },
        ],
      },
    },
    'Tags': {
      id: 'tags',
      type: 'multi_select',
      multi_select: {
        options: [
          { id: 't1', name: 'urgent', color: 'red' },
          { id: 't2', name: 'feature', color: 'blue' },
          { id: 't3', name: 'bug', color: 'red' },
        ],
      },
    },
  },
};

/**
 * Mock property values for individual property testing
 */
export const mockPropertyValues: Record<string, NotionPropertyValue> = {
  title: {
    type: 'title',
    id: 'prop-title',
    title: [
      {
        type: 'text',
        plain_text: 'Title Text',
        text: { content: 'Title Text', link: null },
        annotations: {
          bold: false,
          italic: false,
          strikethrough: false,
          underline: false,
          code: false,
          color: 'default',
        },
      },
    ],
  },
  select: {
    type: 'select',
    id: 'prop-select',
    select: { id: 's1', name: 'Selected Option', color: 'blue' },
  },
  multi_select: {
    type: 'multi_select',
    id: 'prop-multi-select',
    multi_select: [
      { id: 'ms1', name: 'Tag 1', color: 'red' },
      { id: 'ms2', name: 'Tag 2', color: 'blue' },
    ],
  },
  number: {
    type: 'number',
    id: 'prop-number',
    number: 42,
  },
  checkbox: {
    type: 'checkbox',
    id: 'prop-checkbox',
    checkbox: true,
  },
  date: {
    type: 'date',
    id: 'prop-date',
    date: {
      start: '2025-10-04',
      end: '2025-10-10',
      time_zone: null,
    },
  },
  rich_text: {
    type: 'rich_text',
    id: 'prop-rich-text',
    rich_text: [
      {
        type: 'text',
        plain_text: 'Rich text content',
        text: { content: 'Rich text content', link: null },
        annotations: {
          bold: true,
          italic: false,
          strikethrough: false,
          underline: false,
          code: false,
          color: 'default',
        },
      },
    ],
  },
  url: {
    type: 'url',
    id: 'prop-url',
    url: 'https://example.com',
  },
  email: {
    type: 'email',
    id: 'prop-email',
    email: 'test@example.com',
  },
  phone_number: {
    type: 'phone_number',
    id: 'prop-phone',
    phone_number: '+1-555-0123',
  },
  empty_select: {
    type: 'select',
    id: 'prop-empty-select',
    select: null,
  },
  empty_multi_select: {
    type: 'multi_select',
    id: 'prop-empty-multi-select',
    multi_select: [],
  },
  empty_date: {
    type: 'date',
    id: 'prop-empty-date',
    date: null,
  },
  empty_url: {
    type: 'url',
    id: 'prop-empty-url',
    url: null,
  },
};

/**
 * Mock page content for content rendering tests
 */
export const mockPageContent = {
  id: 'test-page-123',
  title: 'Test Page Title',
  blocks: [
    {
      id: 'block-1',
      type: 'paragraph',
      paragraph: {
        rich_text: [
          {
            type: 'text',
            plain_text: 'This is a test paragraph.',
            text: {
              content: 'This is a test paragraph.',
              link: null,
            },
          },
        ],
      },
    },
    {
      id: 'block-2',
      type: 'heading_2',
      heading_2: {
        rich_text: [
          {
            type: 'text',
            plain_text: 'Test Heading',
            text: {
              content: 'Test Heading',
              link: null,
            },
          },
        ],
      },
    },
  ],
};
