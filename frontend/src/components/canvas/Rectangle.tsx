import type { CanvasElement } from '@/types/api';
import { ElementHandles } from './ElementHandles';

type Props = {
  el: CanvasElement;
  style: React.CSSProperties;
  onMouseDownMove: (e: React.MouseEvent, id: number) => void;
  onResizeHandle: (e: React.MouseEvent, id: number, handle: 'nw' | 'ne' | 'sw' | 'se') => void;
  onRotateHandle?: (e: React.MouseEvent, id: number) => void;
  showControls?: boolean;
};

export const Rectangle = ({ el, style, onMouseDownMove, onResizeHandle, onRotateHandle, showControls }: Props) => {
  const selectedCls = showControls ? 'outline outline-1 outline-[#1E52F1]' : 'hover:outline hover:outline-1 hover:outline-[#1E52F1]';
  const bg = el.bgcolor || '#FFFFFF';
  const rotateCursor = "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'><path d='M12 5a7 7 0 1 1-4.95 2.05' stroke='%23C5C1BA' stroke-width='2' fill='none'/><path d='M7 3v4h4' stroke='%23C5C1BA' stroke-width='2' fill='none'/></svg>\") 12 12, auto";
  return (
    <div
      key={el.id}
      style={{ ...style, backgroundColor: bg, overflow: 'visible' }}
      className={`shadow cursor-move ${selectedCls}`}
      onMouseDown={(e) => onMouseDownMove(e, el.id)}
    >
      {/* Figma-like rotation: invisible edge zones trigger rotation */}
      {showControls && onRotateHandle && (
        <>
          <div
            className="absolute left-0 right-0 -top-2 h-2"
            style={{ cursor: rotateCursor }}
            onMouseDown={(e) => onRotateHandle(e as unknown as React.MouseEvent, el.id)}
          />
          <div
            className="absolute left-0 right-0 -bottom-2 h-2"
            style={{ cursor: rotateCursor }}
            onMouseDown={(e) => onRotateHandle(e as unknown as React.MouseEvent, el.id)}
          />
          <div
            className="absolute top-0 bottom-0 -left-2 w-2"
            style={{ cursor: rotateCursor }}
            onMouseDown={(e) => onRotateHandle(e as unknown as React.MouseEvent, el.id)}
          />
          <div
            className="absolute top-0 bottom-0 -right-2 w-2"
            style={{ cursor: rotateCursor }}
            onMouseDown={(e) => onRotateHandle(e as unknown as React.MouseEvent, el.id)}
          />
        </>
      )}
      {showControls && <ElementHandles id={el.id} onResizeHandle={onResizeHandle} />}
    </div>
  );
};
