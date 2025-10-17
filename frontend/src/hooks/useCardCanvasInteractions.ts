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
  const dragStartCardId = useRef<string | null>(null);
  const dragStartPos = useRef<{ left: number; top: number } | null>(null);
  const dragStartMap = useRef<Record<string, { left: number; top: number }>>({});

  // Zoom helpers
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

    // --- Selection visuals ----------------------------------------------------

    // Show marquee while dragging to select
    canvas.selection = true;
    canvas.selectionColor = 'rgba(128,128,128,0.15)';
    canvas.selectionBorderColor = '#808080';
    canvas.selectionLineWidth = 1;

    // Default per-object selection look
    fabric.Object.prototype.borderColor = '#808080';
    fabric.Object.prototype.cornerColor = '#808080';

    // Hide ONLY the group outline for multi-select
    (fabric.ActiveSelection as any).prototype._renderControls = () => {};
    (fabric.ActiveSelection as any).prototype._renderBorders = () => {};

    // We will draw small boxes for each object in a multi-select on the top layer.
    // Fabric clears the top layer before/after render, so we hook both events.
    const getTopCtx = (): CanvasRenderingContext2D | null => {
      // v5/v6 compatibility
      return (
        (canvas as any).getSelectionContext?.() ||
        (canvas as any).contextTop ||
        (canvas as any).upperCanvasEl?.getContext?.('2d') ||
        null
      );
    };

    // Clear top context every frame so our custom boxes don’t stack
    const clearTop = () => {
      const ctx = getTopCtx();
      const el: HTMLCanvasElement | undefined = (canvas as any).upperCanvasEl;
      if (ctx && el) {
        ctx.clearRect(0, 0, el.width, el.height);
      }
    };

    // Draw per-object selection boxes when multiple are selected
    const drawIndividualSelectionBoxes = () => {
      const active = canvas.getActiveObject() as any;
      if (!active || active.type !== 'activeSelection') return;

      const ctx = getTopCtx();
      const el: HTMLCanvasElement | undefined = (canvas as any).upperCanvasEl;
      if (!ctx || !el) return;

      // Style
      ctx.save();
      ctx.lineWidth = 1;
      ctx.strokeStyle = '#808080';
      ctx.setLineDash([4, 4]);

      const objects: any[] = Array.isArray(active._objects) ? active._objects : [];
      for (const obj of objects) {
        // get axis-aligned bounding rect in canvas coordinates
        const rect = obj.getBoundingRect(true, true);
        ctx.strokeRect(rect.left, rect.top, rect.width, rect.height);
      }

      ctx.restore();
    };

    canvas.on('before:render', clearTop);
    canvas.on('after:render', drawIndividualSelectionBoxes);

    // --- Keyboard + pan/zoom --------------------------------------------------

    const isTypingTarget = (el: EventTarget | null): boolean => {
      const t = el as HTMLElement | null;
      if (!t) return false;
      const tag = (t.tagName || '').toLowerCase();
      return tag === 'input' || tag === 'textarea' || (t as HTMLElement).isContentEditable === true;
    };

    const keydown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        if (isTypingTarget(e.target)) return;
        spaceDown.current = true;
        e.preventDefault();
      }
    };
    const keyup = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        if (isTypingTarget(e.target)) return;
        spaceDown.current = false;
      }
    };

    // Scroll-to-zoom
    const handleWheel = (opt: TPointerEventInfo<WheelEvent>) => {
      const event = opt.e;
      event.preventDefault();
      const delta = event.deltaY;
      const z = canvas.getZoom();
      const newZoom = z * (delta > 0 ? 0.9 : 1.1);
      const clampedZoom = Math.min(Math.max(newZoom, 0.2), 4);
      const pointer = canvas.getPointer(event as any);
      canvas.zoomToPoint(new Point(pointer.x, pointer.y), clampedZoom);
    };

    // Mouse down: start panning or record drag start
    const handleMouseDown = (opt: TPointerEventInfo<TPointerEvent>) => {
      const event = opt.e as MouseEvent;
      const target = (opt as any).target as fabric.Object | undefined;

      dragStartMap.current = {};
      const maybeGroup = target as (fabric.Group & { cardId?: string }) | undefined;

      if ((target as any)?.type === 'activeSelection') {
        const sel = target as any;
        const objs: any[] = Array.isArray(sel?._objects) ? sel._objects : [];
        objs.forEach((o: any) => {
          const id = (o as any)?.cardId;
          if (id) dragStartMap.current[id] = { left: o.left ?? 0, top: o.top ?? 0 };
        });
        dragStartCardId.current = null;
        dragStartPos.current = null;
      } else if (maybeGroup && (maybeGroup as any).cardId) {
        dragStartCardId.current = (maybeGroup as any).cardId ?? null;
        dragStartPos.current = { left: maybeGroup.left ?? 0, top: maybeGroup.top ?? 0 };
        if (dragStartCardId.current) {
          dragStartMap.current[dragStartCardId.current] = { ...dragStartPos.current };
        }
      } else {
        dragStartCardId.current = null;
        dragStartPos.current = null;
      }

      // Pan with middle/right mouse or space/shift + left
      const leftWithModifier = event.button === 0 && (event.shiftKey || spaceDown.current);
      const middleOrRight = event.button === 1 || event.button === 2 || event.buttons === 4;

      if (middleOrRight || leftWithModifier) {
        isPanning.current = true;
        lastPos.current = { x: event.clientX, y: event.clientY };
        canvas.setCursor('grab');
        canvas.selection = false; // temporarily disable marquee during pan
        event.preventDefault();
        event.stopPropagation();
      }
    };

    // Mouse move: panning
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

    // Mouse up: stop panning and persist positions
    const handleMouseUp = () => {
      if (isPanning.current) {
        isPanning.current = false;
        lastPos.current = null;
        canvas.setCursor('default');
        canvas.selection = true; // re-enable marquee
      }

      const obj = canvas.getActiveObject() as any;
      const token = localStorage.getItem('learnableToken');
      if (!token) {
        dragStartMap.current = {};
        return;
      }

      const persistMove = (gid: string, group: any) => {
        const numId = Number(gid);
        if (!Number.isFinite(numId)) return Promise.resolve();
        let curLeft = group.left ?? 0;
        let curTop = group.top ?? 0;
        try {
          const rect = group.getBoundingRect?.(true, true);
          if (rect && typeof rect.left === 'number' && typeof rect.top === 'number') {
            curLeft = rect.left;
            curTop = rect.top;
          }
        } catch {}
        const payload: any = { x_pos: curLeft, y_pos: curTop };
        return fetch(`${apiBaseUrl}/api/graph/notes/${numId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload),
        }).then(async (res) => {
          if (!res.ok) console.error('Update failed:', await res.text());
        });
      };

      const ops: Promise<any>[] = [];
      const active = (canvas.getActiveObjects?.() || []) as any[];
      if (active.length > 0) {
        active.forEach((o) => {
          const id = (o as any)?.cardId;
          if (id) ops.push(persistMove(id, o));
        });
      } else if (obj) {
        const id = (obj as any)?.cardId as string | undefined;
        if (id) ops.push(persistMove(id, obj));
      }

      dragStartCardId.current = null;
      dragStartPos.current = null;
      dragStartMap.current = {};
      Promise.allSettled(ops).catch(() => void 0);
    };

    // Persist after transforms
    const handleObjectModified = (opt: any) => {
      const target = opt?.target as any;
      const token = localStorage.getItem('learnableToken');
      if (!token || !target) return;

      const persist = (gid: string, obj: any) => {
        let x = obj.left ?? 0, y = obj.top ?? 0;
        try {
          const rect = obj.getBoundingRect?.(true, true);
          if (rect && typeof rect.left === 'number' && typeof rect.top === 'number') {
            x = rect.left; y = rect.top;
          }
        } catch {}
        const payload = { x_pos: x, y_pos: y } as any;
        fetch(`${apiBaseUrl}/api/graph/notes/${gid}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload),
        }).catch(() => void 0);
      };

      if (target.type === 'activeSelection') {
        const objs: any[] = Array.isArray(target._objects) ? target._objects : [];
        objs.forEach((o) => { const id = (o as any)?.cardId; if (id) persist(id, o); });
      } else {
        const id = (target as any)?.cardId; if (id) persist(id, target);
      }
    };

    // Delete key
    const handleDelete = (e: KeyboardEvent) => {
      if (e.key === 'Delete') {
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

    // Listeners
    canvas.on('mouse:wheel', handleWheel);
    canvas.on('mouse:down', handleMouseDown);
    canvas.on('mouse:move', handleMouseMove);
    canvas.on('mouse:up', handleMouseUp);
    canvas.on('object:modified', handleObjectModified);
    canvas.on('before:render', clearTop);
    canvas.on('after:render', drawIndividualSelectionBoxes);

    try {
      (canvas as any).upperCanvasEl?.addEventListener('contextmenu', (e: Event) => e.preventDefault());
    } catch {}

    window.addEventListener('keydown', handleDelete);
    window.addEventListener('keydown', keydown, { passive: false });
    window.addEventListener('keyup', keyup);

    // Cleanup
    return () => {
      canvas.off('mouse:wheel', handleWheel);
      canvas.off('mouse:down', handleMouseDown);
      canvas.off('mouse:move', handleMouseMove);
      canvas.off('mouse:up', handleMouseUp);
      canvas.off('object:modified', handleObjectModified);
      canvas.off('before:render', clearTop);
      canvas.off('after:render', drawIndividualSelectionBoxes);
      window.removeEventListener('keydown', handleDelete);
      window.removeEventListener('keydown', keydown);
      window.removeEventListener('keyup', keyup);
    };
  }, [canvas, onDelete, onDeleteConnection]);

  return { zoom };
};
