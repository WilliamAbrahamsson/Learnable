type Handle = 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'e' | 'w';

type Props = {
  id: number;
  onResizeHandle: (e: React.MouseEvent, id: number, handle: Handle) => void;
};

export const ElementHandles = ({ id, onResizeHandle }: Props) => (
  <>
    <div
      className="absolute -top-1 -left-1 w-2 h-2 bg-[#C5C1BA] border border-[#1C1C1C] cursor-nwse-resize z-10"
      onMouseDown={(e) => onResizeHandle(e, id, 'nw')}
    />
    <div
      className="absolute -top-1 -right-1 w-2 h-2 bg-[#C5C1BA] border border-[#1C1C1C] cursor-nesw-resize z-10"
      onMouseDown={(e) => onResizeHandle(e, id, 'ne')}
    />
    <div
      className="absolute -bottom-1 -left-1 w-2 h-2 bg-[#C5C1BA] border border-[#1C1C1C] cursor-nesw-resize z-10"
      onMouseDown={(e) => onResizeHandle(e, id, 'sw')}
    />
    <div
      className="absolute -bottom-1 -right-1 w-2 h-2 bg-[#C5C1BA] border border-[#1C1C1C] cursor-nwse-resize z-10"
      onMouseDown={(e) => onResizeHandle(e, id, 'se')}
    />
    {/* Edge drag zones */}
    <div
      className="absolute left-3 right-3 -top-0.5 h-1 cursor-ns-resize z-10"
      onMouseDown={(e) => onResizeHandle(e, id, 'n')}
      style={{ background: 'transparent' }}
    />
    <div
      className="absolute left-3 right-3 -bottom-0.5 h-1 cursor-ns-resize z-10"
      onMouseDown={(e) => onResizeHandle(e, id, 's')}
      style={{ background: 'transparent' }}
    />
    <div
      className="absolute top-3 bottom-3 -left-0.5 w-1 cursor-ew-resize z-10"
      onMouseDown={(e) => onResizeHandle(e, id, 'w')}
      style={{ background: 'transparent' }}
    />
    <div
      className="absolute top-3 bottom-3 -right-0.5 w-1 cursor-ew-resize z-10"
      onMouseDown={(e) => onResizeHandle(e, id, 'e')}
      style={{ background: 'transparent' }}
    />
  </>
);
