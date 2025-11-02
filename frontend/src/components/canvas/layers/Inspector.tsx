import { useEffect, useRef, useState } from 'react';
import type { CanvasElement } from '@/types/api';

type Props = {
  selectedEl: CanvasElement | null;
  onUpdateElement?: (id: number, patch: Partial<CanvasElement>) => void;
  onUpdateElementData?: (id: number, data: Record<string, unknown>) => void;
};

export function Inspector({ selectedEl, onUpdateElement, onUpdateElementData }: Props) {
  const [wVal, setWVal] = useState('');
  const [hVal, setHVal] = useState('');
  const [rVal, setRVal] = useState('');
  const [xVal, setXVal] = useState('');
  const [yVal, setYVal] = useState('');
  const [tVal, setTVal] = useState('');
  const [lsx, setLSX] = useState('');
  const [lsy, setLSY] = useState('');
  const [lex, setLEX] = useState('');
  const [ley, setLEY] = useState('');
  const numberTimers = useRef<Record<string, number | undefined>>({});
  const textTimer = useRef<number | undefined>(undefined);
  const inspectorTextRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!selectedEl) { setWVal(''); setHVal(''); setRVal(''); setXVal(''); setYVal(''); setTVal(''); setLSX(''); setLSY(''); setLEX(''); setLEY(''); return; }
    setWVal(String(selectedEl.width ?? ''));
    setHVal(String(selectedEl.height ?? ''));
    setRVal(String(selectedEl.rotation ?? 0));
    setXVal(String(selectedEl.x ?? 0));
    setYVal(String(selectedEl.y ?? 0));
    setTVal(String((selectedEl.data as any)?.text ?? ''));
    if (selectedEl.type === 'line') {
      setLSX(String(Math.round(Number(selectedEl.line_start_x ?? 0))));
      setLSY(String(Math.round(Number(selectedEl.line_start_y ?? 0))));
      setLEX(String(Math.round(Number(selectedEl.line_end_x ?? 0))));
      setLEY(String(Math.round(Number(selectedEl.line_end_y ?? 0))));
    } else { setLSX(''); setLSY(''); setLEX(''); setLEY(''); }
  }, [
    selectedEl?.id,
    selectedEl?.width,
    selectedEl?.height,
    selectedEl?.rotation,
    selectedEl?.x,
    selectedEl?.y,
    (selectedEl?.data as any)?.text,
    selectedEl?.line_start_x,
    selectedEl?.line_start_y,
    selectedEl?.line_end_x,
    selectedEl?.line_end_y,
  ]);

  useEffect(() => {
    const el = inspectorTextRef.current; if (!el) return; el.style.height = 'auto'; el.style.height = `${el.scrollHeight}px`;
  }, [tVal, selectedEl?.id]);

  const commitNumber = (key: 'width'|'height'|'rotation'|'x'|'y', raw: string) => {
    if (!selectedEl || !onUpdateElement) return; const n = Number(raw); if (!Number.isFinite(n)) return;
    onUpdateElement(selectedEl.id, { [key]: Math.round(n) } as any);
  };
  const scheduleNumber = (key: 'width'|'height'|'rotation'|'x'|'y', raw: string) => {
    const k = `${key}`; if (numberTimers.current[k]) window.clearTimeout(numberTimers.current[k]);
    numberTimers.current[k] = window.setTimeout(() => commitNumber(key, raw), 120);
  };
  const commitText = (raw: string) => {
    if (!selectedEl || !onUpdateElementData) return; const prev = (selectedEl.data as any) || {}; const next = { ...prev, text: raw };
    onUpdateElementData(selectedEl.id, next);
  };
  const scheduleText = (raw: string) => { if (textTimer.current) window.clearTimeout(textTimer.current); textTimer.current = window.setTimeout(() => commitText(raw), 180); };
  const commitLineEndpoints = (sxRaw: string, syRaw: string, exRaw: string, eyRaw: string) => {
    if (!selectedEl || !onUpdateElement) return; const sx = Math.round(Number(sxRaw)), sy = Math.round(Number(syRaw)), ex = Math.round(Number(exRaw)), ey = Math.round(Number(eyRaw));
    if (![sx, sy, ex, ey].every((n) => Number.isFinite(n))) return; const minX = Math.min(sx, ex); const minY = Math.min(sy, ey); const bw = Math.max(1, Math.abs(ex - sx)); const bh = Math.max(1, Math.abs(ey - sy));
    onUpdateElement(selectedEl.id, { line_start_x: sx, line_start_y: sy, line_end_x: ex, line_end_y: ey, x: Math.round(minX), y: Math.round(minY), width: Math.round(bw), height: Math.round(bh) } as any);
  };
  const commitBgColor = (hex: string) => {
    if (!selectedEl || !onUpdateElement) return; const v = String(hex || '').trim(); if (!v) return;
    onUpdateElement(selectedEl.id, { bgcolor: v } as any);
  };
  const commitLineColor = (hex: string) => {
    if (!selectedEl || !onUpdateElementData) return; const v = String(hex || '').trim(); if (!v) return;
    const prev = (selectedEl.data as any) || {}; const next = { ...prev, color: v };
    onUpdateElementData(selectedEl.id, next);
  };

  return (
    <div className="overflow-hidden">
      <div className="h-8 px-3 flex items-center text-xs font-medium text-[#C5C1BA] border-b border-[#272725]">Inspector</div>
      <div className="overflow-y-auto overscroll-contain px-3 py-2 pr-2 hide-scrollbar">
        {!selectedEl && (<div className="text-xs text-[#76746F]">Select an element to edit its properties</div>)}
        {selectedEl && (
          <div className="space-y-2 text-xs text-[#C5C1BA]">
            {selectedEl.type !== 'image' && selectedEl.type !== 'line' && (
              <>
                <div className="grid grid-cols-3 gap-2">
                  <div className="flex flex-col gap-1"><label className="opacity-70">W</label><input className="bg-transparent border border-[#272725] rounded px-2 py-1 text-xs outline-none focus:border-[#1E52F1]" value={wVal} onChange={(e) => { const v = e.target.value; setWVal(v); scheduleNumber('width', v); }} onBlur={() => commitNumber('width', wVal)} placeholder="px" /></div>
                  <div className="flex flex-col gap-1"><label className="opacity-70">H</label><input className="bg-transparent border border-[#272725] rounded px-2 py-1 text-xs outline-none focus:border-[#1E52F1]" value={hVal} onChange={(e) => { const v = e.target.value; setHVal(v); scheduleNumber('height', v); }} onBlur={() => commitNumber('height', hVal)} placeholder="px" /></div>
                  <div className="flex flex-col gap-1"><label className="opacity-70">Rot</label><input className="bg-transparent border border-[#272725] rounded px-2 py-1 text-xs outline-none focus:border-[#1E52F1]" value={rVal} onChange={(e) => { const v = e.target.value; setRVal(v); scheduleNumber('rotation', v); }} onBlur={() => commitNumber('rotation', rVal)} placeholder="deg" /></div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1"><label className="opacity-70">X</label><input className="bg-transparent border border-[#272725] rounded px-2 py-1 text-xs outline-none focus:border-[#1E52F1]" value={xVal} onChange={(e) => { const v = e.target.value; setXVal(v); scheduleNumber('x', v); }} onBlur={() => commitNumber('x', xVal)} placeholder="px" /></div>
                  <div className="flex flex-col gap-1"><label className="opacity-70">Y</label><input className="bg-transparent border border-[#272725] rounded px-2 py-1 text-xs outline-none focus:border-[#1E52F1]" value={yVal} onChange={(e) => { const v = e.target.value; setYVal(v); scheduleNumber('y', v); }} onBlur={() => commitNumber('y', yVal)} placeholder="px" /></div>
                </div>
                {selectedEl.type === 'rectangle' && (
                  <div className="flex items-center justify-between">
                    <label className="opacity-70">Background</label>
                    <input
                      type="color"
                      className="w-8 h-6 bg-transparent border border-[#272725] rounded"
                      value={String((selectedEl.bgcolor as any) || '#FFFFFF')}
                      onChange={(e) => commitBgColor(e.target.value)}
                    />
                  </div>
                )}
              </>
            )}
            {selectedEl.type === 'image' && (
              <>
                <div className="grid grid-cols-3 gap-2">
                  <div className="flex flex-col gap-1"><label className="opacity-70">W</label><input className="bg-transparent border border-[#272725] rounded px-2 py-1 text-xs outline-none focus:border-[#1E52F1]" value={wVal} onChange={(e) => { const v = e.target.value; setWVal(v); scheduleNumber('width', v); }} onBlur={() => commitNumber('width', wVal)} placeholder="px" /></div>
                  <div className="flex flex-col gap-1"><label className="opacity-70">H</label><input className="bg-transparent border border-[#272725] rounded px-2 py-1 text-xs outline-none focus:border-[#1E52F1]" value={hVal} onChange={(e) => { const v = e.target.value; setHVal(v); scheduleNumber('height', v); }} onBlur={() => commitNumber('height', hVal)} placeholder="px" /></div>
                  <div className="flex flex-col gap-1"><label className="opacity-70">Rot</label><input className="bg-transparent border border-[#272725] rounded px-2 py-1 text-xs outline-none focus:border-[#1E52F1]" value={rVal} onChange={(e) => { const v = e.target.value; setRVal(v); scheduleNumber('rotation', v); }} onBlur={() => commitNumber('rotation', rVal)} placeholder="deg" /></div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1"><label className="opacity-70">X</label><input className="bg-transparent border border-[#272725] rounded px-2 py-1 text-xs outline-none focus:border-[#1E52F1]" value={xVal} onChange={(e) => { const v = e.target.value; setXVal(v); scheduleNumber('x', v); }} onBlur={() => commitNumber('x', xVal)} placeholder="px" /></div>
                  <div className="flex flex-col gap-1"><label className="opacity-70">Y</label><input className="bg-transparent border border-[#272725] rounded px-2 py-1 text-xs outline-none focus:border-[#1E52F1]" value={yVal} onChange={(e) => { const v = e.target.value; setYVal(v); scheduleNumber('y', v); }} onBlur={() => commitNumber('y', yVal)} placeholder="px" /></div>
                </div>
                <div className="flex flex-col gap-1 mt-1"><label className="opacity-70">Image URL</label><input className="bg-transparent border border-[#272725] rounded px-2 py-1 text-xs outline-none focus:border-[#1E52F1]" value={String((selectedEl.data as any)?.url || '')} onChange={(e) => { const prev = (selectedEl.data as any) || {}; const next = { ...prev, url: e.target.value }; onUpdateElementData && onUpdateElementData(selectedEl.id, next); }} placeholder="https://..." /></div>
                <div className="flex flex-col gap-1">
                  <label className="opacity-70">Image</label>
                  <div className="border border-[#272725] rounded overflow-hidden">
                    {/* eslint-disable-next-line jsx-a11y/alt-text */}
                    <img src={String((selectedEl.data as any)?.url || '')} className="max-w-full max-h-40 object-contain" />
                  </div>
                </div>
              </>
            )}
            {selectedEl.type === 'line' && (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1"><label className="opacity-70">Start X</label><input className="bg-transparent border border-[#272725] rounded px-2 py-1 text-xs outline-none focus:border-[#1E52F1]" value={lsx} onChange={(e) => { const v = e.target.value; setLSX(v); }} onBlur={() => commitLineEndpoints(lsx, lsy, lex, ley)} placeholder="px" /></div>
                  <div className="flex flex-col gap-1"><label className="opacity-70">Start Y</label><input className="bg-transparent border border-[#272725] rounded px-2 py-1 text-xs outline-none focus:border-[#1E52F1]" value={lsy} onChange={(e) => { const v = e.target.value; setLSY(v); }} onBlur={() => commitLineEndpoints(lsx, lsy, lex, ley)} placeholder="px" /></div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1"><label className="opacity-70">End X</label><input className="bg-transparent border border-[#272725] rounded px-2 py-1 text-xs outline-none focus:border-[#1E52F1]" value={lex} onChange={(e) => { const v = e.target.value; setLEX(v); }} onBlur={() => commitLineEndpoints(lsx, lsy, lex, ley)} placeholder="px" /></div>
                  <div className="flex flex-col gap-1"><label className="opacity-70">End Y</label><input className="bg-transparent border border-[#272725] rounded px-2 py-1 text-xs outline-none focus:border-[#1E52F1]" value={ley} onChange={(e) => { const v = e.target.value; setLEY(v); }} onBlur={() => commitLineEndpoints(lsx, lsy, lex, ley)} placeholder="px" /></div>
                </div>
                <div className="flex items-center justify-between">
                  <label className="opacity-70">Line color</label>
                  <input
                    type="color"
                    className="w-8 h-6 bg-transparent border border-[#272725] rounded"
                    value={String((((selectedEl.data as any) || {}).color) || '#C5C1BA')}
                    onChange={(e) => commitLineColor(e.target.value)}
                  />
                </div>
              </div>
            )}
            {selectedEl.type === 'text' && (
              <div className="flex flex-col gap-1">
                <label className="opacity-70">Text</label>
                <textarea
                  ref={inspectorTextRef}
                  className="bg-transparent border border-[#272725] rounded px-2 py-1 text-xs outline-none focus:border-[#1E52F1] min-h-[54px] resize-none"
                  value={tVal}
                  onChange={(e) => { const v = e.target.value; setTVal(v); scheduleText(v); setTimeout(() => { const el = inspectorTextRef.current; if (el) { el.style.height = 'auto'; el.style.height = `${el.scrollHeight}px`; } }, 0); }}
                  onBlur={() => commitText(tVal)}
                  placeholder="Enter text"
                />
              </div>
            )}
            {selectedEl.type === 'text' && (
              <div className="flex items-center justify-between">
                <label className="opacity-70">Text color</label>
                <input
                  type="color"
                  className="w-8 h-6 bg-transparent border border-[#272725] rounded"
                  value={String((selectedEl.bgcolor as any) || '#C5C1BA')}
                  onChange={(e) => commitBgColor(e.target.value)}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
