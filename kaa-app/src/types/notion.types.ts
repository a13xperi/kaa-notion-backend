/**
 * Comprehensive TypeScript interfaces for Notion API types
 * 
 * This file provides complete type definitions for the Notion API, including:
 * - Property types (17 different Notion property types)
 * - Block types (10+ content block types)
 * - Page and Database structures
 * - Utility types for views, sorting, and filtering
 * 
 * @module notion.types
 * @version 1.0.0
 */

// ============================================
// NOTION PROPERTY TYPES
// ============================================

/**
 * Represents rich text content in Notion.
 * Rich text can contain formatting, links, and annotations.
 * 
 * @interface NotionRichText
 * @example
 * ```typescript
 * const richText: NotionRichText = {
 *   type: 'text',
 *   plain_text: 'Hello World',
 *   text: {
 *     content: 'Hello World',
 *     link: { url: 'https://example.com' }
 *   },
 *   annotations: {
 *     bold: true,
 *     italic: false,
 *     strikethrough: false,
 *     underline: false,
 *     code: false,
 *     color: 'default'
 *   }
 * }
 * ```
 */
export interface NotionRichText {
  /** The type of rich text: text, mention, or equation */
  type: 'text' | 'mention' | 'equation';
  /** Plain text representation without formatting */
  plain_text: string;
  /** Optional hyperlink URL */
  href?: string | null;
  /** Text formatting and styling */
  annotations?: {
    bold: boolean;
    italic: boolean;
    strikethrough: boolean;
    underline: boolean;
    code: boolean;
    color: string;
  };
  /** Text content details (present when type is 'text') */
  text?: {
    content: string;
    link?: { url: string } | null;
  };
}

/**
 * Represents a select option in Notion.
 * Used by Select and Multi-select properties.
 * 
 * @interface NotionSelectOption
 * @example
 * ```typescript
 * const option: NotionSelectOption = {
 *   id: 'abc123',
 *   name: 'In Progress',
 *   color: 'blue'
 * }
 * ```
 */
export interface NotionSelectOption {
  /** Unique identifier for the option */
  id?: string;
  /** Display name of the option */
  name: string;
  /** Color of the option (e.g., 'blue', 'red', 'green') */
  color: string;
}

/**
 * Represents a status option in Notion.
 * Similar to select options but used specifically for Status properties.
 * 
 * @interface NotionStatus
 */
export interface NotionStatus {
  /** Unique identifier for the status */
  id?: string;
  /** Display name of the status */
  name: string;
  /** Color of the status badge */
  color: string;
}

/**
 * Represents a Notion user.
 * Can be a person or bot user.
 * 
 * @interface NotionUser
 * @example
 * ```typescript
 * const user: NotionUser = {
 *   id: '550e8400-e29b-41d4-a716-446655440000',
 *   object: 'user',
 *   name: 'Alex Smith',
 *   avatar_url: 'https://example.com/avatar.jpg',
 *   person: {
 *     email: 'alex@example.com'
 *   }
 * }
 * ```
 */
export interface NotionUser {
  /** Unique user identifier */
  id: string;
  /** Always 'user' for user objects */
  object: 'user';
  /** User's display name */
  name?: string;
  /** URL to user's avatar image */
  avatar_url?: string;
  /** User type: 'person' or 'bot' */
  type?: string;
  /** Person-specific details (if user is a person) */
  person?: {
    email?: string;
  };
}

/**
 * Represents a file attached to a Notion page.
 * Can be hosted by Notion or externally.
 * 
 * @interface NotionFile
 * @example
 * ```typescript
 * const file: NotionFile = {
 *   name: 'document.pdf',
 *   type: 'file',
 *   file: {
 *     url: 'https://files.notion.com/...',
 *     expiry_time: '2025-10-04T12:00:00.000Z'
 *   }
 * }
 * ```
 */
export interface NotionFile {
  /** File name */
  name: string;
  /** File hosting type */
  type: 'file' | 'external';
  /** Notion-hosted file details (expires after some time) */
  file?: {
    url: string;
    expiry_time: string;
  };
  /** Externally-hosted file details */
  external?: {
    url: string;
  };
}

// ============================================
// NOTION PROPERTY VALUE TYPES
// ============================================
// All property types follow the pattern: { type, [type_value], id }
// The type field identifies the property type, and the corresponding
// field (e.g., 'title', 'number') contains the actual value.

/**
 * Title property - The main title/name of a page.
 * Every page has exactly one title property.
 * 
 * @interface TitleProperty
 */
export interface TitleProperty {
  type: 'title';
  /** Array of rich text objects forming the title */
  title: NotionRichText[];
  /** Property identifier */
  id: string;
}

/**
 * Rich text property - Multi-line formatted text content.
 * 
 * @interface RichTextProperty
 */
export interface RichTextProperty {
  type: 'rich_text';
  /** Array of rich text objects */
  rich_text: NotionRichText[];
  /** Property identifier */
  id: string;
}

/**
 * Number property - Numeric values.
 * Can be null if no value is set.
 * 
 * @interface NumberProperty
 */
export interface NumberProperty {
  type: 'number';
  /** Numeric value or null */
  number: number | null;
  /** Property identifier */
  id: string;
}

/**
 * Select property - Single selection from predefined options.
 * 
 * @interface SelectProperty
 * @example
 * ```typescript
 * const status: SelectProperty = {
 *   type: 'select',
 *   select: { name: 'In Progress', color: 'blue' },
 *   id: 'abc123'
 * }
 * ```
 */
export interface SelectProperty {
  type: 'select';
  /** Selected option or null */
  select: NotionSelectOption | null;
  /** Property identifier */
  id: string;
}

/**
 * Multi-select property - Multiple selections from predefined options.
 * 
 * @interface MultiSelectProperty
 */
export interface MultiSelectProperty {
  type: 'multi_select';
  /** Array of selected options */
  multi_select: NotionSelectOption[];
  /** Property identifier */
  id: string;
}

/**
 * Status property - Workflow status (similar to select).
 * Used for task/project status tracking.
 * 
 * @interface StatusProperty
 */
export interface StatusProperty {
  type: 'status';
  /** Current status or null */
  status: NotionStatus | null;
  /** Property identifier */
  id: string;
}

/**
 * Date property - Date or date range values.
 * Can include time and timezone information.
 * 
 * @interface DateProperty
 */
export interface DateProperty {
  type: 'date';
  date: {
    start: string;
    end?: string | null;
    time_zone?: string | null;
  } | null;
  /** Property identifier */
  id: string;
}

/** People property - References to Notion users. */
export interface PeopleProperty {
  type: 'people';
  /** Array of user references */
  people: NotionUser[];
  /** Property identifier */
  id: string;
}

/** Files property - File attachments. */
export interface FilesProperty {
  type: 'files';
  /** Array of attached files */
  files: NotionFile[];
  /** Property identifier */
  id: string;
}

/** Checkbox property - Boolean toggle. */
export interface CheckboxProperty {
  type: 'checkbox';
  /** True if checked, false otherwise */
  checkbox: boolean;
  /** Property identifier */
  id: string;
}

/** URL property - Web address. */
export interface UrlProperty {
  type: 'url';
  /** URL string or null */
  url: string | null;
  /** Property identifier */
  id: string;
}

/** Email property - Email address. */
export interface EmailProperty {
  type: 'email';
  /** Email address or null */
  email: string | null;
  /** Property identifier */
  id: string;
}

/** Phone number property - Phone number string. */
export interface PhoneNumberProperty {
  type: 'phone_number';
  /** Phone number or null */
  phone_number: string | null;
  /** Property identifier */
  id: string;
}

/** Created time property - When the page was created (read-only). */
export interface CreatedTimeProperty {
  type: 'created_time';
  /** ISO 8601 timestamp */
  created_time: string;
  /** Property identifier */
  id: string;
}

/** Created by property - Who created the page (read-only). */
export interface CreatedByProperty {
  type: 'created_by';
  /** User who created the page */
  created_by: NotionUser;
  /** Property identifier */
  id: string;
}

/** Last edited time property - When the page was last edited (read-only). */
export interface LastEditedTimeProperty {
  type: 'last_edited_time';
  /** ISO 8601 timestamp */
  last_edited_time: string;
  /** Property identifier */
  id: string;
}

/** Last edited by property - Who last edited the page (read-only). */
export interface LastEditedByProperty {
  type: 'last_edited_by';
  /** User who last edited */
  last_edited_by: NotionUser;
  /** Property identifier */
  id: string;
}

/**
 * Formula property - Computed values based on other properties.
 * Result type can be string, number, boolean, or date.
 */
export interface FormulaProperty {
  type: 'formula';
  formula: {
    type: 'string' | 'number' | 'boolean' | 'date';
    string?: string | null;
    number?: number | null;
    boolean?: boolean | null;
    date?: {
      start: string;
      end?: string | null;
      time_zone?: string | null;
    } | null;
  };
  /** Property identifier */
  id: string;
}

/**
 * Relation property - Links to pages in another database.
 */
export interface RelationProperty {
  type: 'relation';
  /** Array of related page IDs */
  relation: Array<{ id: string }>;
  /** Property identifier */
  id: string;
  /** True if there are more relations than returned */
  has_more?: boolean;
}

/**
 * Rollup property - Aggregates values from related pages.
 * Can compute sum, average, count, etc.
 */
export interface RollupProperty {
  type: 'rollup';
  rollup: {
    type: 'number' | 'date' | 'array' | 'incomplete' | 'unsupported';
    number?: number | null;
    date?: {
      start: string;
      end?: string | null;
      time_zone?: string | null;
    } | null;
    array?: any[];
    function: string;
  };
  /** Property identifier */
  id: string;
}

/**
 * Union type encompassing all 17 Notion property types.
 * Use this when a property can be any type.
 * 
 * @example
 * ```typescript
 * function renderProperty(prop: NotionPropertyValue) {
 *   switch (prop.type) {
 *     case 'title':
 *       return prop.title.map(t => t.plain_text).join('');
 *     case 'number':
 *       return prop.number?.toString() || 'N/A';
 *     // ... handle other types
 *   }
 * }
 * ```
 */
export type NotionPropertyValue =
  | TitleProperty
  | RichTextProperty
  | NumberProperty
  | SelectProperty
  | MultiSelectProperty
  | StatusProperty
  | DateProperty
  | PeopleProperty
  | FilesProperty
  | CheckboxProperty
  | UrlProperty
  | EmailProperty
  | PhoneNumberProperty
  | CreatedTimeProperty
  | CreatedByProperty
  | LastEditedTimeProperty
  | LastEditedByProperty
  | FormulaProperty
  | RelationProperty
  | RollupProperty;

// ============================================
// NOTION PAGE TYPES
// ============================================

/**
 * Represents the parent of a Notion page.
 * Pages can live in workspaces, inside other pages, or in databases.
 * 
 * @interface NotionPageParent
 */
export interface NotionPageParent {
  /** Type of parent */
  type: 'workspace' | 'page_id' | 'database_id' | 'data_source_id' | 'block_id';
  /** True if parent is workspace (private pages) */
  workspace?: boolean;
  /** Parent page ID if type is 'page_id' */
  page_id?: string;
  /** Parent database ID if type is 'database_id' */
  database_id?: string;
  /** Parent data source ID if type is 'data_source_id' */
  data_source_id?: string;
  /** Parent block ID if type is 'block_id' */
  block_id?: string;
}

/**
 * Represents a Notion page.
 * Pages are the primary content containers in Notion.
 * 
 * @interface NotionPage
 * @example
 * ```typescript
 * const page: NotionPage = {
 *   id: '550e8400-e29b-41d4-a716-446655440000',
 *   object: 'page',
 *   title: 'My Project',
 *   created_time: '2025-10-01T12:00:00.000Z',
 *   last_edited_time: '2025-10-04T15:30:00.000Z',
 *   url: 'https://www.notion.so/...',
 *   properties: { ... }
 * }
 * ```
 */
export interface NotionPage {
  /** Unique page identifier */
  id: string;
  /** Always 'page' for page objects */
  object: 'page';
  /** When the page was created */
  created_time: string;
  /** When the page was last edited */
  last_edited_time: string;
  created_by: NotionUser;
  last_edited_by: NotionUser;
  cover: NotionFile | null;
  icon: {
    type: 'emoji' | 'external' | 'file';
    emoji?: string;
    external?: { url: string };
    file?: { url: string; expiry_time: string };
  } | null;
  parent: NotionPageParent;
  archived: boolean;
  properties: Record<string, NotionPropertyValue>;
  url: string;
  public_url?: string | null;
  
  // Extended properties from our API
  title: string;
  emoji?: string;
  databaseName?: string | null;
  teamspaceName?: string | null;
  parentType?: string;
  parentId?: string | null;
}

// ============================================
// NOTION BLOCK TYPES
// ============================================

export interface ParagraphBlock {
  type: 'paragraph';
  paragraph: {
    rich_text: NotionRichText[];
    color: string;
  };
}

export interface HeadingBlock {
  type: 'heading_1' | 'heading_2' | 'heading_3';
  heading_1?: {
    rich_text: NotionRichText[];
    color: string;
    is_toggleable: boolean;
  };
  heading_2?: {
    rich_text: NotionRichText[];
    color: string;
    is_toggleable: boolean;
  };
  heading_3?: {
    rich_text: NotionRichText[];
    color: string;
    is_toggleable: boolean;
  };
}

export interface BulletedListItemBlock {
  type: 'bulleted_list_item';
  bulleted_list_item: {
    rich_text: NotionRichText[];
    color: string;
  };
}

export interface NumberedListItemBlock {
  type: 'numbered_list_item';
  numbered_list_item: {
    rich_text: NotionRichText[];
    color: string;
  };
}

export interface ToDoBlock {
  type: 'to_do';
  to_do: {
    rich_text: NotionRichText[];
    checked: boolean;
    color: string;
  };
}

export interface ToggleBlock {
  type: 'toggle';
  toggle: {
    rich_text: NotionRichText[];
    color: string;
  };
}

export interface CodeBlock {
  type: 'code';
  code: {
    rich_text: NotionRichText[];
    caption: NotionRichText[];
    language: string;
  };
}

export interface QuoteBlock {
  type: 'quote';
  quote: {
    rich_text: NotionRichText[];
    color: string;
  };
}

export interface CalloutBlock {
  type: 'callout';
  callout: {
    rich_text: NotionRichText[];
    icon: {
      type: 'emoji' | 'external';
      emoji?: string;
      external?: { url: string };
    };
    color: string;
  };
}

export interface DividerBlock {
  type: 'divider';
  divider: Record<string, never>;
}

// Base block interface
export interface NotionBlockBase {
  object: 'block';
  id: string;
  parent: {
    type: 'page_id' | 'block_id' | 'workspace';
    page_id?: string;
    block_id?: string;
  };
  created_time: string;
  last_edited_time: string;
  created_by: NotionUser;
  last_edited_by: NotionUser;
  has_children: boolean;
  archived: boolean;
}

// Union type for all block types
export type NotionBlock = NotionBlockBase & (
  | ParagraphBlock
  | HeadingBlock
  | BulletedListItemBlock
  | NumberedListItemBlock
  | ToDoBlock
  | ToggleBlock
  | CodeBlock
  | QuoteBlock
  | CalloutBlock
  | DividerBlock
);

// ============================================
// NOTION DATABASE TYPES
// ============================================

export interface NotionDatabase {
  object: 'database';
  id: string;
  created_time: string;
  created_by: NotionUser;
  last_edited_time: string;
  last_edited_by: NotionUser;
  title: NotionRichText[];
  description: NotionRichText[];
  icon: {
    type: 'emoji' | 'external' | 'file';
    emoji?: string;
    external?: { url: string };
    file?: { url: string; expiry_time: string };
  } | null;
  cover: NotionFile | null;
  properties: Record<string, any>; // Database property schemas
  parent: NotionPageParent;
  url: string;
  archived: boolean;
  is_inline: boolean;
  public_url?: string | null;
}

// ============================================
// API RESPONSE TYPES
// ============================================

export interface PageContent {
  page: NotionPage;
  blocks: NotionBlock[];
}

export interface NotionSearchResponse {
  object: 'list';
  results: NotionPage[];
  next_cursor: string | null;
  has_more: boolean;
}

export interface NotionErrorResponse {
  object: 'error';
  status: number;
  code: string;
  message: string;
}

// ============================================
// UTILITY TYPES
// ============================================

export type ViewMode = 'tree' | 'list';
export type SortOrder = 'recent' | 'oldest' | 'alphabetical';
export type FilterType = 'all' | 'workspace' | 'root';

export interface PageHierarchy {
  [pageId: string]: NotionPage[];
}

export interface TaskStatus {
  name: string;
  color: string;
  count: number;
}

export interface ProjectPhase {
  name: string;
  tasks: NotionPage[];
  completed: number;
  total: number;
  percentComplete: number;
}

