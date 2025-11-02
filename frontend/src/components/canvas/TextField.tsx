import type { CanvasElement } from '@/types/api';
import { ElementHandles } from './ElementHandles';
import { useEffect, useRef } from 'react';

type Props = {
  el: CanvasElement;
  style: React.CSSProperties;
  editingId: number | null;
  editingText: string;
  onStartEdit: (id: number) => void;
  onChange: (v: string) => void;
  onSave: () => void;
  onCancel: () => void;
  onMouseDownMove: (e: React.MouseEvent, id: number) => void;
  onResizeHandle: (e: React.MouseEvent, id: number, handle: 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'e' | 'w') => void;
  onRotateHandle?: (e: React.MouseEvent, id: number) => void;
  showControls?: boolean;
};

export const TextField = ({
  el,
  style,
  editingId,
  editingText,
  onStartEdit,
  onChange,
  onSave,
  onCancel,
  onMouseDownMove,
  onResizeHandle,
  onRotateHandle,
  showControls,
}: Props) => {
  const text = (el.data as any)?.text ?? 'Text';
  const fontSize = (el.data as any)?.fontSize ?? 16;
  const color = el.bgcolor || '#C5C1BA';
  const isEditing = editingId === el.id;
  const selectedCls = showControls ? 'outline outline-1 outline-[#1E52F1]' : 'hover:outline hover:outline-1 hover:outline-[#1E52F1]';
  const taRef = useRef<HTMLTextAreaElement | null>(null);
  const rotateCursor = "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'><path d='M12 5a7 7 0 1 1-4.95 2.05' stroke='%23C5C1BA' stroke-width='2' fill='none'/><path d='M7 3v4h4' stroke='%23C5C1BA' stroke-width='2' fill='none'/></svg>\") 12 12, auto";
  // Auto-size the textarea to eliminate scrollbars while editing
  useEffect(() => {
    if (!isEditing) return;
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${ta.scrollHeight}px`;
  }, [isEditing, editingText]);
  return (
    <div
      key={el.id}
      style={{ ...style, overflow: 'visible' }}
      className={`p-2 ${isEditing ? 'cursor-text' : 'cursor-move'} ${selectedCls}`}
      onMouseDown={(e) => {
        if ((e as any).detail > 1 || isEditing) return;
        onMouseDownMove(e, el.id);
      }}
      onDoubleClick={(e) => { e.stopPropagation(); onStartEdit(el.id); }}
    >
      {/* Figma-like rotation: invisible edge zones trigger rotation */}
      {showControls && onRotateHandle && !isEditing && (
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
      {isEditing ? (
        <textarea
          ref={taRef}
          autoFocus
          value={editingText}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onSave}
          onKeyDown={(e) => {
            if (e.key === 'Escape') { e.preventDefault(); onCancel(); }
          }}
          onMouseDown={(e) => { e.stopPropagation(); }}
          onClick={(e) => { e.stopPropagation(); }}
          style={{
            fontSize,
            color,
            width: '100%',
            height: 'auto',
            background: 'transparent',
            border: 'none',
            outline: 'none',
            resize: 'none',
            overflow: 'hidden',
            whiteSpace: 'pre-wrap',
          }}
        />
      ) : (
        <div style={{ fontSize, color, whiteSpace: 'pre-wrap' }}>{text}</div>
      )}
      {showControls && <ElementHandles id={el.id} onResizeHandle={onResizeHandle} />}
    </div>
  );
};
