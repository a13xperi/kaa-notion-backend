/**
 * Admin Pages
 * Page components that wrap admin components with data fetching.
 * Connected to real API endpoints.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminDashboard } from '../components/admin/AdminDashboard';
import { Skeleton, SkeletonStats, Modal } from '../components/common';
import {
  adminApi,
  AdminUser,
  getDatabaseTables,
  getTableRecords,
  getTableRecord,
  formatCellValue,
  getTableIcon,
  type DatabaseTable,
  type RecordQueryParams,
} from '../api/adminApi';
import {
  DashboardStats,
  Lead,
  AdminProject,
  AdminClient,
  formatDate,
  formatCurrency,
  LEAD_STATUS_LABELS,
  CLIENT_STATUS_LABELS,
} from '../types/admin.types';
import { TIER_NAMES } from '../types/portal.types';

// ============================================================================
// MOCK DATA (Fallback)
// ============================================================================

const MOCK_STATS: DashboardStats = {
  leads: {
    total: 0,
    byStatus: {},
    thisMonth: 0,
    conversionRate: 0,
  },
  projects: {
    total: 0,
    active: 0,
    byTier: {},
    byStatus: {},
  },
  clients: {
    total: 0,
    active: 0,
    byTier: {},
  },
  revenue: {
    total: 0,
    thisMonth: 0,
    byTier: {},
  },
  recentActivity: [],
};

// ============================================================================
// ADMIN DASHBOARD PAGE
// ============================================================================

export function AdminDashboardPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setIsLoading(true);
        const data = await adminApi.dashboard.getStats();
        setStats(data);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch dashboard stats:', err);
        setError('Failed to load dashboard data');
        setStats(MOCK_STATS);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (isLoading) {
    return (
      <div style={{ padding: '2rem' }}>
        <div style={{ marginBottom: '2rem' }}>
          <Skeleton height={40} width={250} />
        </div>
        <SkeletonStats count={4} />
      </div>
    );
  }

  const handleNavigate = (section: 'leads' | 'projects' | 'clients') => {
    navigate(`/admin/${section}`);
  };

  return (
    <div>
      {error && (
        <div style={{
          background: '#fef2f2',
          border: '1px solid #fecaca',
          color: '#b91c1c',
          padding: '1rem',
          borderRadius: '8px',
          marginBottom: '1rem',
        }}>
          {error} - Showing placeholder data
        </div>
      )}
      <AdminDashboard stats={stats} onNavigate={handleNavigate} />
    </div>
  );
}

// ============================================================================
// USERS PAGE
// ============================================================================

const USER_TYPE_LABELS: Record<string, string> = {
  SAGE_CLIENT: 'Client',
  KAA_CLIENT: 'Legacy Client',
  TEAM: 'Team Member',
  ADMIN: 'Admin',
};

const USER_TYPE_COLORS: Record<string, string> = {
  SAGE_CLIENT: '#3b82f6',
  KAA_CLIENT: '#8b5cf6',
  TEAM: '#10b981',
  ADMIN: '#ef4444',
};

export function UsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [userTypeFilter, setUserTypeFilter] = useState<string>('');

  const fetchUsers = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await adminApi.users.list(
        { search: search || undefined, userType: userTypeFilter || undefined },
        { page, limit: 20 }
      );
      setUsers(response.data);
      setTotalPages(response.meta.totalPages);
      setTotal(response.meta.total);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch users:', err);
      setError('Failed to load users');
    } finally {
      setIsLoading(false);
    }
  }, [page, search, userTypeFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  return (
    <div style={{ padding: '2rem' }}>
      <header style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.5rem' }}>
          User Management
        </h1>
        <p style={{ color: '#6b7280' }}>
          {total} total users on the platform
        </p>
      </header>

      {/* Filters */}
      <div style={{
        display: 'flex',
        gap: '1rem',
        marginBottom: '1.5rem',
        flexWrap: 'wrap',
      }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            type="text"
            placeholder="Search by email or name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              padding: '0.5rem 1rem',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              width: '250px',
            }}
          />
          <button
            type="submit"
            style={{
              padding: '0.5rem 1rem',
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
            }}
          >
            Search
          </button>
        </form>

        <select
          value={userTypeFilter}
          onChange={(e) => {
            setUserTypeFilter(e.target.value);
            setPage(1);
          }}
          style={{
            padding: '0.5rem 1rem',
            border: '1px solid #d1d5db',
            borderRadius: '8px',
            background: 'white',
          }}
        >
          <option value="">All User Types</option>
          <option value="SAGE_CLIENT">Clients</option>
          <option value="TEAM">Team Members</option>
          <option value="ADMIN">Admins</option>
        </select>
      </div>

      {error && (
        <div style={{
          background: '#fef2f2',
          border: '1px solid #fecaca',
          color: '#b91c1c',
          padding: '1rem',
          borderRadius: '8px',
          marginBottom: '1rem',
        }}>
          {error}
        </div>
      )}

      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} height={60} />
          ))}
        </div>
      ) : users.length === 0 ? (
        <div style={{
          background: '#f3f4f6',
          borderRadius: '12px',
          padding: '3rem',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>👥</div>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>No Users Found</h2>
          <p style={{ color: '#6b7280' }}>Try adjusting your search or filters.</p>
        </div>
      ) : (
        <>
          {/* Users Table */}
          <div style={{
            background: 'white',
            borderRadius: '12px',
            border: '1px solid #e5e7eb',
            overflow: 'hidden',
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>User</th>
                  <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Type</th>
                  <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Tier</th>
                  <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Client Status</th>
                  <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Projects</th>
                  <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Last Login</th>
                  <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Created</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '1rem' }}>
                      <div>
                        <div style={{ fontWeight: 500 }}>{user.name || 'No name'}</div>
                        <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>{user.email}</div>
                      </div>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '0.25rem 0.75rem',
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        fontWeight: 500,
                        background: `${USER_TYPE_COLORS[user.userType]}20`,
                        color: USER_TYPE_COLORS[user.userType],
                      }}>
                        {USER_TYPE_LABELS[user.userType] || user.userType}
                      </span>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      {user.tier ? TIER_NAMES[user.tier] || `Tier ${user.tier}` : '-'}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      {user.client ? (
                        <span style={{
                          display: 'inline-block',
                          padding: '0.25rem 0.75rem',
                          borderRadius: '9999px',
                          fontSize: '0.75rem',
                          background: user.client.status === 'ACTIVE' ? '#dcfce7' : '#f3f4f6',
                          color: user.client.status === 'ACTIVE' ? '#166534' : '#374151',
                        }}>
                          {user.client.status}
                        </span>
                      ) : (
                        <span style={{ color: '#9ca3af' }}>-</span>
                      )}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      {user.client?.projectCount ?? '-'}
                    </td>
                    <td style={{ padding: '1rem', color: '#6b7280', fontSize: '0.875rem' }}>
                      {user.lastLogin ? formatDate(user.lastLogin) : 'Never'}
                    </td>
                    <td style={{ padding: '1rem', color: '#6b7280', fontSize: '0.875rem' }}>
                      {formatDate(user.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '1rem',
              marginTop: '1.5rem',
            }}>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                style={{
                  padding: '0.5rem 1rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  background: page === 1 ? '#f3f4f6' : 'white',
                  cursor: page === 1 ? 'not-allowed' : 'pointer',
                }}
              >
                Previous
              </button>
              <span style={{ color: '#6b7280' }}>
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                style={{
                  padding: '0.5rem 1rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  background: page === totalPages ? '#f3f4f6' : 'white',
                  cursor: page === totalPages ? 'not-allowed' : 'pointer',
                }}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ============================================================================
// LEAD QUEUE PAGE
// ============================================================================

export function LeadQueuePage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const fetchLeads = async () => {
      try {
        setIsLoading(true);
        const response = await adminApi.leads.list({}, { page, limit: 20 });
        setLeads(response.data);
        setTotalPages(response.meta.totalPages);
        setTotal(response.meta.total);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch leads:', err);
        setError('Failed to load leads');
      } finally {
        setIsLoading(false);
      }
    };

    fetchLeads();
  }, [page]);

  return (
    <div style={{ padding: '2rem' }}>
      <header style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.5rem' }}>
          Lead Management
        </h1>
        <p style={{ color: '#6b7280' }}>{total} total leads</p>
      </header>

      {error && (
        <div style={{
          background: '#fef2f2',
          border: '1px solid #fecaca',
          color: '#b91c1c',
          padding: '1rem',
          borderRadius: '8px',
          marginBottom: '1rem',
        }}>
          {error}
        </div>
      )}

      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} height={60} />
          ))}
        </div>
      ) : leads.length === 0 ? (
        <div style={{
          background: '#f3f4f6',
          borderRadius: '12px',
          padding: '3rem',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📋</div>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>No Leads Yet</h2>
          <p style={{ color: '#6b7280' }}>Leads will appear here when users submit the intake form.</p>
        </div>
      ) : (
        <>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            border: '1px solid #e5e7eb',
            overflow: 'hidden',
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Contact</th>
                  <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Project</th>
                  <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Tier</th>
                  <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Status</th>
                  <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Created</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <tr key={lead.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '1rem' }}>
                      <div>
                        <div style={{ fontWeight: 500 }}>{lead.name || 'No name'}</div>
                        <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>{lead.email}</div>
                      </div>
                    </td>
                    <td style={{ padding: '1rem', fontSize: '0.875rem' }}>
                      {lead.projectAddress || '-'}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      {TIER_NAMES[lead.recommendedTier] || `Tier ${lead.recommendedTier}`}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '0.25rem 0.75rem',
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        fontWeight: 500,
                        background: lead.status === 'QUALIFIED' ? '#dcfce7' : lead.status === 'NEW' ? '#dbeafe' : '#f3f4f6',
                        color: lead.status === 'QUALIFIED' ? '#166534' : lead.status === 'NEW' ? '#1e40af' : '#374151',
                      }}>
                        {LEAD_STATUS_LABELS[lead.status] || lead.status}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', color: '#6b7280', fontSize: '0.875rem' }}>
                      {formatDate(lead.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '1rem',
              marginTop: '1.5rem',
            }}>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                style={{
                  padding: '0.5rem 1rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  background: page === 1 ? '#f3f4f6' : 'white',
                  cursor: page === 1 ? 'not-allowed' : 'pointer',
                }}
              >
                Previous
              </button>
              <span style={{ color: '#6b7280' }}>Page {page} of {totalPages}</span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                style={{
                  padding: '0.5rem 1rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  background: page === totalPages ? '#f3f4f6' : 'white',
                  cursor: page === totalPages ? 'not-allowed' : 'pointer',
                }}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ============================================================================
// PROJECTS TABLE PAGE
// ============================================================================

export function ProjectsTablePage() {
  const [projects, setProjects] = useState<AdminProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setIsLoading(true);
        const response = await adminApi.projects.list({}, { page, limit: 20 });
        setProjects(response.data);
        setTotalPages(response.meta.totalPages);
        setTotal(response.meta.total);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch projects:', err);
        setError('Failed to load projects');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProjects();
  }, [page]);

  return (
    <div style={{ padding: '2rem' }}>
      <header style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.5rem' }}>
          Project Management
        </h1>
        <p style={{ color: '#6b7280' }}>{total} total projects</p>
      </header>

      {error && (
        <div style={{
          background: '#fef2f2',
          border: '1px solid #fecaca',
          color: '#b91c1c',
          padding: '1rem',
          borderRadius: '8px',
          marginBottom: '1rem',
        }}>
          {error}
        </div>
      )}

      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} height={60} />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div style={{
          background: '#f3f4f6',
          borderRadius: '12px',
          padding: '3rem',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏗️</div>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>No Projects Yet</h2>
          <p style={{ color: '#6b7280' }}>Projects will appear here when clients start their journey.</p>
        </div>
      ) : (
        <>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            border: '1px solid #e5e7eb',
            overflow: 'hidden',
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Project</th>
                  <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Client</th>
                  <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Tier</th>
                  <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Status</th>
                  <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Progress</th>
                  <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Revenue</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((project) => (
                  <tr key={project.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ fontWeight: 500 }}>{project.name}</div>
                    </td>
                    <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#6b7280' }}>
                      {project.client.email || project.client.projectAddress}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      {TIER_NAMES[project.tier] || `Tier ${project.tier}`}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '0.25rem 0.75rem',
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        fontWeight: 500,
                        background: project.status === 'IN_PROGRESS' ? '#dbeafe' : project.status === 'DELIVERED' ? '#dcfce7' : '#f3f4f6',
                        color: project.status === 'IN_PROGRESS' ? '#1e40af' : project.status === 'DELIVERED' ? '#166534' : '#374151',
                      }}>
                        {project.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{
                          width: '60px',
                          height: '6px',
                          background: '#e5e7eb',
                          borderRadius: '3px',
                          overflow: 'hidden',
                        }}>
                          <div style={{
                            width: `${project.progress.percentage}%`,
                            height: '100%',
                            background: '#3b82f6',
                          }} />
                        </div>
                        <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                          {project.progress.percentage}%
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '1rem', fontWeight: 500 }}>
                      {formatCurrency(project.totalPaid)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '1rem',
              marginTop: '1.5rem',
            }}>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                style={{
                  padding: '0.5rem 1rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  background: page === 1 ? '#f3f4f6' : 'white',
                  cursor: page === 1 ? 'not-allowed' : 'pointer',
                }}
              >
                Previous
              </button>
              <span style={{ color: '#6b7280' }}>Page {page} of {totalPages}</span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                style={{
                  padding: '0.5rem 1rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  background: page === totalPages ? '#f3f4f6' : 'white',
                  cursor: page === totalPages ? 'not-allowed' : 'pointer',
                }}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ============================================================================
// CLIENTS TABLE PAGE
// ============================================================================

export function ClientsTablePage() {
  const [clients, setClients] = useState<AdminClient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const fetchClients = async () => {
      try {
        setIsLoading(true);
        const response = await adminApi.clients.list({}, { page, limit: 20 });
        setClients(response.data);
        setTotalPages(response.meta.totalPages);
        setTotal(response.meta.total);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch clients:', err);
        setError('Failed to load clients');
      } finally {
        setIsLoading(false);
      }
    };

    fetchClients();
  }, [page]);

  return (
    <div style={{ padding: '2rem' }}>
      <header style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.5rem' }}>
          Client Management
        </h1>
        <p style={{ color: '#6b7280' }}>{total} total clients</p>
      </header>

      {error && (
        <div style={{
          background: '#fef2f2',
          border: '1px solid #fecaca',
          color: '#b91c1c',
          padding: '1rem',
          borderRadius: '8px',
          marginBottom: '1rem',
        }}>
          {error}
        </div>
      )}

      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} height={60} />
          ))}
        </div>
      ) : clients.length === 0 ? (
        <div style={{
          background: '#f3f4f6',
          borderRadius: '12px',
          padding: '3rem',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>👥</div>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>No Clients Yet</h2>
          <p style={{ color: '#6b7280' }}>Clients will appear here when leads convert.</p>
        </div>
      ) : (
        <>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            border: '1px solid #e5e7eb',
            overflow: 'hidden',
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Client</th>
                  <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Tier</th>
                  <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Status</th>
                  <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Projects</th>
                  <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Revenue</th>
                  <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Last Login</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((client) => (
                  <tr key={client.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '1rem' }}>
                      <div>
                        <div style={{ fontWeight: 500 }}>{client.email || 'No email'}</div>
                        <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>{client.projectAddress}</div>
                      </div>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      {TIER_NAMES[client.tier] || `Tier ${client.tier}`}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '0.25rem 0.75rem',
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        fontWeight: 500,
                        background: client.status === 'ACTIVE' ? '#dcfce7' : '#f3f4f6',
                        color: client.status === 'ACTIVE' ? '#166534' : '#374151',
                      }}>
                        {CLIENT_STATUS_LABELS[client.status] || client.status}
                      </span>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{ fontWeight: 500 }}>{client.stats.activeProjects}</span>
                      <span style={{ color: '#6b7280' }}> / {client.stats.projectCount}</span>
                    </td>
                    <td style={{ padding: '1rem', fontWeight: 500 }}>
                      {formatCurrency(client.stats.totalPaid)}
                    </td>
                    <td style={{ padding: '1rem', color: '#6b7280', fontSize: '0.875rem' }}>
                      {client.lastLogin ? formatDate(client.lastLogin) : 'Never'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '1rem',
              marginTop: '1.5rem',
            }}>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                style={{
                  padding: '0.5rem 1rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  background: page === 1 ? '#f3f4f6' : 'white',
                  cursor: page === 1 ? 'not-allowed' : 'pointer',
                }}
              >
                Previous
              </button>
              <span style={{ color: '#6b7280' }}>Page {page} of {totalPages}</span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                style={{
                  padding: '0.5rem 1rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  background: page === totalPages ? '#f3f4f6' : 'white',
                  cursor: page === totalPages ? 'not-allowed' : 'pointer',
                }}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ============================================================================
// DATABASE EXPLORER PAGE
// ============================================================================

// Styles for the database explorer
const dbExplorerStyles = {
  container: {
    display: 'flex',
    height: 'calc(100vh - 180px)',
    gap: '1rem',
    padding: '1rem',
  } as React.CSSProperties,
  sidebar: {
    width: '280px',
    background: '#f9fafb',
    borderRadius: '12px',
    padding: '1rem',
    overflowY: 'auto' as const,
    flexShrink: 0,
  } as React.CSSProperties,
  sidebarTitle: {
    fontSize: '0.875rem',
    fontWeight: 600,
    color: '#6b7280',
    marginBottom: '1rem',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  } as React.CSSProperties,
  tableItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.75rem 1rem',
    borderRadius: '8px',
    cursor: 'pointer',
    marginBottom: '0.5rem',
    transition: 'background 0.2s',
  } as React.CSSProperties,
  tableItemSelected: {
    background: '#dbeafe',
    color: '#1d4ed8',
  } as React.CSSProperties,
  tableIcon: {
    fontSize: '1.25rem',
  } as React.CSSProperties,
  tableInfo: {
    flex: 1,
  } as React.CSSProperties,
  tableName: {
    fontWeight: 500,
    fontSize: '0.9375rem',
  } as React.CSSProperties,
  tableCount: {
    fontSize: '0.75rem',
    color: '#9ca3af',
  } as React.CSSProperties,
  main: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    minWidth: 0,
  } as React.CSSProperties,
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    marginBottom: '1rem',
    flexWrap: 'wrap' as const,
  } as React.CSSProperties,
  searchInput: {
    flex: 1,
    minWidth: '200px',
    padding: '0.625rem 1rem',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    fontSize: '0.9375rem',
  } as React.CSSProperties,
  tableContainer: {
    flex: 1,
    overflowX: 'auto' as const,
    background: '#fff',
    borderRadius: '12px',
    border: '1px solid #e5e7eb',
  } as React.CSSProperties,
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    fontSize: '0.875rem',
  } as React.CSSProperties,
  th: {
    textAlign: 'left' as const,
    padding: '0.75rem 1rem',
    background: '#f9fafb',
    borderBottom: '2px solid #e5e7eb',
    fontWeight: 600,
    color: '#374151',
    cursor: 'pointer',
    whiteSpace: 'nowrap' as const,
  } as React.CSSProperties,
  td: {
    padding: '0.75rem 1rem',
    borderBottom: '1px solid #f3f4f6',
    maxWidth: '300px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  } as React.CSSProperties,
  tr: {
    cursor: 'pointer',
    transition: 'background 0.15s',
  } as React.CSSProperties,
  pagination: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '1rem',
    borderTop: '1px solid #e5e7eb',
  } as React.CSSProperties,
  paginationInfo: {
    fontSize: '0.875rem',
    color: '#6b7280',
  } as React.CSSProperties,
  paginationButtons: {
    display: 'flex',
    gap: '0.5rem',
  } as React.CSSProperties,
  pageButton: {
    padding: '0.5rem 1rem',
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
    background: '#fff',
    cursor: 'pointer',
    fontSize: '0.875rem',
  } as React.CSSProperties,
  pageButtonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  } as React.CSSProperties,
  emptyState: {
    textAlign: 'center' as const,
    padding: '4rem 2rem',
    color: '#6b7280',
  } as React.CSSProperties,
  recordDetail: {
    padding: '1rem',
  } as React.CSSProperties,
  recordField: {
    marginBottom: '1rem',
  } as React.CSSProperties,
  recordLabel: {
    fontWeight: 600,
    fontSize: '0.75rem',
    color: '#6b7280',
    marginBottom: '0.25rem',
    textTransform: 'uppercase' as const,
  } as React.CSSProperties,
  recordValue: {
    fontSize: '0.9375rem',
    wordBreak: 'break-all' as const,
    background: '#f9fafb',
    padding: '0.5rem 0.75rem',
    borderRadius: '6px',
    fontFamily: 'monospace',
  } as React.CSSProperties,
  loadingOverlay: {
    position: 'absolute' as const,
    inset: 0,
    background: 'rgba(255, 255, 255, 0.8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '12px',
  } as React.CSSProperties,
};

export function DatabaseExplorerPage() {
  const [tables, setTables] = useState<DatabaseTable[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [records, setRecords] = useState<Record<string, unknown>[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<Record<string, unknown> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingRecords, setIsLoadingRecords] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string; order: 'asc' | 'desc' }>({
    key: 'createdAt',
    order: 'desc',
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [showRecordModal, setShowRecordModal] = useState(false);

  // Fetch tables on mount
  useEffect(() => {
    async function fetchTables() {
      try {
        setIsLoading(true);
        const data = await getDatabaseTables();
        setTables(data);
        if (data.length > 0) {
          setSelectedTable(data[0].name);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load tables');
      } finally {
        setIsLoading(false);
      }
    }
    fetchTables();
  }, []);

  // Fetch records when table changes
  const fetchRecords = useCallback(async () => {
    if (!selectedTable) return;

    try {
      setIsLoadingRecords(true);
      const params: RecordQueryParams = {
        page: pagination.page,
        limit: pagination.limit,
        sortBy: sortConfig.key,
        sortOrder: sortConfig.order,
      };
      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }

      const result = await getTableRecords(selectedTable, params);
      setRecords(result.data);
      setPagination((prev) => ({
        ...prev,
        total: result.meta.total,
        totalPages: result.meta.totalPages,
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load records');
    } finally {
      setIsLoadingRecords(false);
    }
  }, [selectedTable, pagination.page, pagination.limit, sortConfig, searchQuery]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  // Handle table selection
  const handleTableSelect = (tableName: string) => {
    setSelectedTable(tableName);
    setPagination((prev) => ({ ...prev, page: 1 }));
    setSearchQuery('');
    setSortConfig({ key: 'createdAt', order: 'desc' });
  };

  // Handle sorting
  const handleSort = (columnKey: string) => {
    setSortConfig((prev) => ({
      key: columnKey,
      order: prev.key === columnKey && prev.order === 'asc' ? 'desc' : 'asc',
    }));
  };

  // Handle search
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  // Handle row click
  const handleRowClick = async (record: Record<string, unknown>) => {
    if (!selectedTable || !record.id) return;

    try {
      const fullRecord = await getTableRecord(selectedTable, record.id as string);
      setSelectedRecord(fullRecord);
      setShowRecordModal(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load record details');
    }
  };

  // Get columns for selected table
  const columns = records.length > 0 ? Object.keys(records[0]) : [];

  if (isLoading) {
    return (
      <div style={{ padding: '2rem' }}>
        <div style={{ marginBottom: '2rem' }}>
          <Skeleton height={40} width={300} />
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <div style={{ width: '280px' }}>
            <Skeleton height={400} />
          </div>
          <div style={{ flex: 1 }}>
            <Skeleton height={400} />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '2rem' }}>
        <h1 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Database Explorer</h1>
        <div
          style={{
            background: '#fee2e2',
            color: '#b91c1c',
            padding: '1rem',
            borderRadius: '8px',
          }}
        >
          Error: {error}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ padding: '1rem 1rem 0' }}>
        <h1 style={{ fontSize: '1.5rem', margin: 0 }}>Database Explorer</h1>
        <p style={{ color: '#6b7280', marginTop: '0.25rem', marginBottom: 0 }}>
          Browse and inspect database tables (read-only)
        </p>
      </div>

      <div style={dbExplorerStyles.container}>
        {/* Sidebar - Table List */}
        <div style={dbExplorerStyles.sidebar}>
          <div style={dbExplorerStyles.sidebarTitle}>Tables ({tables.length})</div>
          {tables.map((table) => (
            <div
              key={table.name}
              style={{
                ...dbExplorerStyles.tableItem,
                ...(selectedTable === table.name ? dbExplorerStyles.tableItemSelected : {}),
              }}
              onClick={() => handleTableSelect(table.name)}
              onMouseEnter={(e) => {
                if (selectedTable !== table.name) {
                  e.currentTarget.style.background = '#f3f4f6';
                }
              }}
              onMouseLeave={(e) => {
                if (selectedTable !== table.name) {
                  e.currentTarget.style.background = 'transparent';
                }
              }}
            >
              <span style={dbExplorerStyles.tableIcon}>{getTableIcon(table.name)}</span>
              <div style={dbExplorerStyles.tableInfo}>
                <div style={dbExplorerStyles.tableName}>{table.displayName}</div>
                <div style={dbExplorerStyles.tableCount}>
                  {table.recordCount.toLocaleString()} records
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Main Content - Records Grid */}
        <div style={dbExplorerStyles.main}>
          {/* Toolbar */}
          <div style={dbExplorerStyles.toolbar}>
            <input
              type="text"
              placeholder="Search records..."
              value={searchQuery}
              onChange={handleSearch}
              style={dbExplorerStyles.searchInput}
            />
            <button
              onClick={() => fetchRecords()}
              style={{
                ...dbExplorerStyles.pageButton,
                background: '#3b82f6',
                color: '#fff',
                border: 'none',
              }}
            >
              Refresh
            </button>
          </div>

          {/* Table Container */}
          <div style={{ ...dbExplorerStyles.tableContainer, position: 'relative' }}>
            {isLoadingRecords && (
              <div style={dbExplorerStyles.loadingOverlay}>
                <Skeleton height={24} width={120} />
              </div>
            )}

            {records.length === 0 ? (
              <div style={dbExplorerStyles.emptyState}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>
                  {getTableIcon(selectedTable || '')}
                </div>
                <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>No Records Found</h2>
                <p>This table is empty or no records match your search.</p>
              </div>
            ) : (
              <>
                <div style={{ overflowX: 'auto' }}>
                  <table style={dbExplorerStyles.table}>
                    <thead>
                      <tr>
                        {columns.map((col) => (
                          <th
                            key={col}
                            style={dbExplorerStyles.th}
                            onClick={() => handleSort(col)}
                          >
                            {col}
                            {sortConfig.key === col && (
                              <span style={{ marginLeft: '0.5rem' }}>
                                {sortConfig.order === 'asc' ? '↑' : '↓'}
                              </span>
                            )}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {records.map((record, idx) => (
                        <tr
                          key={(record.id as string) || idx}
                          style={dbExplorerStyles.tr}
                          onClick={() => handleRowClick(record)}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#f9fafb';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                          }}
                        >
                          {columns.map((col) => (
                            <td key={col} style={dbExplorerStyles.td} title={String(record[col] ?? '')}>
                              {formatCellValue(record[col])}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div style={dbExplorerStyles.pagination}>
                  <div style={dbExplorerStyles.paginationInfo}>
                    Showing {(pagination.page - 1) * pagination.limit + 1} -{' '}
                    {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                    {pagination.total.toLocaleString()} records
                  </div>
                  <div style={dbExplorerStyles.paginationButtons}>
                    <button
                      style={{
                        ...dbExplorerStyles.pageButton,
                        ...(pagination.page === 1 ? dbExplorerStyles.pageButtonDisabled : {}),
                      }}
                      disabled={pagination.page === 1}
                      onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
                    >
                      Previous
                    </button>
                    <span style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}>
                      Page {pagination.page} of {pagination.totalPages}
                    </span>
                    <button
                      style={{
                        ...dbExplorerStyles.pageButton,
                        ...(pagination.page >= pagination.totalPages
                          ? dbExplorerStyles.pageButtonDisabled
                          : {}),
                      }}
                      disabled={pagination.page >= pagination.totalPages}
                      onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                    >
                      Next
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Record Detail Modal */}
      {showRecordModal && selectedRecord && (
        <Modal
          isOpen={showRecordModal}
          onClose={() => {
            setShowRecordModal(false);
            setSelectedRecord(null);
          }}
          title={`Record Details - ${selectedRecord.id || 'Unknown'}`}
size="lg"
        >
          <div style={dbExplorerStyles.recordDetail}>
            {Object.entries(selectedRecord).map(([key, value]) => (
              <div key={key} style={dbExplorerStyles.recordField}>
                <div style={dbExplorerStyles.recordLabel}>{key}</div>
                <div style={dbExplorerStyles.recordValue}>
                  {typeof value === 'object' && value !== null
                    ? JSON.stringify(value, null, 2)
                    : value === null || value === undefined
                      ? '-'
                      : String(value)}
                </div>
              </div>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}

export default { AdminDashboardPage, UsersPage, LeadQueuePage, ProjectsTablePage, ClientsTablePage, DatabaseExplorerPage };
