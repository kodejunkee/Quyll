import { Sparkles, MessageSquare, Wand2, Lightbulb, User } from 'lucide-react';
import './AiPanel.css';

const AI_FEATURES = [
  { icon: User, label: 'Character Assistant', desc: 'Get help developing characters' },
  { icon: Wand2, label: 'Description Assistant', desc: 'Expand and refine descriptions' },
  { icon: MessageSquare, label: 'Dialogue Assistant', desc: 'Improve character dialogue' },
  { icon: Lightbulb, label: 'Brainstorm Assistant', desc: 'Generate ideas and inspiration' },
];

/** Placeholder AI panel showing upcoming features. */
export function AiPanel() {
  return (
    <div className="ai-panel">
      <div className="ai-panel__header">
        <Sparkles size={18} className="ai-panel__header-icon" />
        <span className="ai-panel__header-title">AI Features</span>
        <span className="ai-panel__header-badge">Coming Soon</span>
      </div>
      <div className="ai-panel__list">
        {AI_FEATURES.map(({ icon: Icon, label, desc }) => (
          <div key={label} className="ai-panel__feature">
            <Icon size={16} className="ai-panel__feature-icon" />
            <div className="ai-panel__feature-info">
              <span className="ai-panel__feature-label">{label}</span>
              <span className="ai-panel__feature-desc">{desc}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
