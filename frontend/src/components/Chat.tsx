import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Copy, ThumbsUp, ThumbsDown, RefreshCw, Mic, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
  isGenerating?: boolean;
  showProposal?: boolean;
}

export const Chat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000';

  const fetchAssistantResponse = async (prompt: string, assistantId: string) => {
    try {
      const response = await fetch(`${apiBaseUrl}/api/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: prompt }),
      });

      if (!response.ok || !response.body) {
        throw new Error('Failed to fetch response');
      }

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

          if (!eventChunk.startsWith('data:')) {
            continue;
          }

          const payload = eventChunk.slice(5).trim();
          if (!payload) {
            continue;
          }

          if (payload === '[DONE]') {
            handledDone = true;
            break;
          }

          try {
            const parsed: { content?: string } = JSON.parse(payload);
            const content = parsed.content ?? '';
            if (!content) {
              continue;
            }

            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantId
                  ? { ...msg, text: `${msg.text ?? ''}${content}` }
                  : msg
              )
            );
          } catch (parseError) {
            console.error('Failed to parse stream chunk', parseError);
          }
        }

        if (handledDone) {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantId ? { ...msg, isGenerating: false, showProposal: true } : msg
            )
          );
        }

        return handledDone;
      };

      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        if (processBuffer()) {
          return;
        }
      }

      buffer += decoder.decode();
      if (processBuffer()) {
        return;
      }

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantId
            ? { ...msg, isGenerating: false, showProposal: true }
            : msg
        )
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Something went wrong';

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantId
            ? {
                ...msg,
                text: "Sorry, I couldn't reach the server. Please try again.",
                isGenerating: false,
              }
            : msg
        )
      );

      toast({
        variant: 'destructive',
        description: errorMessage,
      });
    }
  };

  const renderMessageText = (text: string) => {
    const segments = text.split(/(\*\*[^*]+\*\*)/g);

    return segments.map((segment, index) => {
      if (segment.startsWith('**') && segment.endsWith('**')) {
        const content = segment.slice(2, -2);
        return (
          <strong key={index} className="font-semibold">
            {content}
          </strong>
        );
      }

      return <span key={index}>{segment}</span>;
    });
  };

  const defaultProposal = {
    title: 'TCP/IP Protocol',
    description:
      'Core communication protocols including TCP, UDP, and IP. Covers addressing, routing, ports & sockets, congestion control, fragmentation/MTU, and practical usage patterns across layers.',
  };

  const handleAcceptProposal = async (messageId: string) => {
    const msg = messages.find((m) => m.id === messageId);
    if (!msg) return;
    const { title, description } = defaultProposal;
    const token = localStorage.getItem('learnableToken');
    if (!token) {
      toast({ variant: 'destructive', description: 'Please sign in to add notes.' });
      return;
    }
    try {
      const res = await fetch(`${apiBaseUrl}/api/graph/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: title, description }),
      });
      if (!res.ok) {
        throw new Error(await res.text());
      }
      setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, showProposal: false } : m)));
      toast({ description: 'Added to graph.' });
    } catch (err) {
      toast({ variant: 'destructive', description: 'Failed to add note.' });
    }
  };

  const handleDenyProposal = (messageId: string) => {
    setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, showProposal: false } : m)));
  };

  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
      return;
    }
    if (e.key === ' ' || e.code === 'Space') {
      e.stopPropagation();
    }
  };

  const handleSend = () => {
    if (!input.trim()) return;

    const trimmedInput = input.trim();
    const userMessage: Message = {
      id: Date.now().toString(),
      text: trimmedInput,
      sender: 'user',
      timestamp: new Date(),
    };

    const assistantId = `${Date.now().toString()}-assistant`;
    const assistantPlaceholder: Message = {
      id: assistantId,
      text: '',
      sender: 'assistant',
      timestamp: new Date(),
      isGenerating: true,
    };

    setMessages((prev) => [...prev, userMessage, assistantPlaceholder]);
    setInput('');

    void fetchAssistantResponse(trimmedInput, assistantId);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      description: "Copied to clipboard",
      duration: 2000,
    });
  };

  const handleThumbsUp = () => {
    toast({
      description: "Thanks for your feedback!",
      duration: 2000,
    });
  };

  const handleThumbsDown = () => {
    toast({
      description: "Thanks for your feedback!",
      duration: 2000,
    });
  };

  const handleRefresh = (messageId: string) => {
    const messageIndex = messages.findIndex((m) => m.id === messageId);
    if (messageIndex <= 0) return;

    const userMessage = messages[messageIndex - 1];
    if (!userMessage || userMessage.sender !== 'user') return;

    const refreshedAssistantId = `${Date.now().toString()}-assistant`;
    const refreshedAssistant: Message = {
      id: refreshedAssistantId,
      text: '',
      sender: 'assistant',
      timestamp: new Date(),
      isGenerating: true,
    };

    setMessages((prev) => {
      const filtered = prev.filter((msg) => msg.id !== messageId);
      const insertionIndex = filtered.findIndex((msg) => msg.id === userMessage.id);
      if (insertionIndex === -1) {
        return filtered;
      }

      const before = filtered.slice(0, insertionIndex + 1);
      const after = filtered.slice(insertionIndex + 1);
      return [...before, refreshedAssistant, ...after];
    });

    void fetchAssistantResponse(userMessage.text, refreshedAssistantId);
  };

  return (
    <div className="flex h-full w-full flex-col bg-[#1C1C1C]">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-[15px] py-6 pb-12">
        <div className="max-w-4xl mx-auto h-full">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full space-y-6 select-none">
              <div className="flex items-center gap-3">
                <span className="inline-block bg-[#1E52F1] text-white font-medium px-4 py-2 select-none" style={{ borderRadius: '4px', fontSize: '16px' }}>
                  L
                </span>
                <span className="text-[#C5C1BA] font-semibold select-none" style={{ fontSize: '22px' }}>
                  Learnable
                </span>
              </div>
              <h1 className="text-3xl font-semibold text-[#C5C1BA] text-center select-none">Let&apos;s learn together; pick any topic to get started.</h1>
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className="flex flex-col"
                >
                  <div className={`${message.sender === 'user' ? 'ml-auto mr-[15px]' : 'mr-auto'} max-w-[85%]`}>
                    {message.sender === 'assistant' && (
                      <div className="mb-2 ml-[15px] flex items-center gap-2">
                        <span className="inline-block bg-[#1E52F1] text-white text-xs font-semibold px-2.5 py-1" style={{ borderRadius: '4px' }}>
                          L
                        </span>
                        <span className="text-[#C5C1BA] text-xs font-medium">
                          Learnable
                        </span>
                      </div>
                    )}
                    
                    <div
                      className={`px-5 py-3 ${
                        message.sender === 'user'
                          ? 'bg-[#272725] text-[#C5C1BA]'
                          : 'bg-transparent text-[#C5C1BA] rounded-2xl'
                      }`}
                      style={message.sender === 'user' ? { borderRadius: '4px' } : { borderRadius: '16px' }}
                    >
                      {message.sender === 'assistant' && message.isGenerating && !message.text && (
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-[#C5C1BA] animate-pulse" />
                        </div>
                      )}
                      {message.text && (
                        <p className="text-[15px] leading-relaxed whitespace-pre-wrap break-words">
                          {renderMessageText(message.text)}
                        </p>
                      )}
                    </div>
                    
                    {message.sender === 'assistant' && !message.isGenerating && message.text && (
                      <div className="flex items-center gap-1 mt-2 ml-[15px]">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-[#C5C1BA] hover:text-white hover:bg-[#272725]"
                          onClick={() => handleCopy(message.text)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-[#C5C1BA] hover:text-white hover:bg-[#272725]"
                          onClick={handleThumbsUp}
                        >
                          <ThumbsUp className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-[#C5C1BA] hover:text-white hover:bg-[#272725]"
                          onClick={handleThumbsDown}
                        >
                          <ThumbsDown className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-[#C5C1BA] hover:text-white hover:bg-[#272725]"
                          onClick={() => handleRefresh(message.id)}
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      </div>
                    )}

                    {message.sender === 'assistant' && !message.isGenerating && message.text && message.showProposal && (
                      <div className="ml-[15px] mt-3">
                        <div className="w-full rounded-lg border border-[#3F3F3D] bg-[#2F2F2C] p-4">
                          <div className="mb-2">
                            <div className="text-sm font-semibold text-[#E5E3DF]">{defaultProposal.title}</div>
                            <div className="text-xs text-[#B5B2AC] mt-1">{defaultProposal.description}</div>
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <Button
                              onClick={() => handleAcceptProposal(message.id)}
                              className="h-8 px-3 text-white bg-emerald-600 hover:bg-emerald-600/90"
                            >
                              Add to graph
                            </Button>
                            <Button
                              onClick={() => handleDenyProposal(message.id)}
                              className="h-8 px-3 text-white bg-rose-600 hover:bg-rose-600/90"
                              variant="ghost"
                            >
                              Dismiss
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div className="h-16" />
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* Input Area - Fixed at bottom */}
      <div className="bg-[#1C1C1C] flex-shrink-0" style={{ paddingLeft: '8px', paddingRight: '8px', paddingBottom: '10px' }}>
        <div className="w-full overflow-hidden" style={{ border: '0.5px solid #76746F', borderRadius: '16px' }}>
          {/* Text Input */}
          <div className="relative bg-[#272725]">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleTextareaKeyDown}
              placeholder="Ask Learnable ..."
              className="flex-1 bg-transparent border-0 text-[#C5C1BA] placeholder:text-gray-500 focus-visible:ring-0 focus-visible:ring-offset-0 resize-none min-h-[56px] max-h-[200px] py-4 px-5 text-[15px] leading-relaxed overflow-hidden"
              rows={1}
            />
          </div>
          
          {/* Control Bar */}
          <div className="flex items-center justify-between bg-[#272725] px-3 py-2">
            {/* Left Side - Upload Button */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-[#C5C1BA] hover:text-white hover:bg-[#1C1C1C]"
            >
              <Plus className="h-5 w-5" />
            </Button>
            
            {/* Right Side - Mic and Send */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-[#C5C1BA] hover:text-white hover:bg-[#1C1C1C]"
              >
                <Mic className="h-5 w-5" />
              </Button>
              <Button
                onClick={handleSend}
                disabled={!input.trim()}
                size="icon"
                className="h-8 w-8 rounded-full bg-[#1E52F1] hover:bg-[#1E52F1]/90 disabled:bg-gray-600 disabled:cursor-not-allowed transition-all"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
