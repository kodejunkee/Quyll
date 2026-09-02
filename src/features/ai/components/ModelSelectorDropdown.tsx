import React, { useEffect } from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { useAiStore } from '@/store/aiStore';
import { ChevronDown, Cpu, Check } from 'lucide-react';
import { QuyllIcon } from '@/components/QuyllIcon';

export function ModelSelectorDropdown() {
  const { 
    installedModels, 
    activeModel, 
    setActiveModel, 
    fetchInstalledModels,
    isAiStarting
  } = useAiStore();

  useEffect(() => {
    fetchInstalledModels();
  }, [fetchInstalledModels]);

  const handleSetActive = async (filename: string) => {
    if (filename === activeModel) return;
    
    setActiveModel(filename);
    const state = useAiStore.getState();
    if (state.isAiActive || state.isAiStarting) {
      await state.stopEngine();
      // Wait for the old process to fully release the port
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    await useAiStore.getState().startEngine();
  };

  const displayName = activeModel 
    ? activeModel.replace('.gguf', '').replace('-it', '').replace('-Q4_K_M', '') 
    : 'Select Model';

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button 
          className="model-selector-trigger"
          title="Switch Active Language Model"
          disabled={isAiStarting}
        >
          <Cpu size={13} className="model-selector-icon" />
          <span className="model-selector-name">{displayName}</span>
          <ChevronDown size={12} className="model-selector-chevron" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content 
          className="model-selector-dropdown-content" 
          align="end" 
          sideOffset={6}
        >
          <div className="model-selector-header">
            <QuyllIcon size={12} />
            <span>Installed Engines</span>
          </div>

          {installedModels.length === 0 ? (
            <div className="model-selector-empty">
              No models installed. Download one in Settings.
            </div>
          ) : (
            <div className="model-selector-list">
              {installedModels.map(model => {
                const isSelected = model === activeModel;
                const cleanName = model.replace('.gguf', '');
                return (
                  <DropdownMenu.Item 
                    key={model}
                    className={`model-selector-item ${isSelected ? 'model-selector-item--selected' : ''}`}
                    onClick={() => handleSetActive(model)}
                  >
                    <div className="model-selector-item-info">
                      <span className="model-selector-item-name">{cleanName}</span>
                      {isSelected && <span className="model-selector-item-badge">Active</span>}
                    </div>
                    {isSelected && <Check size={14} className="model-selector-check" />}
                  </DropdownMenu.Item>
                );
              })}
            </div>
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
