import { useMemo, useState, useRef } from 'react';
import type { CanvasElement, ElementGroup } from '@/types/api';
import { ChevronDown, ChevronRight, Trash } from 'lucide-react';

type Props = {
  elements: CanvasElement[];
  groups: ElementGroup[];
  selectedIds: number[];
  onSelect: (ids: number[], opts?: { additive?: boolean; toggle?: boolean }) => void;
  // Absolute reorder: provide all element ids in top-to-bottom order
  onReorderAbsolute?: (allOrderedIdsTopFirst: number[]) => void;
  onDeleteElement?: (id: number) => void;
};

export function LayersList({ elements, groups, selectedIds, onSelect, onReorderAbsolute, onDeleteElement }: Props) {
  const sorted = useMemo(() => [...elements].sort((a, b) => (b.z_index ?? 0) - (a.z_index ?? 0) || b.id - a.id), [elements]);
  const groupedIdSet = useMemo(() => {
    const s = new Set<number>();
    for (const g of groups || []) for (const id of g.element_ids || []) s.add(Number(id));
    return s;
  }, [groups]);
  const ungrouped = useMemo(() => sorted.filter((e) => !groupedIdSet.has(e.id)), [sorted, groupedIdSet]);
  const ungroupedIds = useMemo(() => ungrouped.map((e) => e.id), [ungrouped]);

  type ItemRef = { kind: 'element'; id: number } | { kind: 'group'; id: number };
  const [draggingItem, setDraggingItem] = useState<ItemRef | null>(null);
  const [hoverTarget, setHoverTarget] = useState<ItemRef | null>(null);
  const [hoverAfter, setHoverAfter] = useState<boolean>(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<number, boolean>>({});
  const listRef = useRef<HTMLDivElement>(null);

  const items = useMemo(() => {
    const out: Array<{ kind: 'group'; z: number; g: ElementGroup } | { kind: 'element'; z: number; el: CanvasElement }> = [] as any;
    // Ungrouped elements as individual items
    for (const el of ungrouped) out.push({ kind: 'element', z: Number(el.z_index ?? 0), el });
    // Groups as block items with z from max member
    for (const g of groups || []) {
      const members = (g.element_ids || [])
        .map((id) => elements.find((e) => e.id === id))
        .filter(Boolean) as CanvasElement[];
      const gz = members.reduce((m, it) => Math.max(m, Number(it.z_index ?? 0)), 0);
      out.push({ kind: 'group', z: gz, g });
    }
    out.sort((a, b) => b.z - a.z);
    return out;
  }, [ungrouped, groups, elements]);

  const buildAbsoluteFromItems = (newItems: ItemRef[]) => {
    // Expand items list into absolute element id order (top-first)
    const abs: number[] = [];
    for (const it of newItems) {
      if (it.kind === 'element') {
        abs.push(it.id);
      } else {
        const g = (groups || []).find((gg) => gg.id === it.id);
        if (!g) continue;
        const members = (g.element_ids || [])
          .map((id) => elements.find((e) => e.id === id))
          .filter(Boolean) as CanvasElement[];
        members.sort((a, b) => (b.z_index ?? 0) - (a.z_index ?? 0) || b.id - a.id);
        for (const m of members) abs.push(m.id);
      }
    }
    return abs;
  };

  const finalizeReorder = () => {
    if (!draggingItem || !hoverTarget) return;
    const flatItems: ItemRef[] = items.map((it) => (it.kind === 'group' ? { kind: 'group', id: it.g.id } : { kind: 'element', id: it.el.id }));
    const srcIdx = flatItems.findIndex((x) => x.kind === draggingItem.kind && x.id === draggingItem.id);
    if (srcIdx === -1) return;
    const dstIdx0 = flatItems.findIndex((x) => x.kind === hoverTarget.kind && x.id === hoverTarget.id);
    let dstIdx = dstIdx0 === -1 ? flatItems.length : dstIdx0 + (hoverAfter ? 1 : 0);
    const working = flatItems.slice();
    const [moved] = working.splice(srcIdx, 1);
    // adjust index if removal before target
    if (srcIdx < dstIdx) dstIdx -= 1;
    dstIdx = Math.max(0, Math.min(working.length, dstIdx));
    working.splice(dstIdx, 0, moved);
    const absoluteNext = buildAbsoluteFromItems(working);
    setDraggingItem(null); setHoverTarget(null); setHoverAfter(false);
    onReorderAbsolute && onReorderAbsolute(absoluteNext);
  };

  return (
    <div
      ref={listRef}
      className="flex-1 overflow-y-auto overscroll-contain pr-2 sidebar-scroll"
      onDragOver={(e) => {
        if (!draggingItem) return;
        e.preventDefault();
        try { (e.dataTransfer as DataTransfer).dropEffect = 'move'; } catch {}
        const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
        if (items.length > 0) {
          const last = items[items.length - 1];
          const first = items[0];
          if (e.clientY > rect.bottom - 4) { setHoverTarget(last.kind === 'group' ? { kind: 'group', id: last.g.id } : { kind: 'element', id: last.el.id }); setHoverAfter(true); }
          else if (e.clientY < rect.top + 4) { setHoverTarget(first.kind === 'group' ? { kind: 'group', id: first.g.id } : { kind: 'element', id: first.el.id }); setHoverAfter(false); }
        }
      }}
      onDrop={(e) => { e.preventDefault(); finalizeReorder(); }}
    >
      {items.map((it) => {
        if (it.kind === 'group') {
          const g = it.g;
          const isOpen = !!expandedGroups[g.id];
          const members = (g.element_ids || [])
            .map((id) => elements.find((e) => e.id === id))
            .filter(Boolean) as CanvasElement[];
          return (
            <div key={`group-${g.id}`} className="w-full">
              <div
                className="flex items-center justify-between px-3 py-2 text-left text-sm text-[#C5C1BA] hover:bg-[#272725]"
                onClick={() => { if (members.length) onSelect(members.map((m) => m.id)); }}
                draggable
                onDragStart={(e) => {
                  setDraggingItem({ kind: 'group', id: g.id });
                  try {
                    e.dataTransfer.effectAllowed = 'move';
                    e.dataTransfer.setData('text/plain', String(g.id));
                    const img = new Image();
                    img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';
                    e.dataTransfer.setDragImage(img, 0, 0);
                  } catch {}
                }}
                onDragOver={(e) => {
                  if (!draggingItem) return; e.preventDefault();
                  try { (e.dataTransfer as DataTransfer).dropEffect = 'move'; } catch {}
                  const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
                  const after = e.clientY > rect.top + rect.height / 2;
                  setHoverTarget({ kind: 'group', id: g.id });
                  setHoverAfter(after);
                }}
                onDrop={(e) => { e.preventDefault(); finalizeReorder(); }}
                style={{ cursor: 'grab' }}
              >
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="w-5 h-5 grid place-items-center text-[#9E9B94] hover:text-[#C5C1BA]"
                    onClick={(e) => { e.stopPropagation(); setExpandedGroups((prev) => ({ ...prev, [g.id]: !isOpen })); }}
                    aria-label={isOpen ? 'Collapse group' : 'Expand group'}
                    draggable
                    onDragStart={(e) => {
                      setDraggingItem({ kind: 'group', id: g.id });
                      try {
                        e.dataTransfer.effectAllowed = 'move';
                        e.dataTransfer.setData('text/plain', String(g.id));
                        const img = new Image();
                        img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';
                        e.dataTransfer.setDragImage(img, 0, 0);
                      } catch {}
                    }}
                  >
                    {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </button>
                  <span
                    className="truncate"
                    draggable
                    onDragStart={(e) => {
                      setDraggingItem({ kind: 'group', id: g.id });
                      try {
                        e.dataTransfer.effectAllowed = 'move';
                        e.dataTransfer.setData('text/plain', String(g.id));
                        const img = new Image();
                        img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';
                        e.dataTransfer.setDragImage(img, 0, 0);
                      } catch {}
                    }}
                  >
                    {g.name}
                  </span>
                </div>
                <div className="w-10 text-right text-[10px] text-[#76746F]">{it.z}</div>
              </div>
              {isOpen && members.length > 0 && (
                <div className="py-1">
                  {members.map((el) => {
                    const isSel = selectedIds.includes(el.id);
                    return (
                    <div
                      key={`g-${g.id}-el-${el.id}`}
                      role="button"
                      tabIndex={0}
                      className={`group flex items-center justify-between px-2 py-1 pl-8 cursor-pointer ${isSel ? 'bg-[#272725]' : 'hover:bg-[#272725]'}`}
                        onClick={(e) => {
                          const additive = (e as any).shiftKey || (e as any).metaKey || (e as any).ctrlKey;
                          if (additive) onSelect([el.id], { toggle: true }); else onSelect([el.id]);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            const additive = (e as any).shiftKey || (e as any).metaKey || (e as any).ctrlKey;
                            if (additive) onSelect([el.id], { toggle: true }); else onSelect([el.id]);
                          }
                        }}
                      >
                        <div className="flex items-center gap-2 text-[#C5C1BA] text-xs">
                          {/* icon placeholder – parent renders icons elsewhere */}
                          <span className="w-4 h-4 rounded-sm border border-[#3F3F3D]" />
                          <span>{(el.type === 'text' && String((el.data as any)?.text || '').slice(0, 24)) || el.type}</span>
                        </div>
                        <div className="w-10 flex items-center justify-end">
                          <span className="text-[10px] text-[#76746F] group-hover:hidden">{el.z_index ?? 0}</span>
                          <button
                            type="button"
                            className="hidden group-hover:inline-flex text-[#C5C1BA] hover:text-[#E35A5A]"
                            aria-label="Delete layer"
                            title="Delete layer"
                            onClick={(e) => { e.stopPropagation(); if (onDeleteElement) onDeleteElement(el.id); }}
                          >
                            <Trash className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        }

        const el = it.el;
        const isSel = selectedIds.includes(el.id);
        const isHover = !!hoverTarget && hoverTarget.kind === 'element' && hoverTarget.id === el.id && !!draggingItem;
        const isDraggingRow = !!draggingItem && draggingItem.kind === 'element' && draggingItem.id === el.id;
        return (
          <div
            key={`row-${el.id}`}
            role="button"
            tabIndex={0}
            onClick={(e) => {
              const additive = e.shiftKey || e.metaKey || (e as any).ctrlKey;
              if (additive) onSelect([el.id], { toggle: true }); else onSelect([el.id]);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                const additive = (e as any).shiftKey || (e as any).metaKey || (e as any).ctrlKey;
                if (additive) onSelect([el.id], { toggle: true }); else onSelect([el.id]);
              }
            }}
            draggable
            onDragStart={(e) => {
              setDraggingItem({ kind: 'element', id: el.id });
              try {
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', String(el.id));
                const img = new Image();
                img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';
                e.dataTransfer.setDragImage(img, 0, 0);
              } catch {}
            }}
            onDragOver={(e) => {
              if (!draggingItem) return;
              e.preventDefault();
              try { (e.dataTransfer as DataTransfer).dropEffect = 'move'; } catch {}
              const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
              const after = e.clientY > rect.top + rect.height / 2;
              setHoverTarget({ kind: 'element', id: el.id });
              setHoverAfter(after);
            }}
            onDrop={(e) => { e.preventDefault(); finalizeReorder(); }}
            onDragEnd={() => { finalizeReorder(); }}
            className={`group w-full px-3 py-2 text-left flex items-center gap-2 text-sm transition-colors ${
              isHover ? 'border border-[#1E52F1] bg-[#1E52F1]/10' : ''
            } ${isSel ? 'bg-[#272725] text-[#E3E1DB]' : 'text-[#C5C1BA] hover:bg-[#272725]'} ${isDraggingRow ? 'opacity-80' : ''}`}
          >
            <span className="shrink-0 text-[#C5C1BA]">{/* icon placeholder */}</span>
            <span className="truncate flex-1">{(el.type === 'text' && String((el.data as any)?.text || '').slice(0, 24)) || el.type}</span>
            <div className="w-10 flex items-center justify-end">
              <span className="text-[10px] text-[#76746F] group-hover:hidden">{el.z_index ?? 0}</span>
              <button
                type="button"
                className="hidden group-hover:inline-flex text-[#C5C1BA] hover:text-[#E35A5A]"
                aria-label="Delete layer"
                title="Delete layer"
                onClick={(e) => { e.stopPropagation(); onDeleteElement && onDeleteElement(el.id); }}
              >
                <Trash className="w-5 h-5" />
              </button>
            </div>
          </div>
        );
      })}

      {(ungrouped.length === 0 && (!groups || groups.length === 0)) && (
        <div className="px-3 py-3 text-xs text-[#76746F]">No layers yet</div>
      )}
    </div>
  );
}
