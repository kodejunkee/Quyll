import { Button } from '@/components';
import { type GrammarIssue } from '@/services/grammarService';
import { Wand2, CheckCircle2, AlertCircle, AlertTriangle, Sparkles, X } from 'lucide-react';
import './GrammarCheckModal.css';

interface GrammarCheckModalProps {
  isOpen: boolean;
  onClose: () => void;
  issues: GrammarIssue[];
  isSelection: boolean;
  onApplySuggestion: (issue: GrammarIssue) => void;
  onLocateIssue: (issue: GrammarIssue) => void;
  onDismissIssue: (issueId: string) => void;
}

export function GrammarCheckModal({
  isOpen,
  onClose,
  issues,
  isSelection,
  onApplySuggestion,
  onLocateIssue,
  onDismissIssue,
}: GrammarCheckModalProps) {
  if (!isOpen) return null;

  const getBadgeClass = (severity: string) => {
    switch (severity) {
      case 'error':
        return 'grammar-modal__badge--error';
      case 'warning':
        return 'grammar-modal__badge--warning';
      default:
        return 'grammar-modal__badge--style';
    }
  };

  const getIcon = (severity: string) => {
    switch (severity) {
      case 'error':
        return <AlertCircle size={14} className="grammar-modal__icon--error" />;
      case 'warning':
        return <AlertTriangle size={14} className="grammar-modal__icon--warning" />;
      default:
        return <Sparkles size={14} className="grammar-modal__icon--style" />;
    }
  };

  return (
    <div className="grammar-docked-container">
      <div className="grammar-docked-panel">
        <div className="grammar-docked__topbar">
          <div className="grammar-docked__title">
            <Wand2 size={16} />
            Grammar Check
          </div>
          <div className="grammar-docked__topbar-actions">
            <button type="button" className="grammar-docked__close-btn" onClick={onClose} aria-label="Close">
              <X size={18} />
            </button>
          </div>
        </div>
        <div className="grammar-panel__content grammar-panel__content--docked">
        <div className="grammar-modal__header-bar">
          <span className="grammar-modal__count-badge">
            <Wand2 size={14} />
            <span>{issues.length} {issues.length === 1 ? 'suggestion' : 'suggestions'} found</span>
          </span>
          <span className="grammar-modal__scope-note">
            {isSelection ? 'Checking selected text' : 'Scanning full chapter'}
          </span>
        </div>

        {issues.length === 0 ? (
          <div className="grammar-modal__empty">
            <CheckCircle2 size={52} className="grammar-modal__empty-icon" />
            <h3 className="grammar-modal__empty-title">All Clear!</h3>
            <p className="grammar-modal__empty-text">
              No grammatical errors or duplicate words were detected in {isSelection ? 'your selection' : 'this chapter'}. Great work!
            </p>
            <div className="grammar-modal__empty-action">
              <Button variant="secondary" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        ) : (
          <div className="grammar-modal__list">
            {issues.map((issue) => (
              <div key={issue.id} className={`grammar-modal__item grammar-modal__item--${issue.severity}`}>
                <div className="grammar-modal__item-top">
                  <div className="grammar-modal__badges">
                    {getIcon(issue.severity)}
                    <span className={`grammar-modal__badge ${getBadgeClass(issue.severity)}`}>
                      {issue.type.toUpperCase()}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="grammar-modal__dismiss-btn"
                    onClick={() => onDismissIssue(issue.id)}
                    title="Dismiss this suggestion"
                  >
                    <X size={15} />
                  </button>
                </div>

                <div className="grammar-modal__match-box">
                  <span className="grammar-modal__match-label">Found:</span>
                  <span className="grammar-modal__match-text">"{issue.matchText}"</span>
                </div>

                <p className="grammar-modal__message">{issue.message}</p>

                <div className="grammar-modal__actions">
                  {issue.suggestion ? (
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => onApplySuggestion(issue)}
                    >
                      Apply: "{issue.suggestion}"
                    </Button>
                  ) : null}
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => onLocateIssue(issue)}
                  >
                    Highlight in Editor
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="grammar-modal__footer">
          <Button variant="secondary" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
      </div>
    </div>
  );
}
