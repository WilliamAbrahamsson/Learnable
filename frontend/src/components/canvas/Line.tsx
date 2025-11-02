import type { CanvasElement } from '@/types/api';

type Props = {
  el: CanvasElement;
  style: React.CSSProperties;
  onMouseDownMove: (e: React.MouseEvent, id: number) => void;
  onResizeStartHandle: (e: React.MouseEvent, id: number, which: 'start' | 'end') => void;
  showControls?: boolean;
};

export const Line = ({ el, style, onMouseDownMove, onResizeStartHandle, showControls }: Props) => {
  const selectedCls = '';
  const stroke = (el.data as any)?.color || '#C5C1BA';
  const strokeWidth = Number((el.data as any)?.stroke_width ?? 2);
  const arrowStart = Boolean((el.data as any)?.arrow_start);
  const arrowEnd = Boolean((el.data as any)?.arrow_end);

  const sx = Number(el.line_start_x ?? 0);
  const sy = Number(el.line_start_y ?? 0);
  const ex = Number(el.line_end_x ?? 0);
  const ey = Number(el.line_end_y ?? 0);
  const minX = Math.min(sx, ex);
  const minY = Math.min(sy, ey);
  const w = Math.max(1, Math.abs(ex - sx));
  const h = Math.max(1, Math.abs(ey - sy));
  const relSx = sx - minX;
  const relSy = sy - minY;
  const relEx = ex - minX;
  const relEy = ey - minY;

  const headMarkerId = `arrow-head-${el.id}`;

  return (
    <div
      key={el.id}
      style={{ ...style, left: minX, top: minY, width: w, height: h }}
      className={`bg-transparent cursor-move relative select-none ${selectedCls}`}
      onMouseDown={(e) => onMouseDownMove(e, el.id)}
    >
      <svg
        className="absolute inset-0"
        width={w}
        height={h}
        viewBox={`0 0 ${w} ${h}`}
        onMouseDown={(e) => onMouseDownMove(e as any, el.id)}
        style={{ overflow: 'visible' }}
      >
        <defs>
          {/* Single head marker used for both ends. auto-start-reverse flips at the start */}
          <marker id={headMarkerId} viewBox="0 0 12 12" markerWidth="16" markerHeight="16" refX="10" refY="6" orient="auto-start-reverse" markerUnits="userSpaceOnUse">
            <path d="M0,0 L10,6 L0,12 Z" fill={stroke} />
          </marker>
        </defs>
        <line
          x1={relSx}
          y1={relSy}
          x2={relEx}
          y2={relEy}
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          markerStart={arrowStart ? `url(#${headMarkerId})` : undefined}
          markerEnd={arrowEnd ? `url(#${headMarkerId})` : undefined}
        />
      </svg>
      {showControls && (
        <>
          <div
            className="absolute -translate-x-1 -translate-y-1 w-2 h-2 bg-[#C5C1BA] border border-[#1C1C1C] cursor-grab"
            style={{ left: relSx, top: relSy }}
            onMouseDown={(e) => { e.stopPropagation(); onResizeStartHandle(e, el.id, 'start'); }}
          />
          <div
            className="absolute -translate-x-1 -translate-y-1 w-2 h-2 bg-[#C5C1BA] border border-[#1C1C1C] cursor-grab"
            style={{ left: relEx, top: relEy }}
            onMouseDown={(e) => { e.stopPropagation(); onResizeStartHandle(e, el.id, 'end'); }}
          />
        </>
      )}
    </div>
  );
};
