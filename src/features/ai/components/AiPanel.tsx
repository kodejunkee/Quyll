import { Wand2 } from 'lucide-react';
import { MagicWandIcon, ChatBubbleIcon, LightningBoltIcon, PersonIcon } from '@radix-ui/react-icons';
import './AiPanel.css';

const AI_FEATURES = [
  { icon: PersonIcon, label: 'Character Assistant', desc: 'Get help developing characters' },
  { icon: Wand2, label: 'Description Assistant', desc: 'Expand and refine descriptions' },
  { icon: ChatBubbleIcon, label: 'Dialogue Assistant', desc: 'Improve character dialogue' },
  { icon: LightningBoltIcon, label: 'Brainstorm Assistant', desc: 'Generate ideas and inspiration' },
];

/** Placeholder AI panel showing upcoming features. */
export function AiPanel() {
  return (
    <div className="ai-panel">
      <div className="ai-panel__header">
        <MagicWandIcon width={18} height={18} className="ai-panel__header-icon" />
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
