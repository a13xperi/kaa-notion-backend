import React, { useState } from 'react';
import { useProjectRevisions, useRevisionMutations, RevisionRequest as RevisionType } from '../hooks/useRevisions';
import './RevisionRequest.css';

interface RevisionRequestProps {
  projectId: string;
  milestoneId?: string;
  milestoneName?: string;
  userRole: 'CLIENT' | 'ADMIN' | 'TEAM';
  onSuccess?: () => void;
}

const RevisionRequest: React.FC<RevisionRequestProps> = ({
  projectId,
  milestoneId,
  milestoneName,
  userRole,
  onSuccess
}) => {
  const [showForm, setShowForm] = useState(false);
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM');
  const [response, setResponse] = useState('');
  const [selectedRevision, setSelectedRevision] = useState<string | null>(null);

  const isTeamOrAdmin = userRole === 'ADMIN' || userRole === 'TEAM';

  // Fetch revisions for the project
  const {
    revisions,
    isLoading,
    isError,
    refetch
  } = useProjectRevisions(projectId);

  const {
    createRevision,
    updateRevision,
    isCreating,
    isUpdating
  } = useRevisionMutations();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!milestoneId || !description.trim()) return;

    createRevision({
      milestoneId,
      data: {
        description: description.trim(),
        priority,
      }
    }, {
      onSuccess: () => {
        setDescription('');
        setPriority('MEDIUM');
        setShowForm(false);
        onSuccess?.();
      }
    });
  };

  const handleStatusUpdate = (revisionId: string, newStatus: 'IN_PROGRESS' | 'COMPLETED' | 'REJECTED') => {
    updateRevision({
      revisionId,
      data: {
        status: newStatus,
        response: response.trim() || undefined,
      }
    }, {
      onSuccess: () => {
        setResponse('');
        setSelectedRevision(null);
      }
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return '#f59e0b';
      case 'IN_PROGRESS': return '#3b82f6';
      case 'COMPLETED': return '#10b981';
      case 'REJECTED': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'HIGH': return '🔴';
      case 'MEDIUM': return '🟡';
      case 'LOW': return '🟢';
      default: return '⚪';
    }
  };

  if (isLoading) {
    return (
      <div className="revision-request">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading revisions...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="revision-request">
        <div className="error-state">
          <p>Failed to load revisions</p>
          <button onClick={() => refetch()} className="retry-btn">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="revision-request">
      <div className="revision-header">
        <h3>Revision Requests</h3>
        {milestoneId && !isTeamOrAdmin && (
          <button
            className="request-btn"
            onClick={() => setShowForm(!showForm)}
          >
            {showForm ? 'Cancel' : '+ Request Revision'}
          </button>
        )}
      </div>

      {/* New Revision Form */}
      {showForm && milestoneId && (
        <form className="revision-form" onSubmit={handleSubmit}>
          <div className="form-header">
            <h4>Request a Revision</h4>
            {milestoneName && <span className="milestone-name">for {milestoneName}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="description">What needs to be revised?</label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Please describe the changes you'd like to see..."
              rows={4}
              required
              minLength={10}
            />
          </div>

          <div className="form-group">
            <label htmlFor="priority">Priority</label>
            <select
              id="priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value as 'LOW' | 'MEDIUM' | 'HIGH')}
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
            </select>
          </div>

          <div className="form-actions">
            <button type="button" className="cancel-btn" onClick={() => setShowForm(false)}>
              Cancel
            </button>
            <button type="submit" className="submit-btn" disabled={isCreating}>
              {isCreating ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </form>
      )}

      {/* Revisions List */}
      <div className="revisions-list">
        {revisions.length === 0 ? (
          <div className="no-revisions">
            <div className="no-revisions-icon">📝</div>
            <h4>No revision requests</h4>
            <p>
              {isTeamOrAdmin
                ? 'No revision requests have been submitted for this project.'
                : 'Need changes? Request a revision for any completed milestone.'}
            </p>
          </div>
        ) : (
          revisions.map((revision: RevisionType) => (
            <div key={revision.id} className={`revision-card status-${revision.status.toLowerCase()}`}>
              <div className="revision-card-header">
                <div className="revision-info">
                  <span className="priority-icon">{getPriorityIcon(revision.priority)}</span>
                  <span className="milestone-tag">{revision.milestone?.name || 'Unknown Milestone'}</span>
                  <span
                    className="status-badge"
                    style={{ backgroundColor: getStatusColor(revision.status) }}
                  >
                    {revision.status.replace('_', ' ')}
                  </span>
                </div>
                <span className="revision-date">{formatDate(revision.createdAt)}</span>
              </div>

              <div className="revision-description">
                {revision.description}
              </div>

              <div className="revision-meta">
                <span className="requester">
                  Requested by: {revision.requestedBy.name}
                </span>
                {revision.resolvedAt && (
                  <span className="resolved-date">
                    Resolved: {formatDate(revision.resolvedAt)}
                  </span>
                )}
              </div>

              {revision.response && (
                <div className="revision-response">
                  <strong>Response:</strong> {revision.response}
                </div>
              )}

              {/* Team actions for pending/in-progress revisions */}
              {isTeamOrAdmin && (revision.status === 'PENDING' || revision.status === 'IN_PROGRESS') && (
                <div className="revision-actions">
                  {selectedRevision === revision.id ? (
                    <div className="action-form">
                      <textarea
                        value={response}
                        onChange={(e) => setResponse(e.target.value)}
                        placeholder="Add a response (optional)..."
                        rows={2}
                      />
                      <div className="action-buttons">
                        <button
                          className="action-btn cancel"
                          onClick={() => {
                            setSelectedRevision(null);
                            setResponse('');
                          }}
                        >
                          Cancel
                        </button>
                        {revision.status === 'PENDING' && (
                          <button
                            className="action-btn progress"
                            onClick={() => handleStatusUpdate(revision.id, 'IN_PROGRESS')}
                            disabled={isUpdating}
                          >
                            Start Work
                          </button>
                        )}
                        <button
                          className="action-btn complete"
                          onClick={() => handleStatusUpdate(revision.id, 'COMPLETED')}
                          disabled={isUpdating}
                        >
                          Complete
                        </button>
                        <button
                          className="action-btn reject"
                          onClick={() => handleStatusUpdate(revision.id, 'REJECTED')}
                          disabled={isUpdating}
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      className="manage-btn"
                      onClick={() => setSelectedRevision(revision.id)}
                    >
                      Manage
                    </button>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default RevisionRequest;
