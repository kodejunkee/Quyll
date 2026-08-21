
import { Button } from '@/components';
import { MagicWandIcon } from '@radix-ui/react-icons';
import './AiAssistantButton.css';

interface AiAssistantButtonProps {
  label?: string;
}

/** Disabled AI assistant button shown as "Coming Soon" placeholder. */
export function AiAssistantButton({ label = 'AI Assistant' }: AiAssistantButtonProps) {
  return (
    <div className="ai-assistant-btn">
      <Button variant="ghost" disabled>
        <MagicWandIcon width={14} height={14} />
        {label}
      </Button>
      <span className="ai-assistant-btn__badge">Coming Soon</span>
    </div>
  );
}
