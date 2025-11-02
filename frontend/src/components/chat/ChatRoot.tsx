import { useEffect, useRef, useState } from 'react';
import { UploadCloud } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { CanvasAPI, ChatAPI } from '@/lib/api';
import { ChatMessageList } from './ChatMessageList';
import { ChatInput } from './ChatInput';
import { Message } from './types';
import { extractCardContent } from './utils';

export const Chat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const dragHideTimer = useRef<number | null>(null);
  const scheduleHideDragOverlay = () => {
    if (dragHideTimer.current) window.clearTimeout(dragHideTimer.current);
    dragHideTimer.current = window.setTimeout(() => setIsDraggingOver(false), 250);
  };
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const [isAuthed, setIsAuthed] = useState<boolean>(!!localStorage.getItem('learnableToken'));

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000';
  const activeGraphId = (() => {
    try { return (window as any).learnableActiveGraphId ?? null; } catch { return null; }
  })();

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  useEffect(() => { scrollToBottom(); }, [messages]);

  // Auth listener
  useEffect(() => {
    const onAuthChanged = () => {
      const authed = !!localStorage.getItem('learnableToken');
      setIsAuthed(authed);
      if (authed) {
        const welcome: Message = { id: `welcome-${Date.now()}`, text: 'Welcome to Learnable — Chat with me to build a graph of knowledge and learn any subject!', sender: 'assistant', timestamp: new Date() };
        setMessages([welcome]);
      } else {
        const signedOut: Message = { id: `welcome-${Date.now()}`, text: "Hey, I'm Learnable. I can help you explore ideas and turn them into notes. Sign in or explore a demo to start building your Learning Graph.", sender: 'assistant', timestamp: new Date(), authPrompt: true };
        setMessages([signedOut]);
      }
    };
    window.addEventListener('learnable-auth-changed', onAuthChanged);
    return () => window.removeEventListener('learnable-auth-changed', onAuthChanged);
  }, []);

  // Initial message
  useEffect(() => {
    if (messages.length > 0) return;
    const authedWelcome = 'Welcome to Learnable — Chat with me to build a graph of knowledge and learn any subject!';
    const signedOutWelcome = "Hey, I'm Learnable. I can help you explore ideas and turn them into notes. Sign in or explore a demo to start building your Learning Graph.";
    const initial: Message = { id: `welcome-${Date.now()}`, text: isAuthed ? authedWelcome : signedOutWelcome, sender: 'assistant', timestamp: new Date(), authPrompt: !isAuthed };
    setMessages([initial]);
  }, [isAuthed]);

  // Load chat history for active graph
  useEffect(() => {
    const load = async () => {
      try {
        const gid = activeGraphId;
        const token = localStorage.getItem('learnableToken');
        if (!gid || !token) return;
        const data = await CanvasAPI.getChatWithMessages(token, gid);
        const items = Array.isArray(data?.messages) ? data.messages : [];
        if (items.length === 0) return;
        const mapped: Message[] = items.map((m: any) => ({
          id: String(m.id),
          text: m.text || '',
          sender: m.is_response ? 'assistant' : 'user',
          timestamp: new Date(((m.created_at ?? 0) * 1000) || Date.now()),
        }));
        setMessages(mapped);
      } catch { }
    };
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeGraphId, isAuthed, apiBaseUrl]);

  // Fetch assistant response (streaming)
  const fetchAssistantResponse = async (prompt: string, assistantId: string) => {
    try {
      const response = await ChatAPI.stream(prompt, (window as any).learnableActiveGraphId || undefined);
      if (!response.ok || !response.body) throw new Error('Failed to fetch');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      const processBuffer = () => {
        let handledDone = false;
        let boundary = buffer.indexOf('\n\n');
        while (boundary !== -1) {
          const eventChunk = buffer.slice(0, boundary).trim();
          buffer = buffer.slice(boundary + 2);
          boundary = buffer.indexOf('\n\n');
          if (!eventChunk.startsWith('data:')) continue;
          const payload = eventChunk.slice(5).trim();
          if (!payload) continue;
          if (payload === '[DONE]') { handledDone = true; break; }

          try {
            const parsed: { content?: string } = JSON.parse(payload);
            const content = parsed.content ?? '';
            if (!content) continue;
            setMessages((prev) => prev.map((msg) => {
              if (msg.id !== assistantId) return msg;
              const combinedRaw = `${msg.rawText ?? ''}${content}`;
              // Show normal text while streaming, but strip any <card> blocks from the visible text
              const display = combinedRaw.replace(/<card>[\s\S]*?<\/card>/gi, '');
              return { ...msg, rawText: combinedRaw, text: display };
            }));
          } catch (err) {
            console.error('Stream parse error:', err);
          }
        }

        if (handledDone) {
          setMessages((prev) => prev.map((msg) => {
            if (msg.id !== assistantId) return msg;
            const source = msg.rawText ?? msg.text;
            const { cleaned, card } = extractCardContent(source);
            const hasCard = !!card;
            // Keep the cleaned normal text, and also show the Proposed Card if present
            return { ...msg, text: cleaned, isGenerating: false, showProposal: hasCard, cardContent: card, rawText: '' };
          }));
        }
        return handledDone;
      };

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        if (processBuffer()) return;
      }
      buffer += decoder.decode();
      processBuffer();
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Network error';
      setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, text: "Sorry, I couldn't reach the server. Please try again.", isGenerating: false } : m)));
      toast({ variant: 'destructive', description: msg });
    }
  };

  // Actions
  const handleSend = () => {
    if (!input.trim()) return;
    const trimmed = input.trim();
    const userMessage: Message = { id: Date.now().toString(), text: trimmed, sender: 'user', timestamp: new Date() };
    const token = localStorage.getItem('learnableToken');
    if (!token) {
      const replyText = 'You have to sign in to unlock Learnable';
      const authMsg: Message = { id: `${Date.now().toString()}-auth`, text: replyText, sender: 'assistant', timestamp: new Date(), authPrompt: true };
      setMessages((prev) => [...prev, userMessage, authMsg]);
      setInput('');
      return;
    }
    const assistantId = `${Date.now().toString()}-assistant`;
    const assistantPlaceholder: Message = { id: assistantId, text: '', sender: 'assistant', timestamp: new Date(), isGenerating: true };
    setMessages((prev) => [...prev, userMessage, assistantPlaceholder]);
    setInput('');
    void fetchAssistantResponse(trimmed, assistantId);
  };

  const handleAcceptProposal = async (messageId: string, payload?: { title: string; description: string }) => {
    // Temporarily disable graph note creation while canvas is reset
    setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, showProposal: false } : m)));
    toast({ description: 'Canvas is being rebuilt. Card added will be available soon.' });
  };
  const handleDenyProposal = (messageId: string) => setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, showProposal: false } : m)));
  const handleCopy = (text: string) => { navigator.clipboard.writeText(text); toast({ description: 'Copied to clipboard', duration: 2000 }); };
  const handleThumbsUp = () => toast({ description: 'Thanks for your feedback!', duration: 2000 });
  const handleThumbsDown = () => toast({ description: 'Thanks for your feedback!', duration: 2000 });
  const handleRefresh = (id: string) => {
    const idx = messages.findIndex((m) => m.id === id);
    if (idx <= 0) return;
    const userMsg = messages[idx - 1];
    if (!userMsg || userMsg.sender !== 'user') return;
    const refreshedId = `${Date.now().toString()}-assistant`;
    const refreshed: Message = { id: refreshedId, text: '', sender: 'assistant', timestamp: new Date(), isGenerating: true };
    setMessages((prev) => {
      const filtered = prev.filter((msg) => msg.id !== id);
      const insertionIndex = filtered.findIndex((msg) => msg.id === userMsg.id);
      const before = filtered.slice(0, insertionIndex + 1);
      const after = filtered.slice(insertionIndex + 1);
      return [...before, refreshed, ...after];
    });
    void fetchAssistantResponse(userMsg.text, refreshedId);
  };

  return (
    <div
      className={`relative flex h-full w-full flex-col bg-[#1C1C1C] ${isDraggingOver ? 'border-2 border-dashed border-[#1E52F1]' : ''
        }`}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDraggingOver(true);
        scheduleHideDragOverlay();
      }}
      onDragEnter={(e) => {
        e.preventDefault();
        setIsDraggingOver(true);
      }}
      onDragLeave={(e) => {
        if (e.currentTarget === e.target) {
          setIsDraggingOver(false);
        } else {
          scheduleHideDragOverlay();
        }
      }}
      onDrop={(e) => {
        e.preventDefault();
        setIsDraggingOver(false);
        const files = e.dataTransfer?.files;
        if (files && files.length > 0) {
          setPendingFiles((prev) => [...prev, ...Array.from(files)]);
        }
      }}
    >
      {isDraggingOver && (
        <div className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[1px]">
          <div className="flex flex-col items-center gap-2 rounded-lg border-2 border-dashed border-[#1E52F1] bg-[#1C1C1C]/95 px-6 py-4 text-center">
            <UploadCloud className="h-6 w-6 text-[#1E52F1]" />
            <div className="text-sm font-medium text-[#E5E3DF]">Drop files to attach</div>
            <div className="text-xs text-[#B5B2AC]">They will appear above the input</div>
          </div>
        </div>
      )}
      <div className="flex-1 overflow-y-auto px-[15px] py-6 pb-12">
        <div className="max-w-4xl mx-auto h-full">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full space-y-6 select-none">
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center justify-center bg-[#1E52F1] rounded-md" style={{ width: '36px', height: '36px' }}>
                  <img src="/learnable-logo.png" alt="Learnable" className="h-7 w-7" />
                </span>
                <span className="text-[#C5C1BA] font-semibold text-xl">Learnable</span>
              </div>
              <h1 className="text-3xl font-semibold text-[#C5C1BA] text-center">Let&apos;s learn together; pick any topic to get started.</h1>
            </div>
          ) : (
            <>
              <ChatMessageList
                messages={messages}
                onAcceptProposal={handleAcceptProposal}
                onDenyProposal={handleDenyProposal}
                onCopy={handleCopy}
                onThumbsUp={handleThumbsUp}
                onThumbsDown={handleThumbsDown}
                onRefresh={handleRefresh}
              />
              <div className="h-16" />
              <div ref={messagesEndRef} />
            </>
          )}
        </div>
      </div>
      {pendingFiles.length > 0 && (
        <div className="px-[15px] pb-2">
          <div className="max-w-4xl mx-auto">
            <div className="w-full rounded-lg border border-[#3F3F3D] bg-[#2F2F2C] p-3">
              <div className="text-xs font-semibold text-[#E5E3DF] mb-1">Files ready</div>
              <div className="flex flex-wrap gap-2 text-[11px] text-[#C5C1BA]">
                {pendingFiles.slice(0, 5).map((f, i) => (
                  <span key={`${f.name}-${i}`} className="px-2 py-1 bg-[#1C1C1C] rounded">
                    {f.name}
                  </span>
                ))}
                {pendingFiles.length > 5 && (
                  <span className="opacity-70">+{pendingFiles.length - 5} more</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="px-[15px] pb-2">
        <div className="max-w-4xl mx-auto">
          <ChatInput
            value={input}
            onChange={setInput}
            onSend={handleSend}
            onStudyMaterialUpload={(files) => setPendingFiles((prev) => [...prev, ...Array.from(files)])}
          />

        </div>
      </div>
    </div>
  );
};
