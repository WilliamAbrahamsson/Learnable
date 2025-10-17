import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Plus, X, Pencil } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

type Props = {
  content: string;
  onAccept: (edited: string) => void;
  onDeny: () => void;
};

export const ProposedCard = ({ content, onAccept, onDeny }: Props) => {
  const [edited, setEdited] = useState(content);
  const [isEditing, setIsEditing] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const MIN_BODY_PX = 110;
  const [minBodyPx, setMinBodyPx] = useState<number>(MIN_BODY_PX);
  useEffect(() => {
    if (isEditing) {
      // focus textarea without changing background layout
      setTimeout(() => taRef.current?.focus(), 0);
    }
  }, [isEditing]);
  return (
    <div className="ml-[15px] mt-3">
      <div className="w-full rounded-lg border border-[#3F3F3D] bg-[#2F2F2C] p-4">
        <div className="mb-2">
          <div className="flex items-center justify-between mb-1">
            <div className="text-sm font-semibold text-[#E5E3DF]">Card Suggestion</div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    aria-label="Edit this card"
                    title="Edit this card"
                    className="h-7 w-7 inline-flex items-center justify-center rounded text-[#C5C1BA] hover:text-white hover:bg-[#272725]"
                    onClick={() => {
                      // Measure current content to lock height before entering edit
                      const h = contentRef.current?.getBoundingClientRect().height || MIN_BODY_PX;
                      setMinBodyPx(Math.max(MIN_BODY_PX, Math.ceil(h)));
                      setIsEditing((v) => !v);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="bg-[#1C1C1C] text-[#C5C1BA] border border-[#272725]">
                  Edit this card
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          {isEditing ? (
            <Textarea
              ref={taRef}
              value={edited}
              onChange={(e) => setEdited(e.target.value)}
              className="mt-1 bg-transparent border-transparent focus:border-[#3F3F3D] focus:ring-0 text-[#C5C1BA] placeholder:text-[#76746F] text-xs leading-relaxed resize-none p-0"
              style={{ minHeight: minBodyPx }}
              placeholder="Edit the card content before adding..."
            />
          ) : (
            <div
              ref={contentRef}
              className="text-xs text-[#B5B2AC] whitespace-pre-wrap leading-relaxed"
              style={{ minHeight: minBodyPx }}
            >
              {edited}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 mt-3">
          <Button
            onClick={() => onAccept(edited)}
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
