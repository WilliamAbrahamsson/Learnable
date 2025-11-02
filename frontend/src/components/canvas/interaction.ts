import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CanvasElement } from '@/types/api';
import { CanvasAPI } from '@/lib/api';

type MovementArgs = {
  zoom: number;
  spacePressed: boolean;
  elements: CanvasElement[];
  setElements: React.Dispatch<React.SetStateAction<CanvasElement[]>>;
  onUpdate: (id: number, patch: Partial<CanvasElement>) => Promise<void>;
  worldFromClient: (cx: number, cy: number) => { x: number; y: number };
  selectedIds: number[];
};

export function useMovementControls({ zoom, spacePressed, elements, setElements, onUpdate, worldFromClient, selectedIds }: MovementArgs) {
  const [dragId, setDragId] = useState<number | null>(null);
  const startRef = useRef<{ x: number; y: number; ex: number; ey: number; w?: number; h?: number; rot?: number; ang0?: number; ratio?: number; cropScale0?: number } | null>(null);
  const [activeResize, setActiveResize] = useState<{ id: number; handle: 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'e' | 'w' } | null>(null);
  const [activeRotate, setActiveRotate] = useState<{ id: number } | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const ROTATE_CURSOR = "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'><path d='M12 5a7 7 0 1 1-4.95 2.05' stroke='%23C5C1BA' stroke-width='2' fill='none'/><path d='M7 3v4h4' stroke='%23C5C1BA' stroke-width='2' fill='none'/></svg>\") 12 12, auto";
  const dragIdsRef = useRef<number[] | null>(null);
  const dragStartMapRef = useRef<Map<number, { ex: number; ey: number }>>();
  const lineDragStartRef = useRef<Map<number, { sx: number; sy: number; ex: number; ey: number }>>();

  const cursorFor = (h: 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'e' | 'w') => {
    if (h === 'n' || h === 's') return 'ns-resize';
    if (h === 'e' || h === 'w') return 'ew-resize';
    return h === 'nw' || h === 'se' ? 'nwse-resize' : 'nesw-resize';
  };

  // Disable auto z-index changes during canvas interactions. Z-order is managed via the Layers sidebar only.
  const bringToFront = useCallback((_id: number) => {
    // no-op
    return;
  }, []);

  const onMouseDownElement = useCallback((e: React.MouseEvent, id: number) => {
    if (e.button !== 0) return; // left only
    if (spacePressed) return; // let canvas pan
    e.stopPropagation();
    const el = elements.find((x) => x.id === id);
    if (!el) return;
    setDragId(id);
    startRef.current = { x: e.clientX, y: e.clientY, ex: el.x || 0, ey: el.y || 0, w: el.width || 0, h: el.height || 0, rot: el.rotation || 0 };
    // Determine group to move: if clicked element is in selection, move all selected; else move only clicked
    const idsToMove = (selectedIds && selectedIds.includes(id)) ? selectedIds : [id];
    dragIdsRef.current = idsToMove.slice();
    const m = new Map<number, { ex: number; ey: number }>();
    const lm = new Map<number, { sx: number; sy: number; ex: number; ey: number }>();
    for (const tid of idsToMove) {
      const tel = elements.find((x) => x.id === tid);
      if (tel) {
        m.set(tid, { ex: tel.x || 0, ey: tel.y || 0 });
        if (tel.type === 'line') {
          lm.set(tid, {
            sx: Number(tel.line_start_x ?? 0),
            sy: Number(tel.line_start_y ?? 0),
            ex: Number(tel.line_end_x ?? 0),
            ey: Number(tel.line_end_y ?? 0),
          });
        }
      }
    }
    dragStartMapRef.current = m;
    lineDragStartRef.current = lm;
    bringToFront(id);
  }, [elements, spacePressed, bringToFront, selectedIds]);

  const onResizeHandle = useCallback((e: React.MouseEvent, id: number, handle: 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'e' | 'w') => {
    e.stopPropagation();
    if (e.button !== 0) return;
    const el = elements.find((x) => x.id === id);
    if (!el) return;
    const ratio = (el && (el.height || 0)) ? (el.width || 0) / (el.height || 1) : 1;
    const cropScale0 = Number(((el.data as any)?.cropScale) || 1);
    startRef.current = { x: e.clientX, y: e.clientY, ex: el.x || 0, ey: el.y || 0, w: el.width || 0, h: el.height || 0, ratio, cropScale0 };
    setActiveResize({ id, handle });
    bringToFront(id);
    setCursor(cursorFor(handle));
  }, [elements, bringToFront]);

  const didCropRef = useRef<boolean>(false);
  const onMouseMoveCanvas = useCallback((e: React.MouseEvent) => {
    if (!startRef.current) return;
    const dx = (e.clientX - startRef.current.x) / (zoom || 1);
    const dy = (e.clientY - startRef.current.y) / (zoom || 1);

    if (activeResize) {
      const { id, handle } = activeResize;
      let nx = startRef.current.ex || 0;
      let ny = startRef.current.ey || 0;
      let nw = startRef.current.w || 0;
      let nh = startRef.current.h || 0;
      const el = elements.find((x) => x.id === id);
      if (el && el.type === 'line') {
        const cur = worldFromClient(e.clientX, e.clientY);
        // Determine which endpoint is being dragged: map 'sw' -> start, 'ne' -> end
        const draggingStart = handle === 'sw';
        let sx = Number(el.line_start_x ?? 0);
        let sy = Number(el.line_start_y ?? 0);
        let ex = Number(el.line_end_x ?? 0);
        let ey = Number(el.line_end_y ?? 0);
        if (draggingStart) { sx = cur.x; sy = cur.y; } else { ex = cur.x; ey = cur.y; }
        const minX = Math.min(sx, ex);
        const minY = Math.min(sy, ey);
        const bw = Math.max(1, Math.abs(ex - sx));
        const bh = Math.max(1, Math.abs(ey - sy));
        setElements((prev) => prev.map((it) => (it.id === id ? {
          ...it,
          x: Math.round(minX),
          y: Math.round(minY),
          width: Math.round(bw),
          height: Math.round(bh),
          line_start_x: sx,
          line_start_y: sy,
          line_end_x: ex,
          line_end_y: ey,
        } : it)));
        return;
      }
      const isCorner = handle === 'se' || handle === 'ne' || handle === 'sw' || handle === 'nw';
      const keepRatio = isCorner && !e.shiftKey; // default lock aspect from corners unless Shift is held
      // When Ctrl is held while resizing any handle on an image, perform crop instead of frame resize
      const isCropping = !!e.ctrlKey && el && el.type === 'image';

      // Note: we handle cropping by adjusting both frame (nx,ny,nw,nh) and content scale to keep visible pixels constant
      const minW = 40;
      const minH = 40;
      if (handle === 'se') {
        nw = (startRef.current.w || 0) + dx;
        nh = (startRef.current.h || 0) + dy;
      } else if (handle === 'ne') {
        nw = (startRef.current.w || 0) + dx;
        nh = (startRef.current.h || 0) - dy;
        ny = (startRef.current.ey || 0) + ((startRef.current.h || 0) - nh);
      } else if (handle === 'sw') {
        nw = (startRef.current.w || 0) - dx;
        nh = (startRef.current.h || 0) + dy;
        nx = (startRef.current.ex || 0) + ((startRef.current.w || 0) - nw);
      } else if (handle === 'nw') {
        nw = (startRef.current.w || 0) - dx;
        nh = (startRef.current.h || 0) - dy;
        nx = (startRef.current.ex || 0) + ((startRef.current.w || 0) - nw);
        ny = (startRef.current.ey || 0) + ((startRef.current.h || 0) - nh);
      } else if (handle === 'e') {
        nw = Math.max(minW, (startRef.current.w || 0) + dx);
      } else if (handle === 'w') {
        nw = Math.max(minW, (startRef.current.w || 0) - dx);
        nx = (startRef.current.ex || 0) + ((startRef.current.w || 0) - nw);
      } else if (handle === 's') {
        nh = Math.max(minH, (startRef.current.h || 0) + dy);
      } else if (handle === 'n') {
        nh = Math.max(minH, (startRef.current.h || 0) - dy);
        ny = (startRef.current.ey || 0) + ((startRef.current.h || 0) - nh);
      }
      // Apply aspect ratio locking for corner handles if desired
      if (isCorner) {
        nw = Math.max(minW, nw);
        nh = Math.max(minH, nh);
        if (keepRatio) {
          const ratio = startRef.current.ratio || 1;
          const useWidth = Math.abs(dx) >= Math.abs(dy);
          if (useWidth) {
            nh = Math.max(minH, nw / ratio);
            if (handle === 'ne' || handle === 'nw') {
              ny = (startRef.current.ey || 0) + ((startRef.current.h || 0) - nh);
            }
            if (handle === 'nw' || handle === 'sw') {
              nx = (startRef.current.ex || 0) + ((startRef.current.w || 0) - nw);
            }
          } else {
            nw = Math.max(minW, nh * ratio);
            if (handle === 'nw' || handle === 'sw') {
              nx = (startRef.current.ex || 0) + ((startRef.current.w || 0) - nw);
            }
            if (handle === 'ne' || handle === 'nw') {
              ny = (startRef.current.ey || 0) + ((startRef.current.h || 0) - nh);
            }
          }
        } else {
          // Free resize with corners when Shift is held
          nw = Math.max(minW, nw);
          nh = Math.max(minH, nh);
        }
      } else {
        // Edge handles already set nw/nh above
        nw = Math.max(minW, nw);
        nh = Math.max(minH, nh);
      }
      // Round and apply
      nx = Math.round(nx); ny = Math.round(ny); nw = Math.round(nw); nh = Math.round(nh);
      if (isCropping && el) {
        const w0 = startRef.current.w || 1;
        const h0 = startRef.current.h || 1;
        const baseScale = startRef.current.cropScale0 || 1;
        // Keep approximate on-screen content size constant using width ratio
        const scaleByW = baseScale * (w0 / Math.max(minW, nw));
        const scaleByH = baseScale * (h0 / Math.max(minH, nh));
        // Use the axis that dominates cover
        const nextScale = Math.max(0.25, Math.min(8, Math.max(scaleByW, scaleByH)));
        didCropRef.current = true;
        setElements((prev) => prev.map((it) => (
          it.id === id ? { ...it, x: nx, y: ny, width: nw, height: nh, data: { ...(it.data as any), cropScale: nextScale } } : it
        )));
      } else {
        setElements((prev) => prev.map((el) => (el.id === id ? { ...el, x: nx, y: ny, width: nw, height: nh } : el)));
      }
      return;
    }

    if (activeRotate) {
      const el = elements.find((x) => x.id === activeRotate.id);
      if (!el) return;
      const center = { x: (el.x || 0) + (el.width || 0) / 2, y: (el.y || 0) + (el.height || 0) / 2 };
      const cur = worldFromClient(e.clientX, e.clientY);
      const ang = Math.atan2(cur.y - center.y, cur.x - center.x);
      let ang0 = startRef.current!.ang0;
      if (ang0 === undefined) {
        const p0 = worldFromClient(startRef.current!.x, startRef.current!.y);
        ang0 = Math.atan2(p0.y - center.y, p0.x - center.x);
        startRef.current!.ang0 = ang0;
      }
      const deltaDeg = (ang - (ang0 as number)) * (180 / Math.PI);
      const rot0 = startRef.current!.rot || 0;
      const rot = Math.round(rot0 + deltaDeg);
      setElements((prev) => prev.map((it) => (it.id === el.id ? { ...it, rotation: rot } : it)));
      setCursor(ROTATE_CURSOR);
      return;
    }

    if (dragId && dragStartMapRef.current && dragIdsRef.current) {
      const updates = new Map<number, { x: number; y: number }>();
      for (const tid of dragIdsRef.current) {
        const st = dragStartMapRef.current.get(tid);
        if (!st) continue;
        const nx = Math.round(st.ex + dx);
        const ny = Math.round(st.ey + dy);
        updates.set(tid, { x: nx, y: ny });
      }
      setElements((prev) => prev.map((el) => {
        if (!updates.has(el.id)) return el;
        const next = { ...el, ...updates.get(el.id)! } as any;
        if (el.type === 'line' && lineDragStartRef.current) {
          const lst = lineDragStartRef.current.get(el.id);
          if (lst) {
            next.line_start_x = Math.round(lst.sx + dx);
            next.line_start_y = Math.round(lst.sy + dy);
            next.line_end_x = Math.round(lst.ex + dx);
            next.line_end_y = Math.round(lst.ey + dy);
          }
        }
        return next;
      }));
    }
  }, [activeResize, activeRotate, dragId, zoom, setElements, elements, worldFromClient]);

  const onMouseUpCanvas = useCallback(async () => {
    if (!startRef.current) return;
    if (activeResize) {
      const { id } = activeResize;
      setActiveResize(null);
      setCursor(null);
      const current = elements.find((e) => e.id === id);
      startRef.current = null;
      if (!current) return;
      if (current.type === 'line') {
        const patch: any = {
          x: current.x,
          y: current.y,
          width: current.width,
          height: current.height,
          line_start_x: current.line_start_x,
          line_start_y: current.line_start_y,
          line_end_x: current.line_end_x,
          line_end_y: current.line_end_y,
        };
        try { await onUpdate(id, patch); } catch {}
        return;
      }
      if (didCropRef.current) {
        didCropRef.current = false;
        try { await onUpdate(id, { x: current.x, y: current.y, width: current.width, height: current.height, data: current.data as any }); } catch {}
        return;
      }
      try { await onUpdate(id, { x: current.x, y: current.y, width: current.width, height: current.height }); } catch {}
      return;
    }
    if (activeRotate) {
      const id = activeRotate.id;
      setActiveRotate(null);
      setCursor(null);
      const current = elements.find((e) => e.id === id);
      startRef.current = null;
      if (!current) return;
      try { await onUpdate(id, { rotation: current.rotation }); } catch {}
      return;
    }
    if (dragId) {
      const ids = dragIdsRef.current || [dragId];
      const curMap = new Map<number, CanvasElement>();
      for (const id of ids) {
        const found = elements.find((e) => e.id === id);
        if (found) curMap.set(id, found);
      }
      setDragId(null);
      startRef.current = null;
      dragIdsRef.current = null;
      dragStartMapRef.current = undefined;
      // Persist all moved
      for (const [id, cur] of curMap.entries()) {
        const patch: any = { x: cur.x, y: cur.y };
        if (cur.type === 'line') {
          patch.line_start_x = cur.line_start_x;
          patch.line_start_y = cur.line_start_y;
          patch.line_end_x = cur.line_end_x;
          patch.line_end_y = cur.line_end_y;
        }
        try { await onUpdate(id, patch); } catch {}
      }
    }
  }, [activeResize, activeRotate, dragId, elements, onUpdate]);

  const onRotateHandle = useCallback((e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (e.button !== 0) return;
    const el = elements.find((x) => x.id === id);
    if (!el) return;
    startRef.current = { x: e.clientX, y: e.clientY, ex: el.x || 0, ey: el.y || 0, w: el.width || 0, h: el.height || 0, rot: el.rotation || 0 };
    setActiveRotate({ id });
    bringToFront(id);
    setCursor(ROTATE_CURSOR);
  }, [elements, bringToFront]);

  return { onMouseDownElement, onMouseMoveCanvas, onMouseUpCanvas, onResizeHandle, onRotateHandle, cursor };
}

type UseCanvasInteractionOptions = {
  containerRef: React.RefObject<HTMLDivElement>;
  parsedCanvasId: number | null;
};

export function useCanvasInteraction({ containerRef, parsedCanvasId }: UseCanvasInteractionOptions) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const panStartRef = useRef<{ x: number; y: number } | null>(null);
  const [spacePressed, setSpacePressed] = useState(false);
  const [elements, setElements] = useState<CanvasElement[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingText, setEditingText] = useState<string>('');
  // Keep the original text so cancel can revert optimistic updates
  const originalTextRef = useRef<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [activeTool, setActiveTool] = useState<'select' | 'rect' | 'text' | 'line'>('select');
  const [draft, setDraft] = useState<{ type: 'rect' | 'text' | 'line'; x: number; y: number; width: number; height: number } | null>(null);
  const [selectBox, setSelectBox] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const selectStartRef = useRef<{ x: number; y: number } | null>(null);
  const selectAdditiveRef = useRef<boolean>(false);

  const clampZoom = (z: number) => Math.min(3, Math.max(0.25, z));

  const zoomAtPoint = (delta: number, clientX: number, clientY: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const cx = (clientX - rect.left - pan.x);
    const cy = (clientY - rect.top - pan.y);
    const next = clampZoom(zoom * (delta > 0 ? 0.9 : 1.1));
    const k = next / zoom;
    const nextPan = { x: pan.x - (cx * (k - 1)), y: pan.y - (cy * (k - 1)) };
    setZoom(next);
    setPan(nextPan);
  };

  const tokenRef = useRef<string | null>(null);
  useEffect(() => { tokenRef.current = localStorage.getItem('learnableToken'); }, []);
  const persistCamera = useCallback(() => {
    const t = tokenRef.current || localStorage.getItem('learnableToken') || '';
    if (!t || !parsedCanvasId) return;
    void CanvasAPI.updateCanvas(t, parsedCanvasId, {
      camera_x: Math.round(pan.x),
      camera_y: Math.round(pan.y),
      camera_zoom_percentage: Math.round((zoom || 1) * 100),
    }).catch(() => {});
  }, [pan.x, pan.y, zoom, parsedCanvasId]);
  const selectedRef = useRef<number[] | null>(null);
  useEffect(() => { selectedRef.current = selectedIds; }, [selectedIds]);

  const worldFromClient = useCallback((cx: number, cy: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    const x = (cx - rect.left - pan.x) / (zoom || 1);
    const y = (cy - rect.top - pan.y) / (zoom || 1);
    return { x, y };
  }, [containerRef, pan, zoom]);

  const movement = useMovementControls({
    zoom,
    spacePressed,
    elements,
    setElements,
    onUpdate: async (id, patch) => {
      const t = tokenRef.current || localStorage.getItem('learnableToken') || '';
      if (!t) return;
      await CanvasAPI.updateElement(t, id, {
        x: patch.x,
        y: patch.y,
        width: patch.width,
        height: patch.height,
        rotation: patch.rotation,
        z_index: patch.z_index,
        data: patch.data as any,
      } as any);
    },
    worldFromClient,
    selectedIds,
  });

  // Load initial camera from canvas
  const cameraLoadedRef = useRef<boolean>(false);
  useEffect(() => {
    const loadCamera = async () => {
      cameraLoadedRef.current = false;
      if (!parsedCanvasId) return;
      const t = tokenRef.current || localStorage.getItem('learnableToken') || '';
      if (!t) return;
      try {
        const c = await CanvasAPI.getCanvas(t, parsedCanvasId);
        const percent = typeof c.camera_zoom_percentage === 'number' && c.camera_zoom_percentage > 0 ? c.camera_zoom_percentage : 100;
        setZoom(percent / 100);
        const px = typeof c.camera_x === 'number' ? c.camera_x : 0;
        const py = typeof c.camera_y === 'number' ? c.camera_y : 0;
        setPan({ x: px, y: py });
      } catch {}
      cameraLoadedRef.current = true;
    };
    void loadCamera();
  }, [parsedCanvasId]);

  // Persist camera when it changes (debounced)
  useEffect(() => {
    const t = tokenRef.current || localStorage.getItem('learnableToken') || '';
    if (!t || !parsedCanvasId) return;
    if (!cameraLoadedRef.current) return;
    const h = window.setTimeout(() => {
      const percent = Math.round((zoom || 1) * 100);
      void CanvasAPI.updateCanvas(t, parsedCanvasId, {
        camera_x: Math.round(pan.x),
        camera_y: Math.round(pan.y),
        camera_zoom_percentage: percent,
      }).catch(() => {});
    }, 400);
    return () => window.clearTimeout(h);
  }, [zoom, pan, parsedCanvasId]);

  const wheelTimerRef = useRef<number | null>(null);
  const onWheel = (e: React.WheelEvent) => {
    if (!containerRef.current) return;
    // Ctrl/Cmd + scroll: zoom at cursor, prevent browser page zoom
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      zoomAtPoint(e.deltaY, e.clientX, e.clientY);
      return;
    }
    // Shift + scroll: horizontal pan (Figma-like)
    if (e.shiftKey) {
      e.preventDefault();
      const horiz = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      setPan((p) => ({ x: p.x - horiz, y: p.y }));
      return;
    }
    // Default: natural pan with trackpad/mouse
    setPan((p) => ({ x: p.x - e.deltaX, y: p.y - e.deltaY }));
    // Debounce persist after wheel panning
    if (wheelTimerRef.current) window.clearTimeout(wheelTimerRef.current);
    wheelTimerRef.current = window.setTimeout(() => { persistCamera(); }, 350);
  };

  const onMouseDown = async (e: React.MouseEvent) => {
    const isMiddle = e.button === 1;
    const canPan = spacePressed || isMiddle;
    if (!canPan && e.button === 0 && (activeTool === 'rect' || activeTool === 'text' || activeTool === 'line')) {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const wx = (e.clientX - rect.left - pan.x) / zoom;
      const wy = (e.clientY - rect.top - pan.y) / zoom;
      setDraft({ type: activeTool, x: wx, y: wy, width: 0, height: 0 });
      e.preventDefault();
      return;
    }
    if (!canPan) {
      if (e.button === 0 && activeTool === 'select') {
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;
        const wx = (e.clientX - rect.left - pan.x) / zoom;
        const wy = (e.clientY - rect.top - pan.y) / zoom;
        if (editingId) {
          try { await saveEditText(); } catch {}
        }
        selectStartRef.current = { x: wx, y: wy };
        selectAdditiveRef.current = !!(e.shiftKey || e.metaKey || (e as any).ctrlKey);
        setSelectBox({ x: wx, y: wy, width: 0, height: 0 });
        e.preventDefault();
      }
      return;
    }
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    panStartRef.current = { ...pan };
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (draft) {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const wx = (e.clientX - rect.left - pan.x) / zoom;
      const wy = (e.clientY - rect.top - pan.y) / zoom;
      const x0 = draft.x; const y0 = draft.y;
      const nx = Math.min(x0, wx);
      const ny = Math.min(y0, wy);
      const nw = Math.abs(wx - x0);
      const nh = Math.abs(wy - y0);
      setDraft({ ...draft, x: nx, y: ny, width: nw, height: nh });
      return;
    }
    if (selectBox && selectStartRef.current) {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const wx = (e.clientX - rect.left - pan.x) / zoom;
      const wy = (e.clientY - rect.top - pan.y) / zoom;
      const x0 = selectStartRef.current.x; const y0 = selectStartRef.current.y;
      const nx = Math.min(x0, wx);
      const ny = Math.min(y0, wy);
      const nw = Math.abs(wx - x0);
      const nh = Math.abs(wy - y0);
      setSelectBox({ x: nx, y: ny, width: nw, height: nh });
      return;
    }
    if (isDragging && dragStartRef.current && panStartRef.current) {
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      setPan({ x: panStartRef.current.x + dx, y: panStartRef.current.y + dy });
    }
    movement.onMouseMoveCanvas(e);
  };

  const onMouseUp = async () => {
    if (selectBox) {
      const box = selectBox;
      const small = (box.width < 3 && box.height < 3);
      if (small) {
        if (!selectAdditiveRef.current) setSelectedIds([]);
      } else {
        const bx0 = box.x; const by0 = box.y; const bx1 = bx0 + box.width; const by1 = by0 + box.height;
        const hits: number[] = [];
        for (const el of elements) {
          const ex0 = el.x || 0; const ey0 = el.y || 0; const ex1 = ex0 + (el.width || 0); const ey1 = ey0 + (el.height || 0);
          const inter = ex0 < bx1 && ex1 > bx0 && ey0 < by1 && ey1 > by0;
          if (inter) hits.push(el.id);
        }
        setSelectedIds((prev) => (selectAdditiveRef.current ? Array.from(new Set([...prev, ...hits])) : hits));
      }
      setSelectBox(null);
      selectStartRef.current = null;
      selectAdditiveRef.current = false;
    }
    if (draft && parsedCanvasId) {
      const token = localStorage.getItem('learnableToken');
      if (token) {
        const minW = 20, minH = 20;
        let x = Math.round(draft.x);
        let y = Math.round(draft.y);
        let w = Math.round(Math.max(minW, draft.width || 0));
        let h = Math.round(Math.max(minH, draft.height || 0));
        if ((draft.width || 0) < 4 && (draft.height || 0) < 4) {
          if (draft.type === 'rect') { w = 280; h = 160; x = x - Math.round(w / 2); y = y - Math.round(h / 2); }
          if (draft.type === 'text') { w = 280; h = 120; x = x - Math.round(w / 2); y = y - Math.round(h / 2); }
          if (draft.type === 'line') { w = 120; h = 1; }
        }
        try {
          let created;
          if (draft.type === 'line') {
            const nextZ = getTopZ();
            const sx = Math.round(draft.x);
            const sy = Math.round(draft.y);
            const ex = Math.round(draft.x + (draft.width || 0));
            const ey = Math.round(draft.y + (draft.height || 0));
            const minX = Math.min(sx, ex), minY = Math.min(sy, ey);
            const bw = Math.max(1, Math.abs(ex - sx));
            const bh = Math.max(1, Math.abs(ey - sy));
            created = await CanvasAPI.createElement(token, {
              canvas_id: parsedCanvasId,
              type: 'line',
              x: minX, y: minY, width: bw, height: bh,
              rotation: 0, z_index: nextZ,
              bgcolor: '#FFFFFF',
              line_start_x: sx,
              line_start_y: sy,
              line_end_x: ex,
              line_end_y: ey,
              data: { stroke_width: 2 },
            } as any);
            if (!created.z_index || created.z_index < nextZ) {
              created = { ...created, z_index: nextZ } as any;
            }
            // Persist z-index explicitly in case backend normalized to 0
            try {
              const updated = await CanvasAPI.updateElement(token, created.id, { z_index: nextZ } as any);
              created = { ...created, z_index: updated.z_index ?? nextZ } as any;
            } catch {}
          } else {
            const nextZ = getTopZ();
            created = await CanvasAPI.createElement(token, {
              canvas_id: parsedCanvasId,
              type: draft.type === 'rect' ? 'rectangle' : 'text',
              x, y, width: w, height: h,
              rotation: 0, z_index: nextZ,
              bgcolor: '#FFFFFF',
              data: draft.type === 'text' ? { text: 'Text', fontSize: 16 } : {},
            } as any);
            if (!created.z_index || created.z_index < nextZ) {
              created = { ...created, z_index: nextZ } as any;
            }
            try {
              const updated = await CanvasAPI.updateElement(token, created.id, { z_index: nextZ } as any);
              created = { ...created, z_index: updated.z_index ?? nextZ } as any;
            } catch {}
          }
          setElements((prev) => [...prev, created]);
          if (draft.type === 'text') {
            setEditingId(created.id);
            setEditingText((created.data as any)?.text ?? 'Text');
          }
          setActiveTool('select');
        } catch { /* ignore */ }
      }
      setDraft(null);
    }
    setIsDragging(false);
    dragStartRef.current = null;
    panStartRef.current = null;
    movement.onMouseUpCanvas();
    // Persist camera after drag-pan ends
    persistCamera();
  };

  const isTypingTarget = (t: EventTarget | null) => {
    const el = t as HTMLElement | null;
    if (!el) return false;
    const tag = el.tagName;
    return el.isContentEditable || tag === 'INPUT' || tag === 'TEXTAREA';
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        if (!isTypingTarget(e.target)) {
          setSpacePressed(true);
          e.preventDefault();
        }
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && !isTypingTarget(e.target)) {
        const current = selectedRef.current;
        if (!current || current.length === 0) return;
        const t = tokenRef.current || localStorage.getItem('learnableToken') || '';
        if (!t) return;
        e.preventDefault();
        void (async () => {
          for (const id of current) { try { await CanvasAPI.deleteElement(t, id); } catch {} }
          setElements((prev) => prev.filter((el) => !current.includes(el.id)));
          setSelectedIds([]);
        })();
      } else if (e.key === 'Escape' && !isTypingTarget(e.target)) {
        setSelectedIds([]);
        setActiveTool('select');
      }
    };
    const onKeyUp = (e: KeyboardEvent) => { if (e.code === 'Space') setSpacePressed(false); };
    window.addEventListener('keydown', onKeyDown as any, { passive: false } as any);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown as any);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  const startEditText = (id: number) => {
    const el = elements.find((e) => e.id === id);
    const txt = (el?.data as any)?.text ?? '';
    originalTextRef.current = String(txt);
    setEditingId(id);
    setEditingText(String(txt));
  };

  const cancelEditText = () => {
    // Revert optimistic edits if any
    if (editingId != null && originalTextRef.current != null) {
      const oldText = originalTextRef.current;
      setElements((prev) => prev.map((el) => (
        el.id === editingId ? { ...el, data: { ...(el.data as any), text: oldText } } : el
      )));
    }
    originalTextRef.current = null;
    setEditingId(null);
    setEditingText('');
  };

  const saveEditText = async () => {
    if (!editingId) return;
    const el = elements.find((e) => e.id === editingId);
    const t = tokenRef.current || localStorage.getItem('learnableToken') || '';
    if (!el || !t) { cancelEditText(); return; }
    const newData = { ...(el.data as any), text: editingText };
    try {
      const updated = await CanvasAPI.updateElement(t, editingId, { data: newData } as any);
      setElements((prev) => prev.map((x) => (x.id === editingId ? { ...x, data: updated.data } : x)));
    } catch { /* ignore */ }
    cancelEditText();
  };

  // While editing text inside the canvas, update the element locally so the Inspector reflects it in real time
  useEffect(() => {
    if (editingId == null) return;
    setElements((prev) => prev.map((el) => (
      el.id === editingId ? { ...el, data: { ...(el.data as any), text: editingText } } : el
    )));
  }, [editingId, editingText, setElements]);

  const deleteSelected = async () => {
    if (!selectedIds.length) return;
    const t = tokenRef.current || localStorage.getItem('learnableToken') || '';
    if (!t) return;
    for (const id of selectedIds) { try { await CanvasAPI.deleteElement(t, id); } catch {} }
    setElements((prev) => prev.filter((el) => !selectedIds.includes(el.id)));
    setSelectedIds([]);
  };

  // paste images
  const getCanvasCenter = () => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const x = (cx - rect.left - pan.x) / zoom;
    const y = (cy - rect.top - pan.y) / zoom;
    return { x, y };
  };

  // Reusable handlers for inserting images
  const getTopZ = () => {
    // Use highest explicit z-index if present; otherwise fall back to count
    let maxZ = 0;
    let anyPositive = false;
    for (const el of elements) {
      const z = Number(el.z_index ?? 0);
      if (!Number.isFinite(z)) continue;
      if (z > 0) anyPositive = true;
      if (z > maxZ) maxZ = z;
    }
    return (anyPositive ? maxZ : elements.length) + 1;
  };

  const insertImageFromDataUrl = async (dataUrl: string, pos?: { x: number; y: number }) => {
    if (!parsedCanvasId) return;
    const token = localStorage.getItem('learnableToken');
    if (!token) return;
    const nextZ = getTopZ();
    const imgDims = await new Promise<{ w: number; h: number }>((resolve) => {
      const img = new Image();
      img.onload = () => {
        const maxSide = 360;
        const ratio = Math.max(img.width, img.height) > 0 ? Math.min(1, maxSide / Math.max(img.width, img.height)) : 1;
        const w = Math.round((img.width || 200) * (ratio || 1));
        const h = Math.round((img.height || 200) * (ratio || 1));
        resolve({ w: Math.max(40, w), h: Math.max(40, h) });
      };
      img.onerror = () => resolve({ w: 200, h: 200 });
      img.src = dataUrl;
    });
    const center = getCanvasCenter();
    const base = pos ?? center;
    try {
      let created = await CanvasAPI.createElement(token, {
        canvas_id: parsedCanvasId,
        type: 'image',
        x: Math.round(base.x - imgDims.w / 2),
        y: Math.round(base.y - imgDims.h / 2),
        width: imgDims.w,
        height: imgDims.h,
        rotation: 0,
        z_index: nextZ,
        data: { url: dataUrl },
      } as any);
      if (!created.z_index || created.z_index < nextZ) {
        try {
          const updated = await CanvasAPI.updateElement(token, created.id, { z_index: nextZ } as any);
          created = { ...created, z_index: updated.z_index ?? nextZ } as any;
        } catch {
          created = { ...created, z_index: nextZ } as any;
        }
      }
      setElements((prev) => [...prev, created]);
    } catch { }
  };

  const insertImageFromUrl = async (url: string, pos?: { x: number; y: number }) => {
    if (!parsedCanvasId) return;
    const token = localStorage.getItem('learnableToken');
    if (!token) return;
    const nextZ = getTopZ();
    const imgDims = await new Promise<{ w: number; h: number }>((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const maxSide = 360;
        const ratio = Math.max(img.width, img.height) > 0 ? Math.min(1, maxSide / Math.max(img.width, img.height)) : 1;
        const w = Math.round((img.width || 200) * (ratio || 1));
        const h = Math.round((img.height || 200) * (ratio || 1));
        resolve({ w: Math.max(40, w), h: Math.max(40, h) });
      };
      img.onerror = () => resolve({ w: 200, h: 200 });
      img.src = url;
    });
    const center = getCanvasCenter();
    const base = pos ?? center;
    try {
      let created = await CanvasAPI.createElement(token, {
        canvas_id: parsedCanvasId,
        type: 'image',
        x: Math.round(base.x - imgDims.w / 2),
        y: Math.round(base.y - imgDims.h / 2),
        width: imgDims.w,
        height: imgDims.h,
        rotation: 0,
        z_index: nextZ,
        data: { url },
      } as any);
      if (!created.z_index || created.z_index < nextZ) {
        try {
          const updated = await CanvasAPI.updateElement(token, created.id, { z_index: nextZ } as any);
          created = { ...created, z_index: updated.z_index ?? nextZ } as any;
        } catch {
          created = { ...created, z_index: nextZ } as any;
        }
      }
      setElements((prev) => [...prev, created]);
    } catch { }
  };

  const handleClipboardItems = async (items: DataTransferItemList) => {
    if (!items || !parsedCanvasId) return false;
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (it && it.kind === 'file' && it.type && it.type.startsWith('image/')) {
        const file = it.getAsFile();
        if (!file) continue;
        const dataUrl: string = await new Promise((resolve, reject) => {
          const fr = new FileReader();
          fr.onerror = () => reject(new Error('read error'));
          fr.onload = () => resolve(String(fr.result || ''));
          fr.readAsDataURL(file);
        });
        await insertImageFromDataUrl(dataUrl);
        return true;
      }
    }
    return false;
  };

  const onPaste = async (e: React.ClipboardEvent<HTMLDivElement>) => {
    try {
      e.stopPropagation();
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || (target as any).isContentEditable)) { return; }
      const items = e.clipboardData?.items;
      if (!items) return;
      const handled = await handleClipboardItems(items);
      if (handled) e.preventDefault();
    } catch { }
  };

  const extractImgFromHtml = (html: string): string | null => {
    try {
      const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
      if (match && match[1]) return match[1];
      return null;
    } catch {
      return null;
    }
  };

  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    try { e.preventDefault(); (e.dataTransfer as DataTransfer).dropEffect = 'copy'; } catch { e.preventDefault(); }
  };

  const processDataTransfer = async (dt: DataTransfer, pos?: { x: number; y: number }) => {
    // 1) Files (images)
    const items = dt.items;
    if (items && items.length) {
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        if (it.kind === 'file' && it.type && it.type.startsWith('image/')) {
          const f = it.getAsFile();
          if (!f) continue;
          const dataUrl: string = await new Promise((resolve, reject) => {
            const fr = new FileReader();
            fr.onerror = () => reject(new Error('read error'));
            fr.onload = () => resolve(String(fr.result || ''));
            fr.readAsDataURL(f);
          });
          await insertImageFromDataUrl(dataUrl, pos);
          return true;
        }
      }
    }
    // 2) URL list
    const urlList = dt.getData('text/uri-list');
    if (urlList) {
      const url = urlList.split(/\r?\n/)[0].trim();
      if (url) { await insertImageFromUrl(url, pos); return true; }
    }
    // 3) HTML containing an <img>
    const html = dt.getData('text/html');
    if (html) {
      const src = extractImgFromHtml(html);
      if (src) { await insertImageFromUrl(src, pos); return true; }
    }
    // 4) Plain text URL fallback
    const txt = dt.getData('text/plain');
    if (txt && /^https?:\/\//i.test(txt.trim())) {
      await insertImageFromUrl(txt.trim(), pos);
      return true;
    }
    return false;
  };

  const onDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    try {
      e.preventDefault();
      e.stopPropagation();
      if (!parsedCanvasId) return;
      const pos = worldFromClient(e.clientX, e.clientY);
      const dt = e.dataTransfer;
      await processDataTransfer(dt, pos);
    } catch { }
  };

  // load elements
  useEffect(() => {
    const load = async () => {
      if (!parsedCanvasId) { setElements([]); return; }
      const token = localStorage.getItem('learnableToken');
      if (!token) { setElements([]); return; }
      try { setElements(await CanvasAPI.listElements(token, parsedCanvasId)); } catch { setElements([]); }
    };
    void load();
  }, [parsedCanvasId]);

  // Global paste listener so Ctrl/Cmd+V works even if canvas isn't focused
  useEffect(() => {
    const onWinPaste = async (evt: ClipboardEvent) => {
      try {
        const t = evt.target as HTMLElement | null;
        if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || (t as any).isContentEditable)) return;
        const items = evt.clipboardData?.items as DataTransferItemList | undefined;
        if (!items) return;
        const handled = await handleClipboardItems(items);
        if (handled) evt.preventDefault();
      } catch {}
    };
    window.addEventListener('paste', onWinPaste);
    return () => window.removeEventListener('paste', onWinPaste);
  }, [parsedCanvasId]);

  // Prevent browser page zoom on Ctrl/Cmd + wheel globally
  useEffect(() => {
    const onGlobalWheel = (e: WheelEvent) => {
      if (e.ctrlKey || (e as any).metaKey) {
        e.preventDefault();
      }
    };
    window.addEventListener('wheel', onGlobalWheel, { passive: false });
    return () => window.removeEventListener('wheel', onGlobalWheel as any);
  }, []);

  const onElementMouseDown = (e: React.MouseEvent, id: number) => {
    if (activeTool !== 'select') return;
    const isMod = e.shiftKey || e.metaKey || (e as any).ctrlKey;
    // If a text field is currently being edited and user clicks another element,
    // save the edit first so the canvas reflects the latest content immediately.
    if (editingId != null && editingId !== id) {
      void (async () => {
        try { await saveEditText(); } catch {}
      })();
    }
    setSelectedIds((prev) => {
      if (isMod) return prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      if (prev.includes(id)) return prev;
      return [id];
    });
    movement.onMouseDownElement(e, id);
  };

  const zoomIn = () => setZoom((z) => clampZoom(z * 1.1));
  const zoomOut = () => setZoom((z) => clampZoom(z * 0.9));
  const resetView = () => { setZoom(1); setPan({ x: 0, y: 0 }); };

  return {
    // state
    zoom, pan, elements, editingId, editingText, selectedIds, activeTool, draft, selectBox,
    // setters
    setActiveTool, setEditingText, setSelectedIds, setElements,
    // events
    onWheel, onMouseDown, onMouseMove, onMouseUp, onPaste, onDragOver, onDrop,
    onElementMouseDown,
    // allow external components (sidebar) to drop data transfers centered
    addFromDataTransfer: async (dt: DataTransfer) => { try { await processDataTransfer(dt, undefined); } catch {} },
    // actions
    zoomIn, zoomOut, resetView, deleteSelected, startEditText,
    saveEditText, cancelEditText,
    // control handlers
    onResizeHandle: movement.onResizeHandle,
    onRotateHandle: movement.onRotateHandle,
    cursor: movement.cursor,
  };
}
