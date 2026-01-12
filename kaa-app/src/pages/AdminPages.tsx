/**
 * Admin Pages
 * Page components that wrap admin components with data fetching.
 * These will be connected to the API later.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminDashboard } from '../components/admin/AdminDashboard';
import { Skeleton, SkeletonStats, Modal } from '../components/common';
import {
  getDatabaseTables,
  getTableRecords,
  getTableRecord,
  formatCellValue,
  getTableIcon,
  type DatabaseTable,
  type RecordQueryParams,
} from '../api/adminApi';

// ============================================================================
// MOCK DATA
// ============================================================================

const MOCK_STATS = {
  leads: {
    total: 45,
    byStatus: { NEW: 12, QUALIFIED: 18, NEEDS_REVIEW: 5, CLOSED: 10 },
    thisMonth: 8,
    conversionRate: 33.3,
  },
  projects: {
    total: 28,
    active: 15,
    byTier: { 1: 8, 2: 12, 3: 6, 4: 2 },
    byStatus: { IN_PROGRESS: 15, COMPLETED: 10, ONBOARDING: 3 },
  },
  clients: {
    total: 22,
    active: 18,
    byTier: { 1: 8, 2: 9, 3: 4, 4: 1 },
  },
  revenue: {
    total: 125000,
    thisMonth: 18500,
    byTier: { 1: 15000, 2: 45000, 3: 55000, 4: 10000 },
  },
  recentActivity: [
    {
      id: 'act-1',
      type: 'lead_created',
      description: 'New lead from John Smith',
      timestamp: '2026-01-09T10:30:00Z',
    },
    {
      id: 'act-2',
      type: 'project_updated',
      description: 'Backyard Oasis milestone completed',
      timestamp: '2026-01-09T09:15:00Z',
    },
    {
      id: 'act-3',
      type: 'payment_received',
      description: 'Payment received from Jane Doe',
      timestamp: '2026-01-08T16:45:00Z',
    },
  ],
};


// ============================================================================
// ADMIN DASHBOARD PAGE
// ============================================================================

export function AdminDashboardPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = React.useState(true);
  const [stats, setStats] = React.useState(MOCK_STATS);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500);
    return () => clearTimeout(timer);
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
    <AdminDashboard
      stats={stats}
      onNavigate={handleNavigate}
    />
  );
}

// ============================================================================
// LEAD QUEUE PAGE
// Simplified placeholder - will be connected to API
// ============================================================================

export function LeadQueuePage() {
  return (
    <div style={{ padding: '2rem' }}>
      <h1 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Lead Management</h1>
      <div style={{ 
        background: '#f3f4f6', 
        borderRadius: '12px', 
        padding: '3rem', 
        textAlign: 'center' 
      }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📋</div>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Coming Soon</h2>
        <p style={{ color: '#6b7280' }}>Lead management will be available when connected to the API.</p>
      </div>
    </div>
  );
}

// ============================================================================
// PROJECTS TABLE PAGE
// Simplified placeholder - will be connected to API
// ============================================================================

export function ProjectsTablePage() {
  return (
    <div style={{ padding: '2rem' }}>
      <h1 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Project Management</h1>
      <div style={{ 
        background: '#f3f4f6', 
        borderRadius: '12px', 
        padding: '3rem', 
        textAlign: 'center' 
      }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏗️</div>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Coming Soon</h2>
        <p style={{ color: '#6b7280' }}>Project management will be available when connected to the API.</p>
      </div>
    </div>
  );
}

// ============================================================================
// CLIENTS TABLE PAGE
// Simplified placeholder - will be connected to API
// ============================================================================

export function ClientsTablePage() {
  return (
    <div style={{ padding: '2rem' }}>
      <h1 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Client Management</h1>
      <div style={{ 
        background: '#f3f4f6', 
        borderRadius: '12px', 
        padding: '3rem', 
        textAlign: 'center' 
      }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>👥</div>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Coming Soon</h2>
        <p style={{ color: '#6b7280' }}>Client management will be available when connected to the API.</p>
      </div>
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
          size="large"
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

export default { AdminDashboardPage, LeadQueuePage, ProjectsTablePage, ClientsTablePage, DatabaseExplorerPage };
