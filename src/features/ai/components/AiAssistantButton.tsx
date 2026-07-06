import { Sparkles } from 'lucide-react';
import { Button } from '@/components';
import './AiAssistantButton.css';

interface AiAssistantButtonProps {
  label?: string;
}

/** Disabled AI assistant button shown as "Coming Soon" placeholder. */
export function AiAssistantButton({ label = 'AI Assistant' }: AiAssistantButtonProps) {
  return (
    <div className="ai-assistant-btn">
      <Button variant="ghost" disabled>
        <Sparkles size={14} />
        {label}
      </Button>
      <span className="ai-assistant-btn__badge">Coming Soon</span>
    </div>
  );
}
