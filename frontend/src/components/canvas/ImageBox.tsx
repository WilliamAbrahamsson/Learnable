import type { CanvasElement } from '@/types/api';
import { ElementHandles } from './ElementHandles';

type Props = {
  el: CanvasElement;
  style: React.CSSProperties;
  onMouseDownMove: (e: React.MouseEvent, id: number) => void;
  onResizeHandle: (e: React.MouseEvent, id: number, handle: 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'e' | 'w') => void;
  onRotateHandle?: (e: React.MouseEvent, id: number) => void;
  showControls?: boolean;
};

export const ImageBox = ({ el, style, onMouseDownMove, onResizeHandle, onRotateHandle, showControls }: Props) => {
  const url = (el.data as any)?.url || '';
  const cropScaleRaw = (el.data as any)?.cropScale;
  const cropScale: number | null = (cropScaleRaw === undefined || cropScaleRaw === null) ? null : Number(cropScaleRaw) || 1;
  const selectedCls = showControls ? 'outline outline-1 outline-[#1E52F1]' : 'hover:outline hover:outline-1 hover:outline-[#1E52F1]';
  const rotateCursor = "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'><path d='M12 5a7 7 0 1 1-4.95 2.05' stroke='%23C5C1BA' stroke-width='2' fill='none'/><path d='M7 3v4h4' stroke='%23C5C1BA' stroke-width='2' fill='none'/></svg>\") 12 12, auto";
  return (
    <div
      key={el.id}
      style={{ ...style, overflow: 'visible' }}
      className={`bg-[#1C1C1C] cursor-move relative select-none ${selectedCls}`}
      onMouseDown={(e) => onMouseDownMove(e, el.id)}
    >
      {/* Image content wrapped to allow handles to overflow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {url ? (
          <img
            src={url}
            alt=""
            draggable={false}
            className="select-none"
            style={cropScale ? {
              position: 'absolute',
              left: '50%',
              top: '50%',
              userSelect: 'none',
              WebkitUserSelect: 'none',
              WebkitUserDrag: 'none' as any,
              transform: `translate(-50%, -50%) scale(${cropScale})`,
              transformOrigin: 'center center',
              willChange: 'transform',
            } : {
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              userSelect: 'none',
              WebkitUserSelect: 'none',
              WebkitUserDrag: 'none' as any,
            }}
          />
        ) : (
          <div className="w-full h-full grid place-items-center text-[#76746F] text-xs">Image</div>
        )}
      </div>
      {/* Figma-like rotation: invisible edge zones trigger rotation */}
      {showControls && onRotateHandle && (
        <>
          <div
            className="absolute left-0 right-0 -top-2 h-2 z-10"
            style={{ cursor: rotateCursor }}
            onMouseDown={(e) => onRotateHandle(e as unknown as React.MouseEvent, el.id)}
          />
          <div
            className="absolute left-0 right-0 -bottom-2 h-2 z-10"
            style={{ cursor: rotateCursor }}
            onMouseDown={(e) => onRotateHandle(e as unknown as React.MouseEvent, el.id)}
          />
          <div
            className="absolute top-0 bottom-0 -left-2 w-2 z-10"
            style={{ cursor: rotateCursor }}
            onMouseDown={(e) => onRotateHandle(e as unknown as React.MouseEvent, el.id)}
          />
          <div
            className="absolute top-0 bottom-0 -right-2 w-2 z-10"
            style={{ cursor: rotateCursor }}
            onMouseDown={(e) => onRotateHandle(e as unknown as React.MouseEvent, el.id)}
          />
        </>
      )}
      {showControls && <ElementHandles id={el.id} onResizeHandle={onResizeHandle} />}
    </div>
  );
};
