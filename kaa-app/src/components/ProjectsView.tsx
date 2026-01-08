import React from 'react';
import NotionWorkspaceViewer from './NotionWorkspaceViewer';
import './ProjectsView.css';

interface ProjectsViewProps {
  clientAddress: string;
  refreshKey?: number;
}

/**
 * Projects View - Shows project plans, deliverables, and project-related documents
 * This is where clients can see everything that's working on their project
 */
const ProjectsView: React.FC<ProjectsViewProps> = ({ clientAddress, refreshKey = 0 }) => {
  return (
    <div className="projects-view">
      <div className="projects-view-header">
        <h2>📁 Projects</h2>
        <p className="projects-subtitle">View your project plans, deliverables, and project-related documents</p>
      </div>
      <div className="projects-view-content">
        <NotionWorkspaceViewer 
          key={refreshKey}
          clientMode={true}
          clientAddress={clientAddress}
        />
      </div>
    </div>
  );
};

export default ProjectsView;
