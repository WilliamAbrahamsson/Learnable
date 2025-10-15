import { RefObject } from 'react';
import { ZoomIn, ZoomOut, Plus, Type, Image as ImageIcon } from 'lucide-react';

type CanvasToolbarProps = {
  rightOffsetPercent?: number;
  isMenuOpen: boolean;
  menuRef: RefObject<HTMLDivElement>;
  onToggleMenu: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onAddText: () => void;
  onAddImage: () => void;
};

export const CanvasToolbar = ({
  rightOffsetPercent = 0,
  isMenuOpen,
  menuRef,
  onToggleMenu,
  onZoomIn,
  onZoomOut,
  onAddText,
  onAddImage,
}: CanvasToolbarProps) => {
  return (
    <div
      className="pointer-events-none absolute bottom-6 left-0 z-10 flex flex-col items-center gap-3"
      style={{ right: `${rightOffsetPercent}%` }}
    >
      <div className="w-full flex justify-center">
      {isMenuOpen && (
        <div
          ref={menuRef}
          className="pointer-events-auto w-48 rounded-lg border border-[#3F3F3D] bg-[#1C1C1C]/95 p-2 shadow-xl backdrop-blur"
        >
          <button
            type="button"
            onClick={onAddText}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-[#C5C1BA] transition hover:bg-[#33332F]"
          >
            <Type className="h-4 w-4" />
            Text Card
          </button>
          <button
            type="button"
            onClick={onAddImage}
            className="mt-1 flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-[#C5C1BA] transition hover:bg-[#33332F]"
          >
            <ImageIcon className="h-4 w-4" />
            Image Card
          </button>
        </div>
      )}
      </div>

      <div className="pointer-events-auto mx-auto flex items-center gap-2 rounded-full border border-[#3F3F3D] bg-[#1C1C1C]/95 px-4 py-2 shadow-lg backdrop-blur">
        <button
          type="button"
          onClick={onZoomIn}
          className="flex h-10 w-10 items-center justify-center rounded-full text-[#C5C1BA] transition hover:bg-[#33332F]"
        >
          <ZoomIn className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={onZoomOut}
          className="flex h-10 w-10 items-center justify-center rounded-full text-[#C5C1BA] transition hover:bg-[#33332F]"
        >
          <ZoomOut className="h-5 w-5" />
        </button>
        <div className="h-6 w-px bg-[#3F3F3D]" />
        <button
          type="button"
          onClick={onToggleMenu}
          className="flex h-10 w-10 items-center justify-center rounded-full text-[#C5C1BA] transition hover:bg-[#33332F]"
          aria-expanded={isMenuOpen}
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
};
