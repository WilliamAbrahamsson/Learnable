import { Button } from '@/components/ui/button';
import { Copy, RefreshCw, ThumbsDown, ThumbsUp } from 'lucide-react';
import { ProposedCard } from './ProposedCard';
import { renderMessageHtml } from './utils';
import { Message } from './types';

type Props = {
  messages: Message[];
  onAcceptProposal: (messageId: string, content: string) => void;
  onDenyProposal: (messageId: string) => void;
  onCopy: (text: string) => void;
  onThumbsUp: () => void;
  onThumbsDown: () => void;
  onRefresh: (messageId: string) => void;
};

export const ChatMessageList = ({
  messages,
  onAcceptProposal,
  onDenyProposal,
  onCopy,
  onThumbsUp,
  onThumbsDown,
  onRefresh,
}: Props) => {
  const firstAuthIndex = messages.findIndex((m) => m.authPrompt);

  return (
    <div className="space-y-6">
      {messages.map((message, idx) => (
        <div key={message.id} className="flex flex-col">
          <div className={`${message.sender === 'user' ? 'ml-auto mr-[15px]' : 'mr-auto'} max-w-[85%]`}>
            {message.sender === 'assistant' && (
              <div className="mb-2 ml-[15px] flex items-center gap-2">
                <span className="inline-flex items-center justify-center bg-[#1E52F1] rounded-md" style={{ width: '22px', height: '22px' }}>
                  <img src="/learnable-logo.png" alt="Learnable" className="h-5 w-5" />
                </span>
                <span className="text-[#C5C1BA] text-xs font-medium">Learnable</span>
              </div>
            )}

            {(message.sender === 'user' || message.text || (message.sender === 'assistant' && message.isGenerating)) && (
              <div
                className={`px-5 py-3 ${
                  message.sender === 'user' ? 'bg-[#272725] text-[#C5C1BA]' : 'bg-transparent text-[#C5C1BA] rounded-2xl'
                }`}
                style={message.sender === 'user' ? { borderRadius: '4px' } : { borderRadius: '16px' }}
              >
                {message.sender === 'assistant' && message.isGenerating && !message.text && (
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#C5C1BA] animate-pulse" />
                  </div>
                )}
                {message.text && (
                  <div
                    className="text-[15px] leading-normal whitespace-pre-wrap break-words"
                    dangerouslySetInnerHTML={{ __html: renderMessageHtml(message.text) }}
                  />
                )}
              </div>
            )}

            {/* Auth Card */}
            {message.sender === 'assistant' && message.authPrompt && idx === firstAuthIndex && (
              <div className="ml-[15px] mt-3">
                <div className="w-full rounded-lg border border-[#3F3F3D] bg-[#2F2F2C] p-4">
                  <div className="text-sm font-semibold text-[#E5E3DF] mb-1">Sign in to continue</div>
                  <div className="text-xs text-[#B5B2AC]">
                    Create a quick demo or sign in to add notes to your Learning Graph.
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <Button variant="ghost" className="h-7 px-2 text-[#C5C1BA] hover:text-white hover:bg-[#272725] rounded-md" onClick={() => window.dispatchEvent(new Event('learnable-open-signup'))}>
                      Explore Demo
                    </Button>
                    <Button className="h-7 px-3 bg-[#1E52F1] text-white hover:bg-[#1E52F1]/90 rounded-md" onClick={() => window.dispatchEvent(new Event('learnable-open-signin'))}>
                      Sign In
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Proposed Card */}
            {message.sender === 'assistant' && !message.isGenerating && message.showProposal && message.cardContent && (
              <ProposedCard
                content={message.cardContent}
                onAccept={(edited) => onAcceptProposal(message.id, edited)}
                onDeny={() => onDenyProposal(message.id)}
              />
            )}

            {/* Actions */}
            {message.sender === 'assistant' && !message.isGenerating && message.text && (
              <div className="flex items-center gap-1 mt-2 ml-[15px]">
                <Button variant="ghost" size="icon" className="h-7 w-7 text-[#C5C1BA] hover:text-white hover:bg-[#272725]" onClick={() => onCopy(message.text)}>
                  <Copy className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-[#C5C1BA] hover:text-white hover:bg-[#272725]" onClick={onThumbsUp}>
                  <ThumbsUp className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-[#C5C1BA] hover:text-white hover:bg-[#272725]" onClick={onThumbsDown}>
                  <ThumbsDown className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-[#C5C1BA] hover:text-white hover:bg-[#272725]" onClick={() => onRefresh(message.id)}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
