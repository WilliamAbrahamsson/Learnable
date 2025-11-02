import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { CanvasElement, ElementGroup } from '@/types/api';
import { LayersHeader } from './LayersHeader';
import { LayersList } from './LayersList';
import { Inspector } from './Inspector';

type Props = {
  elements: CanvasElement[];
  groups?: ElementGroup[];
  selectedIds: number[];
  onSelect: (ids: number[], opts?: { additive?: boolean; toggle?: boolean }) => void;
  // Provide absolute order of all elements (top-first)
  onReorder?: (allOrderedIdsTopFirst: number[]) => void;
  onUpdateElement?: (id: number, patch: Partial<CanvasElement>) => void;
  onUpdateElementData?: (id: number, data: Record<string, unknown>) => void;
  widthPx?: number;
  onHide?: () => void;
  onDeleteElement?: (id: number) => void;
  onDropDataTransfer?: (dt: DataTransfer) => void;
  onCreateGroup?: () => void;
};

export function LayersSidebar({
  elements,
  groups = [],
  selectedIds,
  onSelect,
  onReorder,
  onUpdateElement,
  onUpdateElementData,
  widthPx = 240,
  onHide,
  onDeleteElement,
  onDropDataTransfer,
  onCreateGroup,
}: Props) {
  const sidebarRef = useRef<HTMLDivElement>(null);
  const [layersPct, setLayersPct] = useState<number>(0.3);
  const [isResizingSplit, setIsResizingSplit] = useState(false);

  // Selected element (single)
  const selectedEl = useMemo<CanvasElement | null>(() => {
    if (selectedIds.length !== 1) return null;
    const id = selectedIds[0];
    return elements.find((e) => e.id === id) || null;
  }, [elements, selectedIds]);

  useEffect(() => {
    if (!isResizingSplit) return;
    const onMove = (e: MouseEvent) => {
      const el = sidebarRef.current; if (!el) return;
      const rect = el.getBoundingClientRect(); let pct = (e.clientY - rect.top) / (rect.height || 1);
      pct = Math.max(0.15, Math.min(0.85, pct)); setLayersPct(pct);
    };
    const onUp = () => {
      setIsResizingSplit(false);
      try { document.body.style.userSelect = ''; (document.body.style as any).webkitUserSelect = ''; document.body.style.cursor = ''; } catch {}
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
  }, [isResizingSplit]);

  return (
    <div
      ref={sidebarRef}
      className="absolute inset-y-0 left-0 z-30 border-r border-[#272725] bg-[#1C1C1C]/95 backdrop-blur-[1px] overflow-hidden"
      data-learnable-sidebar="1"
      style={{ width: `${widthPx}px` }}
      onDragOver={(e) => { try { e.preventDefault(); (e.dataTransfer as DataTransfer).dropEffect = 'copy'; } catch { e.preventDefault(); } }}
      onDrop={(e) => { try { e.preventDefault(); e.stopPropagation(); if (onDropDataTransfer) onDropDataTransfer(e.dataTransfer); } catch {} }}
    >
      <LayersHeader onHide={onHide} canGroup={selectedIds.length >= 2} onCreateGroup={onCreateGroup} />

      <div className="h-[calc(100%-2rem)]" style={{ display: 'grid', gridTemplateRows: `${Math.round(layersPct * 100)}% 2px ${100 - Math.round(layersPct * 100)}%` }}>
        {/* Layers list */}
        <LayersList
          elements={elements}
          groups={groups}
          selectedIds={selectedIds}
          onSelect={onSelect}
          onReorderAbsolute={onReorder}
          onDeleteElement={onDeleteElement}
        />

        {/* Resizer */}
        <div
          className="bg-[#272725] cursor-row-resize"
          onMouseDown={(e) => { e.preventDefault(); setIsResizingSplit(true); try { document.body.style.userSelect = 'none'; (document.body.style as any).webkitUserSelect = 'none'; document.body.style.cursor = 'row-resize'; } catch {} }}
          style={{ height: '2px' }}
        />

        {/* Inspector */}
        <Inspector selectedEl={selectedEl} onUpdateElement={onUpdateElement} onUpdateElementData={onUpdateElementData} />
      </div>
    </div>
  );
}

export default LayersSidebar;
