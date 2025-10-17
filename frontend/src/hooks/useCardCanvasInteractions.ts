import { useCallback, useEffect, useRef } from 'react';
import { Canvas, Point, TPointerEventInfo, TPointerEvent } from 'fabric';
import * as fabric from 'fabric';

export const useCanvasInteractions = (
  canvas: Canvas | null,
  apiBaseUrl: string,
  onDelete: (id: string) => void,
  onDeleteConnection: (line: fabric.Line) => void
) => {
  const isPanning = useRef(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);
  const spaceDown = useRef(false);

    // 🔍 Manual zoom (for zoomIn/zoomOut buttons)
  const zoom = useCallback(
    (dir: 'in' | 'out') => {
      if (!canvas) return;
      const zoomFactor = 0.1;
      const currentZoom = canvas.getZoom();
      const newZoom = dir === 'in' ? currentZoom + zoomFactor : currentZoom - zoomFactor;
      const clampedZoom = Math.min(Math.max(newZoom, 0.2), 4);
      const center = canvas.getCenter();
      canvas.zoomToPoint(new Point(center.left, center.top), clampedZoom);
      canvas.requestRenderAll();
    },
    [canvas]
  );

  useEffect(() => {
    if (!canvas) return;

    // Track spacebar for panning with left mouse
    const isTypingTarget = (el: EventTarget | null): boolean => {
      const t = el as HTMLElement | null;
      if (!t) return false;
      const tag = (t.tagName || '').toLowerCase();
      return tag === 'input' || tag === 'textarea' || (t as HTMLElement).isContentEditable === true;
    };
    const keydown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        if (isTypingTarget(e.target)) return; // don't hijack spaces in inputs
        spaceDown.current = true;
        // prevent page scroll when space pressed over canvas
        e.preventDefault();
      }
    };
    const keyup = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        if (isTypingTarget(e.target)) return;
        spaceDown.current = false;
      }
    };

    // ✅ Scroll-to-zoom
    const handleWheel = (opt: TPointerEventInfo<WheelEvent>) => {
      const event = opt.e;
      event.preventDefault();
      const delta = event.deltaY;
      const zoom = canvas.getZoom();
      const newZoom = zoom * (delta > 0 ? 0.9 : 1.1);
      const clampedZoom = Math.min(Math.max(newZoom, 0.2), 4);
      const pointer = canvas.getPointer(event as any);
      canvas.zoomToPoint(new Point(pointer.x, pointer.y), clampedZoom);
    };

    // ✅ Mouse down for panning
    const handleMouseDown = (opt: TPointerEventInfo<TPointerEvent>) => {
      const event = opt.e as MouseEvent;
      const target = (opt as any).target as fabric.Object | undefined;

      // Allow panning when:
      // - Middle or right mouse button is pressed, OR
      // - Left click on empty canvas (no target), OR
      // - Left click with Shift/Space (legacy behavior still supported)
      const leftOnEmpty = event.button === 0 && !target;
      const leftWithModifier = event.button === 0 && (event.shiftKey || spaceDown.current);
      const middleOrRight = event.button === 1 || event.button === 2 || event.buttons === 4;

      if (middleOrRight || leftOnEmpty || leftWithModifier) {
        isPanning.current = true;
        lastPos.current = { x: event.clientX, y: event.clientY };
        canvas.setCursor('grab');
        // Disable object selection while panning
        canvas.selection = false;
        event.preventDefault();
        event.stopPropagation();
      }
    };

    // ✅ Mouse move for panning
    const handleMouseMove = (opt: TPointerEventInfo<TPointerEvent>) => {
      if (!isPanning.current || !lastPos.current) return;
      const event = opt.e as MouseEvent;
      const vpt = canvas.viewportTransform!;
      const dx = event.clientX - lastPos.current.x;
      const dy = event.clientY - lastPos.current.y;
      vpt[4] += dx;
      vpt[5] += dy;
      canvas.requestRenderAll();
      lastPos.current = { x: event.clientX, y: event.clientY };
    };

    // ✅ Mouse up to stop panning
    const handleMouseUp = () => {
      if (isPanning.current) {
        isPanning.current = false;
        lastPos.current = null;
        canvas.setCursor('default');
        canvas.selection = true;
      }

            const obj = canvas.getActiveObject();
            const id = (obj as any)?.cardId;
            if (id) {
                console.log("Mouse up");

                // ✅ Update position in DB
                const token = localStorage.getItem('learnableToken');
                const group = canvas.getActiveObject() as fabric.Group & { cardId?: string };

                if (group && token) {
                    fetch(`${apiBaseUrl}/api/graph/notes/${id}`, {
                        method: 'PATCH',
                        headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${token}`,
                        },
                        body: JSON.stringify({
                            x_pos: group.left,
                            y_pos: group.top,
                        }),
                    })
                        .then(async (res) => {
                            if (!res.ok) {
                                console.error('Position update failed:', await res.text());
                            } else {
                                console.log(`✅ Updated position for card ${id}`);
                            }
                        })
                        .catch((err) => console.error('Error updating card position:', err));
                }
            }
    };


        // ✅ Keyboard delete — removes from canvas and backend
        const handleDelete = (e: KeyboardEvent) => {
            if (e.key === 'Delete' || e.key === 'Backspace') {
        const obj = canvas.getActiveObject();
        if (!obj) return;
        const id = (obj as any)?.cardId;
        if (id) {
          onDelete(id);
          const token = localStorage.getItem('learnableToken');
          if (token) {
            fetch(`${apiBaseUrl}/api/graph/notes/${id}`, {
              method: 'DELETE',
              headers: { Authorization: `Bearer ${token}` },
            }).catch(() => void 0);
          }
          return;
        }

        if ((obj as any).type === 'line') {
          onDeleteConnection(obj as fabric.Line);
        }
        }
    };

    // Attach Fabric event listeners (Fabric 6 style)
    canvas.on('mouse:wheel', handleWheel);
    canvas.on('mouse:down', handleMouseDown);
    canvas.on('mouse:move', handleMouseMove);
    canvas.on('mouse:up', handleMouseUp);
    window.addEventListener('keydown', handleDelete);
    window.addEventListener('keydown', keydown, { passive: false });
    window.addEventListener('keyup', keyup);

    // Cleanup
    return () => {
      canvas.off('mouse:wheel', handleWheel);
      canvas.off('mouse:down', handleMouseDown);
      canvas.off('mouse:move', handleMouseMove);
      canvas.off('mouse:up', handleMouseUp);
      window.removeEventListener('keydown', handleDelete);
      window.removeEventListener('keydown', keydown);
      window.removeEventListener('keyup', keyup);
    };
  }, [canvas, onDelete, onDeleteConnection]);

  return { zoom };
};
