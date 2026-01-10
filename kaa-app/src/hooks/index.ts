/**
 * Hooks Index
 * Central export for all custom hooks.
 */

// Auth
export {
  useCurrentUser,
  useLogin,
  useRegister,
  useLogout,
  useRefreshToken,
  useIsAuthenticated,
  useIsAdmin,
  useUserTier,
  useAuthState,
  authKeys,
} from './useAuth';
export type { User, LoginCredentials, RegisterData, AuthResponse } from './useAuth';

// Projects
export {
  useProjects,
  useProject,
  useProjectMilestones,
  useProjectDeliverables,
  useUpdateProjectStatus,
  useProjectProgress,
  projectKeys,
} from './useProjects';
export type { ProjectFilters, ProjectsResponse } from './useProjects';

// Leads
export {
  useLeads,
  useLead,
  useLeadStats,
  useCreateLead,
  useUpdateLeadStatus,
  useOverrideLeadTier,
  useConvertLead,
  leadKeys,
} from './useLeads';
export type { 
  Lead, 
  LeadStatus, 
  LeadFilters, 
  LeadsResponse, 
  LeadStats,
  CreateLeadData,
  CreateLeadResponse,
} from './useLeads';
