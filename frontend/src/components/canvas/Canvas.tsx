import { useMemo, useRef, useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { CanvasBottomBar } from '@/components/canvas/CanvasBottomBar';
import { CanvasAPI } from '@/lib/api';
import { useCanvasInteraction } from '@/components/canvas/interaction';
import { Rectangle } from '@/components/canvas/Rectangle';
import { TextField } from '@/components/canvas/TextField';
import { ImageBox } from '@/components/canvas/ImageBox';
import { Line } from '@/components/canvas/Line';
import { LayersSidebar } from '@/components/canvas/LayersSidebar';
import { PanelLeftOpen } from 'lucide-react';

// interactions consolidated in interaction hook

type Props = {
  rightOffsetPercent?: number;
  canvasId?: number | null;
};

export const Canvas = ({ rightOffsetPercent = 0, canvasId = null }: Props) => {
  // Allow route param fallback for compatibility
  const { canvasId: canvasIdParam, graphId: graphIdParam } = useParams<{ canvasId?: string; graphId?: string }>();
  const parsedCanvasId = useMemo(() => {
    if (canvasId !== null && canvasId !== undefined) return canvasId;
    if (canvasIdParam) return parseInt(canvasIdParam, 10);
    if (graphIdParam) return parseInt(graphIdParam, 10);
    return null;
  }, [canvasId, canvasIdParam, graphIdParam]);

  const containerRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  const {
    zoom, pan, elements, editingId, editingText, selectedIds, activeTool, draft, selectBox,
    setActiveTool, setEditingText, setSelectedIds, setElements,
    onWheel, onMouseDown, onMouseMove, onMouseUp, onPaste, onDragOver, onDrop,
    onElementMouseDown,
    zoomIn, zoomOut, resetView, deleteSelected, startEditText,
    saveEditText, cancelEditText,
    onResizeHandle, onRotateHandle, cursor,
    addFromDataTransfer,
  } = useCanvasInteraction({ containerRef, parsedCanvasId });

  const MIN_SIDEBAR_W = 300;
  // Allow expanding the sidebar up to 100px beyond the minimum
  const MAX_SIDEBAR_W = MIN_SIDEBAR_W + 100;
  const [leftOpen, setLeftOpen] = useState(true);
  const [leftWidthPx, setLeftWidthPx] = useState(300);
  const [lastExpandedWidth, setLastExpandedWidth] = useState(300);
  const leftSidebarWidth = leftOpen ? leftWidthPx : 0; // px
  const [isResizingLeft, setIsResizingLeft] = useState(false);

  useEffect(() => {
    if (!isResizingLeft) return;
    const onMove = (e: MouseEvent) => {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      let w = Math.round(e.clientX - rect.left);
      // If user drags below minimum, collapse sidebar completely
      if (w < MIN_SIDEBAR_W) {
        setLeftOpen(false);
        setIsResizingLeft(false);
        try {
          document.body.style.userSelect = '';
          (document.body.style as any).webkitUserSelect = '';
          document.body.style.cursor = '';
        } catch {}
        return;
      }
      // Clamp within bounds
      w = Math.max(MIN_SIDEBAR_W, Math.min(MAX_SIDEBAR_W, w));
      setLeftWidthPx(w);
      setLastExpandedWidth(w);
    };
    const onUp = () => {
      setIsResizingLeft(false);
      try {
        document.body.style.userSelect = '';
        (document.body.style as any).webkitUserSelect = '';
        document.body.style.cursor = '';
      } catch {}
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }, [isResizingLeft]);

  const handleSelectFromSidebar = (ids: number[], opts?: { additive?: boolean; toggle?: boolean }) => {
    if (opts?.toggle) {
      const id = ids[0];
      if (id == null) return;
      setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
      return;
    }
    setSelectedIds(ids);
  };

  const handleReorderLayers = async (allOrderedIdsTopFirst: number[]) => {
    // Assign z-index sequentially across ALL elements so ordering is stable.
    setElements((prev) => {
      const idToZ = new Map<number, number>();
      const total = allOrderedIdsTopFirst.length;
      // Top (index 0) gets highest z
      for (let i = 0; i < total; i++) {
        const id = allOrderedIdsTopFirst[i];
        idToZ.set(id, total - i);
      }
      const next = prev.map((el) => (idToZ.has(el.id) ? { ...el, z_index: idToZ.get(el.id)! } : el));
      const token = localStorage.getItem('learnableToken') || '';
      if (token) {
        (async () => {
          for (const [id, z] of idToZ.entries()) {
            try { await CanvasAPI.updateElement(token, id, { z_index: z } as any); } catch {}
          }
        })();
      }
      return next;
    });
  };

  // Groups state
  const [groups, setGroups] = useState<import('@/types/api').ElementGroup[]>([]);
  // Load groups for canvas
  useEffect(() => {
    const load = async () => {
      if (!parsedCanvasId) { setGroups([]); return; }
      const token = localStorage.getItem('learnableToken');
      if (!token) { setGroups([]); return; }
      try { setGroups(await CanvasAPI.listGroups(token, parsedCanvasId)); } catch { setGroups([]); }
    };
    void load();
  }, [parsedCanvasId]);

  const handleCreateGroup = async () => {
    if (!parsedCanvasId) return;
    const ids = selectedIds.filter((id) => elements.some((e) => e.id === id));
    if (ids.length < 2) return;
    const token = localStorage.getItem('learnableToken') || '';
    if (!token) return;
    try {
      const grp = await CanvasAPI.createGroup(token, parsedCanvasId, 'Group', ids);
      setGroups((prev) => [grp, ...prev]);
      // keep selection as-is
    } catch {}
  };

  return (
    <div ref={containerRef} className="relative h-full w-full bg-[#272725] overflow-hidden"
      tabIndex={0}
      style={{ cursor: cursor || (activeTool !== 'select' ? 'crosshair' as const : undefined) }}
      onWheel={onWheel}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
      onMouseDown={(e) => {
        const target = e.target as HTMLElement | null;
        // If click happens inside the sidebar, ensure pending text edits are saved first
        if (target && target.closest('[data-learnable-sidebar="1"]')) {
          if (editingId != null) {
            // Save any in-progress text edit before switching focus
            void (async () => { try { await saveEditText(); } catch {} })();
          }
          return; // ignore sidebar clicks for canvas interactions
        }
        // ignore bottom bar area clicks
        const rect = containerRef.current?.getBoundingClientRect();
        if (rect) {
          const bottomBarH = 48; // ~h-12
          if (e.clientY >= rect.bottom - bottomBarH) return;
        }
        onMouseDown(e as unknown as React.MouseEvent);
      }}
      onDragOver={onDragOver as any}
      onDrop={onDrop as any}
      onPaste={onPaste}
      role="application"
      aria-label="Canvas area"
    >
      {/* Floating opener (shows only when collapsed) */}
      {!leftOpen && (
        <button
          onMouseDown={(e) => e.stopPropagation()}
          onClick={() => { setLeftWidthPx(lastExpandedWidth || MIN_SIDEBAR_W); setLeftOpen(true); }}
          className="absolute top-2 left-2 h-8 px-3 rounded-md bg-[#C5C1BA] hover:bg-[#C5C1BA]/90 flex items-center gap-2 transition-colors shadow z-30"
          aria-label="Show sidebar"
          title="Show sidebar"
        >
          <span className="text-sm font-medium text-[#1C1C1C]">Show Sidebar</span>
          <PanelLeftOpen className="w-4 h-4 text-[#1C1C1C]" />
        </button>
      )}
      {/* Infinite grid layer (fills container), offset by pan and scaled with zoom */}
      {(() => {
        const gridSize = Math.max(2, Math.round(22 * zoom));
        const offX = ((pan.x % gridSize) + gridSize) % gridSize;
        const offY = ((pan.y % gridSize) + gridSize) % gridSize;
        return (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(#3F3F3D 1px, transparent 1px)',
              backgroundSize: `${gridSize}px ${gridSize}px`,
              backgroundPosition: `${offX}px ${offY}px`,
            }}
          />
        );
      })()}
      {/* Left layers sidebar (fixed; not affected by pan/zoom) */}
      <LayersSidebar
        elements={elements}
        groups={groups}
        selectedIds={selectedIds}
        onSelect={handleSelectFromSidebar}
        onReorder={handleReorderLayers}
        onCreateGroup={handleCreateGroup}
        onHide={() => setLeftOpen(false)}
        onDeleteElement={async (id) => {
          // Optimistic remove
          setElements((prev) => prev.filter((el) => el.id !== id));
          setSelectedIds((prev) => prev.filter((x) => x !== id));
          const token = localStorage.getItem('learnableToken') || '';
          try { await CanvasAPI.deleteElement(token, id); } catch {}
          // Remove element from any local groups; delete empty groups
          setGroups((prev) => {
            const updated = prev.map((g) => ({ ...g, element_ids: (g.element_ids || []).filter((eid) => eid !== id) }));
            const empties = updated.filter((g) => (g.element_ids?.length || 0) === 0).map((g) => g.id);
            if (empties.length) {
              const t = token;
              if (t) {
                (async () => {
                  for (const gid of empties) {
                    try { await CanvasAPI.deleteGroup(t, gid); } catch {}
                  }
                })();
              }
            }
            return updated.filter((g) => (g.element_ids?.length || 0) > 0);
          });
        }}
        onDropDataTransfer={(dt) => { void addFromDataTransfer(dt); }}
        onUpdateElement={(id, patch) => {
          // optimistic local update
          setElements((prev) => prev.map((el) => (el.id === id ? { ...el, ...patch } : el)));
          const token = localStorage.getItem('learnableToken') || '';
          void (async () => { try { await CanvasAPI.updateElement(token, id, patch as any); } catch {} })();
        }}
        onUpdateElementData={(id, data) => {
          setElements((prev) => prev.map((el) => (el.id === id ? { ...el, data } : el)));
          const token = localStorage.getItem('learnableToken') || '';
          void (async () => { try { await CanvasAPI.updateElement(token, id, { data } as any); } catch {} })();
        }}
        widthPx={leftSidebarWidth}
      />
      {/* Left sidebar resize thumb (only when open) */}
      {leftOpen && (
        <div
          className="absolute top-0 bottom-0 cursor-col-resize z-30"
          // A slim invisible grab area that spans the full height at the sidebar's right border
          style={{ left: `${Math.max(0, leftSidebarWidth - 5)}px`, width: '10px' }}
          onMouseDown={(e) => {
            e.preventDefault();
            setIsResizingLeft(true);
            try {
              document.body.style.userSelect = 'none';
              (document.body.style as any).webkitUserSelect = 'none';
              document.body.style.cursor = 'col-resize';
              window.getSelection()?.removeAllRanges();
            } catch {}
          }}
        />
      )}

      {/* Grid background */}
      <div
        ref={viewportRef}
        className="absolute inset-0 will-change-transform"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: '0 0',
        }}
      >

        {/* Draft drawing overlay */}
        {draft && (
          draft.type === 'line' ? (
            <svg
              width={Math.max(1, draft.width)}
              height={Math.max(1, draft.height)}
              className="absolute"
              style={{ left: draft.x, top: draft.y, pointerEvents: 'none', zIndex: 999998 }}
            >
              <line x1={0} y1={0} x2={Math.max(1, draft.width)} y2={Math.max(1, draft.height)} stroke="#1E52F1" strokeWidth={2} />
            </svg>
          ) : (
            <div
              style={{
                position: 'absolute',
                left: draft.x,
                top: draft.y,
                width: Math.max(1, draft.width),
                height: Math.max(1, draft.height),
                border: '2px solid #1E52F1',
                background: 'rgba(30,82,241,0.10)',
                pointerEvents: 'none',
                zIndex: 999998,
              }}
            />
          )
        )}
        {/* Draft selection box */}
        {selectBox && (
          <div
            style={{
              position: 'absolute',
              left: selectBox.x,
              top: selectBox.y,
              width: Math.max(1, selectBox.width),
              height: Math.max(1, selectBox.height),
              border: '1px solid #1E52F1',
              background: 'rgba(30,82,241,0.06)',
              pointerEvents: 'none',
              zIndex: 999999,
            }}
          />
        )}
        {/* Render elements */}
        <div className="absolute inset-0" style={{ position: 'absolute' }}>
          {elements.map((el) => {
            const common: React.CSSProperties = {
              position: 'absolute',
              left: (el.x ?? 0),
              top: (el.y ?? 0),
              width: (el.width ?? 200) || undefined,
              height: (el.height ?? 120) || undefined,
              transform: `rotate(${el.rotation || 0}deg)`,
              zIndex: el.z_index ?? 0,
            };
            const isSel = selectedIds.includes(el.id);
            if (el.type === 'rectangle') {
              return (
                <Rectangle
                  key={el.id}
                  el={el}
                  style={common}
                  onMouseDownMove={onElementMouseDown}
                  onResizeHandle={onResizeHandle}
                  onRotateHandle={onRotateHandle}
                  showControls={isSel}
                />
              );
            }
            if (el.type === 'text') {
              return (
                <TextField
                  key={el.id}
                  el={el}
                  style={common}
                  editingId={editingId}
                  editingText={editingText}
                  onStartEdit={startEditText}
                  onChange={setEditingText}
                  onSave={saveEditText}
                  onCancel={cancelEditText}
                  onMouseDownMove={onElementMouseDown}
                  onResizeHandle={onResizeHandle}
                  onRotateHandle={onRotateHandle}
                  showControls={isSel || editingId === el.id}
                />
              );
            }
            if (el.type === 'image') {
              return (
                <ImageBox
                  key={el.id}
                  el={el}
                  style={common}
                  onMouseDownMove={onElementMouseDown}
                  onResizeHandle={onResizeHandle}
                  onRotateHandle={onRotateHandle}
                  showControls={isSel}
                />
              );
            }
            if (el.type === 'line') {
              return (
                <Line
                  key={el.id}
                  el={el}
                  style={common}
                  onMouseDownMove={onElementMouseDown}
                  onResizeStartHandle={(e, id, which) => {
                    // Map custom endpoints to standard resize handles for interaction hook
                    const handle = which === 'start' ? 'sw' : 'ne';
                    onResizeHandle(e as any, id, handle as any);
                  }}
                  showControls={isSel}
                />
              );
            }
            // Fallback for unknown types
            return (
              <div key={el.id} style={common} className="rounded-md border border-dashed border-[#3F3F3D] bg-transparent text-[#76746F] text-[11px] grid place-items-center">
                {el.type}
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom bar with zoom controls */}
      <CanvasBottomBar
        rightOffsetPercent={rightOffsetPercent}
        leftOffsetPx={leftSidebarWidth}
        zoom={zoom}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onResetView={resetView}
        activeTool={activeTool}
        onToggleRect={() => setActiveTool((t) => (t === 'rect' ? 'select' : 'rect'))}
        onToggleText={() => setActiveTool((t) => (t === 'text' ? 'select' : 'text'))}
        onToggleLine={() => setActiveTool((t) => (t === 'line' ? 'select' : 'line'))}
      />
    </div>
  );
};
