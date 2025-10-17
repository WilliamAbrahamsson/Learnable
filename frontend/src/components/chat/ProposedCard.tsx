import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Plus, X, Pencil, Check } from 'lucide-react';

type Props = {
  content: string; // raw content inside <card> ... can be JSON or plain text
  onAccept: (payload: { title: string; description: string }) => void;
  onDeny: () => void;
};

export const ProposedCard = ({ content, onAccept, onDeny }: Props) => {
  // Try to parse content as JSON { title, description }. Fallback to description-only.
  const initial = (() => {
    try {
      const raw = content.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        const t = String(parsed.title ?? '').trim();
        const d = String(parsed.description ?? '').trim();
        if (t || d) return { title: t || 'Card', description: d || '' };
      }
    } catch {}
    // Plain text fallback
    const trimmed = content.trim();
    const firstLine = trimmed.split(/\n+/)[0]?.trim() || 'Card';
    return { title: firstLine || 'Card', description: trimmed };
  })();
  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description);
  const [editing, setEditing] = useState(false); // start non-editable
  const taRef = useRef<HTMLTextAreaElement>(null);
  return (
    <div className="ml-[15px] mt-3">
      <div className="w-full rounded-lg border border-[#3F3F3D] bg-[#1C1C1C] p-4">
        <div className="mb-2">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-semibold text-[#E5E3DF]">Card Suggestion</div>
            <Button
              variant="ghost"
              className="h-7 px-2 text-[#C5C1BA] hover:text-white hover:bg-[#272725]"
              onClick={() => {
                const next = !editing;
                setEditing(next);
                if (next) setTimeout(() => taRef.current?.focus(), 0);
              }}
            >
              {editing ? (<><Check className="h-4 w-4 mr-1" /> Done</>) : (<><Pencil className="h-4 w-4 mr-1" /> Edit</>)}
            </Button>
          </div>

          {editing ? (
            <div className="space-y-3">
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="h-8 bg-transparent border-[#3F3F3D] text-[#C5C1BA] placeholder:text-[#76746F]"
                placeholder="Short title"
              />
              <Textarea
                ref={taRef}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="bg-transparent border-[#3F3F3D] text-[#C5C1BA] placeholder:text-[#76746F] text-xs leading-relaxed resize-y min-h-[110px]"
                placeholder="1–3 sentences that capture the concept"
              />
            </div>
          ) : (
            <div className="space-y-1">
              <div className="text-sm font-semibold text-[#E5E3DF]">{title || 'Card'}</div>
              <div className="text-xs text-[#C5C1BA] whitespace-pre-wrap leading-relaxed">
                {description || '—'}
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 mt-3">
          <Button
            onClick={() => onAccept({ title: title?.trim() || 'Card', description: description?.trim() || '' })}
            className="h-auto rounded-lg bg-[#1E52F1] px-3 py-1.5 text-sm text-white transition hover:bg-[#1E52F1]/90"
          >
            <Plus className="h-4 w-4 mr-1.5" /> Add Card
          </Button>
          <Button
            onClick={onDeny}
            className="h-auto rounded-lg bg-[#DC2626] px-3 py-1.5 text-sm text-white transition hover:bg-[#DC2626]/90"
          >
            <X className="h-4 w-4 mr-1.5" /> Dismiss
          </Button>
        </div>
      </div>
    </div>
  );
};
