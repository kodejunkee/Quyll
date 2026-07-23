import { Button } from '@/components';
import { type GrammarIssue } from '@/services/grammarService';
import { SpellCheck, CheckCircle2, AlertCircle, AlertTriangle, Sparkles, X, ChevronDown, ChevronUp } from 'lucide-react';
import './GrammarCheckerPanel.css';

interface GrammarCheckerPanelProps {
  isOpen: boolean;
  onToggle: () => void;
  issues: GrammarIssue[];
  isSelection: boolean;
  onApplySuggestion: (issue: GrammarIssue) => void;
  onLocateIssue: (issue: GrammarIssue) => void;
  onDismissIssue: (issueId: string) => void;
}

export function GrammarCheckerPanel({
  isOpen,
  onToggle,
  issues,
  isSelection,
  onApplySuggestion,
  onLocateIssue,
  onDismissIssue,
}: GrammarCheckerPanelProps) {

  const getBadgeClass = (severity: string) => {
    switch (severity) {
      case 'error':
        return 'grammar-panel__badge--error';
      case 'warning':
        return 'grammar-panel__badge--warning';
      default:
        return 'grammar-panel__badge--style';
    }
  };

  const getIcon = (severity: string) => {
    switch (severity) {
      case 'error':
        return <AlertCircle size={14} className="grammar-panel__icon--error" />;
      case 'warning':
        return <AlertTriangle size={14} className="grammar-panel__icon--warning" />;
      default:
        return <Sparkles size={14} className="grammar-panel__icon--style" />;
    }
  };

  return (
    <div className="grammar-panel-container">
      <button 
        className="grammar-panel__header" 
        onClick={onToggle}
        aria-expanded={isOpen}
      >
        <div className="grammar-panel__header-left">
          <SpellCheck size={15} />
          <span className="grammar-panel__header-title">Grammar Checker</span>
          {issues.length > 0 && (
            <span className="grammar-panel__header-badge">{issues.length}</span>
          )}
        </div>
        {isOpen ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
      </button>

      {isOpen && (
        <div className="grammar-panel__body">
          <div className="grammar-panel__meta-bar">
            <span className="grammar-panel__scope-note">
              {isSelection ? 'Checking selected text' : 'Scanning full chapter'}
            </span>
          </div>

          {issues.length === 0 ? (
            <div className="grammar-panel__empty">
              <CheckCircle2 size={36} className="grammar-panel__empty-icon" />
              <h4 className="grammar-panel__empty-title">All Clear!</h4>
              <p className="grammar-panel__empty-text">
                No issues found.
              </p>
            </div>
          ) : (
            <div className="grammar-panel__list">
              {issues.map((issue) => (
                <div key={issue.id} className="grammar-panel__item">
                  <div className="grammar-panel__item-top">
                    <div className="grammar-panel__badges">
                      {getIcon(issue.severity)}
                      <span className={`grammar-panel__badge ${getBadgeClass(issue.severity)}`}>
                        {issue.type.toUpperCase()}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="grammar-panel__dismiss-btn"
                      onClick={() => onDismissIssue(issue.id)}
                      title="Dismiss this suggestion"
                    >
                      <X size={14} />
                    </button>
                  </div>

                  <p className="grammar-panel__message">
                    <span className="grammar-panel__match-text">"{issue.matchText}"</span>
                    <span className="grammar-panel__message-text">{issue.message}</span>
                  </p>

                  <div className="grammar-panel__actions">
                    {issue.suggestion ? (
                      <button
                        type="button"
                        onClick={() => onApplySuggestion(issue)}
                        className="grammar-panel__action-btn grammar-panel__action-btn--apply"
                      >
                        Apply: {issue.suggestion}
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => onLocateIssue(issue)}
                      className="grammar-panel__action-btn"
                    >
                      Locate
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
