import { PanelLeftClose } from 'lucide-react';

type Props = {
  onHide?: () => void;
  canGroup: boolean;
  onCreateGroup?: () => void;
};

export function LayersHeader({ onHide, canGroup, onCreateGroup }: Props) {
  return (
    <>
      {/* Top bar (above Layers) with hide button */}
      <div className="h-8 border-b border-[#272725] flex items-center justify-end px-2">
        {onHide && (
          <button
            type="button"
            onClick={() => onHide()}
            aria-label="Hide sidebar"
            className="w-6 h-6 grid place-items-center hover:opacity-90"
            title="Hide sidebar"
          >
            <PanelLeftClose className="w-4 h-4 text-[#C5C1BA]" />
          </button>
        )}
      </div>
      {/* Layers header with actions */}
      <div className="h-8 px-3 flex items-center justify-between text-xs font-medium text-[#C5C1BA] border-b border-[#272725]">
        <span>Layers</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className={`px-2 py-0.5 rounded border ${canGroup ? 'border-[#2A2A28] text-[#C5C1BA] hover:bg-[#2A2A28]' : 'border-[#2A2A28]/40 text-[#76746F] cursor-not-allowed'}`}
            onClick={() => { if (canGroup && onCreateGroup) onCreateGroup(); }}
            title="Create group from selection"
          >
            Group
          </button>
        </div>
      </div>
    </>
  );
}

