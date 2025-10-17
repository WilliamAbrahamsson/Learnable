import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Mic, Plus, Send } from 'lucide-react';

type Props = {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  onFilesSelected?: (files: FileList) => void;
};

export const ChatInput = ({ value, onChange, onSend, onFilesSelected }: Props) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [value]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <div className="bg-[#1C1C1C] flex-shrink-0 px-2 pb-2">
      <div className="w-full overflow-hidden border border-[#76746F] rounded-2xl">
        <div className="relative bg-[#272725]">
          {/* Hidden file input for uploads */}
          <input
            ref={fileInputRef}
            id="chat-file-input"
            type="file"
            multiple
            className="hidden"
            onChange={(e) => {
              const files = e.currentTarget.files;
              if (files && files.length > 0) {
                onFilesSelected?.(files);
                // reset so selecting the same file again triggers change
                e.currentTarget.value = '';
              }
            }}
          />
          <Textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Ask Learnable ..."
            className="flex-1 bg-transparent border-0 text-[#C5C1BA] placeholder:text-gray-500 focus:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 resize-none min-h-[56px] max-h-[200px] py-4 px-5 text-[15px]"
            rows={1}
          />
        </div>
        <div className="flex items-center justify-between bg-[#272725] px-3 py-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-[#C5C1BA] hover:text-white hover:bg-[#1C1C1C]"
            aria-label="Upload files"
            onClick={() => fileInputRef.current?.click()}
          >
            <Plus className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8 text-[#C5C1BA] hover:text-white hover:bg-[#1C1C1C]">
              <Mic className="h-5 w-5" />
            </Button>
            <Button onClick={onSend} disabled={!value.trim()} size="icon" className="h-8 w-8 rounded-full bg-[#1E52F1] hover:bg-[#1E52F1]/90 disabled:bg-gray-600">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
