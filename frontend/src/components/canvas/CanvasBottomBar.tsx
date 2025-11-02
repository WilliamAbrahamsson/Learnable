import { ZoomIn, ZoomOut, Crosshair, Square, Type, Slash } from 'lucide-react';

type Props = {
  rightOffsetPercent?: number;
  leftOffsetPx?: number;
  zoom: number; // 1 = 100%
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetView?: () => void;
  activeTool?: 'select' | 'rect' | 'text' | 'line';
  onToggleRect?: () => void;
  onToggleText?: () => void;
  onToggleLine?: () => void;
  canDelete?: boolean;
  onDeleteSelected?: () => void;
};

export const CanvasBottomBar = ({
  rightOffsetPercent = 0,
  leftOffsetPx = 0,
  zoom,
  onZoomIn,
  onZoomOut,
  onResetView,
  activeTool,
  onToggleRect,
  onToggleText,
  onToggleLine,
  canDelete,
  onDeleteSelected,
}: Props) => {
  const percent = Math.round(zoom * 100);
  return (
    <div className="absolute bottom-0 z-10" style={{ right: `${rightOffsetPercent}%`, left: `${leftOffsetPx}px` }}>
      <div className="relative h-12 bg-[#1C1C1C] flex items-center justify-center gap-2 px-3 border-t border-[#272725]">
        {/* Add element buttons */}
        {onToggleRect && (
          <button
            type="button"
            onClick={onToggleRect}
            className={`rounded-md px-2 py-1.5 text-sm inline-flex items-center gap-1 ${
              activeTool === 'rect' ? 'bg-[#1E52F1] text-white hover:bg-[#1E52F1]/90' : 'text-[#C5C1BA] hover:bg-[#272725]'
            }`}
            aria-label="Add rectangle"
          >
            <Square className="h-4 w-4" />
          </button>
        )}
        {onToggleText && (
          <button
            type="button"
            onClick={onToggleText}
            className={`rounded-md px-2 py-1.5 text-sm inline-flex items-center gap-1 ${
              activeTool === 'text' ? 'bg-[#1E52F1] text-white hover:bg-[#1E52F1]/90' : 'text-[#C5C1BA] hover:bg-[#272725]'
            }`}
            aria-label="Add text"
          >
            <Type className="h-4 w-4" />
          </button>
        )}
        {onToggleLine && (
          <button
            type="button"
            onClick={onToggleLine}
            className={`rounded-md px-2 py-1.5 text-sm inline-flex items-center gap-1 ${
              activeTool === 'line' ? 'bg-[#1E52F1] text-white hover:bg-[#1E52F1]/90' : 'text-[#C5C1BA] hover:bg-[#272725]'
            }`}
            aria-label="Add line"
            title="Line"
          >
            <Slash className="h-4 w-4" />
          </button>
        )}
        

        <div className="w-px h-5 bg-[#272725] mx-1" />
        <button
          type="button"
          onClick={onZoomOut}
          className="rounded-md px-2 py-1.5 text-sm text-[#C5C1BA] hover:bg-[#272725] inline-flex items-center gap-1"
          aria-label="Zoom out"
        >
          <ZoomOut className="h-4 w-4" />
        </button>
        <div className="text-xs text-[#C5C1BA] min-w-[46px] text-center select-none">{percent}%</div>
        <button
          type="button"
          onClick={onZoomIn}
          className="rounded-md px-2 py-1.5 text-sm text-[#C5C1BA] hover:bg-[#272725] inline-flex items-center gap-1"
          aria-label="Zoom in"
        >
          <ZoomIn className="h-4 w-4" />
        </button>
        {onResetView && (
          <button
            type="button"
            onClick={onResetView}
            className="ml-2 rounded-md px-2 py-1.5 text-sm text-[#C5C1BA] hover:bg-[#272725] inline-flex items-center gap-1"
            aria-label="Center view"
          >
            <Crosshair className="h-4 w-4" />
            Center
          </button>
        )}
      </div>
    </div>
  );
};
