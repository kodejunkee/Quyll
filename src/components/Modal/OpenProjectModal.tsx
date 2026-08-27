import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from './Modal';
import { useProjectStore } from '@/store/projectStore';
import { Dropdown } from '@/components/Dropdown/Dropdown';
import { ClockIcon, LayersIcon } from '@radix-ui/react-icons';
import './OpenProjectModal.css';

interface OpenProjectModalProps {
  open: boolean;
  onClose: () => void;
}

function formatTimeAgo(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) return `${diffInDays}d ago`;
  
  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) return `${diffInMonths}mo ago`;
  
  return `${Math.floor(diffInMonths / 12)}y ago`;
}

export function OpenProjectModal({ open, onClose }: OpenProjectModalProps) {
  const navigate = useNavigate();
  const { projects, openTab } = useProjectStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<'last_opened' | 'name' | 'date'>('last_opened');

  const filteredAndSortedProjects = useMemo(() => {
    let result = projects;
    
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        p => p.name.toLowerCase().includes(q) || 
             (p.genre && p.genre.join(', ').toLowerCase().includes(q)) ||
             (p.description && p.description.toLowerCase().includes(q))
      );
    }
    
    return result.sort((a, b) => {
      if (sortField === 'name') {
        return a.name.localeCompare(b.name);
      } else if (sortField === 'date') {
        const timeA = new Date(a.created_at || 0).getTime();
        const timeB = new Date(b.created_at || 0).getTime();
        return timeB - timeA;
      } else {
        const timeA = new Date(a.last_opened_at || a.updated_at || a.created_at || 0).getTime();
        const timeB = new Date(b.last_opened_at || b.updated_at || b.created_at || 0).getTime();
        return timeB - timeA;
      }
    });
  }, [projects, searchQuery, sortField]);

  const handleOpenProject = (project: any) => {
    const route = project.lastRoute || `/project/${project.id}/dashboard`;
    openTab(project, route);
    navigate(route);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Open Project" size="md">
      <div className="open-project-modal">
        <div className="open-project-modal__controls">
          <div className="open-project-modal__search-wrapper">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search projects..."
              className="open-project-modal__search-input"
            />
          </div>
          <div style={{ width: '160px' }}>
            <Dropdown
              value={sortField}
              onChange={(val) => setSortField(val as any)}
              options={[
                { value: 'last_opened', label: 'Last Opened' },
                { value: 'name', label: 'Name' },
                { value: 'date', label: 'Date Created' },
              ]}
            />
          </div>
        </div>

        <div className="open-project-modal__list">
          {filteredAndSortedProjects.length === 0 ? (
            <div className="open-project-modal__empty">
              <LayersIcon width={48} height={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
              <p>No projects found.</p>
            </div>
          ) : (
            filteredAndSortedProjects.map(project => (
              <div 
                key={project.id} 
                className="open-project-modal__item"
                onClick={() => handleOpenProject(project)}
              >
                <div className="open-project-modal__item-content">
                  <h4 className="open-project-modal__item-title">{project.name}</h4>
                  <p className="open-project-modal__item-genre">
                    {project.genre && project.genre.length > 0 ? project.genre.join(', ') : 'No genre'}
                  </p>
                </div>
                <div className="open-project-modal__item-meta">
                  <ClockIcon width={12} height={12} />
                  <span>
                    {project.last_opened_at ? formatTimeAgo(project.last_opened_at) : 'Not opened yet'}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </Modal>
  );
}
