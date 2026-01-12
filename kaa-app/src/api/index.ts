/**
 * API Index
 * Central export for all API clients.
 */

// Auth API
export {
  register,
  login,
  logout,
  getProfile,
  refreshToken,
  requestPasswordReset,
  getStoredToken,
  getStoredUser,
  storeAuth,
  clearAuth,
  getAuthHeaders,
  isAuthenticated,
  isAdmin,
  hasTierAccess,
  type User,
  type UserProfile,
  type AuthResponse,
  type RegisterInput,
  type LoginInput,
} from './authApi';

// Checkout API
export {
  getTierPricing,
  createCheckoutSession,
  getCheckoutSessionStatus,
  redirectToCheckout,
  formatPrice,
  getTierInfo,
  type TierPricing,
  type CheckoutSession,
  type CheckoutSessionInput,
  type CheckoutSessionStatus,
} from './checkoutApi';

// Leads API
export {
  createLead,
  getLeads,
  getLead,
  updateLead,
  convertLead,
  getLeadStats,
  getBudgetRangeLabel,
  getTimelineLabel,
  getProjectTypeLabel,
  getLeadStatusLabel,
  getLeadStatusColor,
  type Lead,
  type LeadStatus,
  type CreateLeadInput,
  type CreateLeadResponse,
  type LeadsListResponse,
  type LeadStats,
  type UpdateLeadInput,
  type TierRecommendation,
  type BudgetRange,
  type Timeline,
  type ProjectType,
} from './leadsApi';

// Notion API (existing)
export * from './notionApi';

// Admin API
export {
  getDatabaseTables,
  getTableSchema,
  getTableRecords,
  getTableRecord,
  formatCellValue,
  getColumnTypeColor,
  getTableIcon,
  type DatabaseTable,
  type ColumnSchema,
  type TableSchema,
  type PaginationMeta,
  type TableRecordsResponse,
  type RecordQueryParams,
} from './adminApi';
