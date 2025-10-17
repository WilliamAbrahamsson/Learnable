import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Chat } from '@/components/Chat';
import { CardCanvas } from '@/components/CardCanvas';
import { Topbar } from '@/components/Topbar';
import { Columns2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const Index = () => {
  // splitPosition represents the canvas width percentage.
  // We want chat to default to 30% width, so canvas starts at 70%.
  const MIN_CHAT_PERCENT = 30;
  const [splitPosition, setSplitPosition] = useState(100 - MIN_CHAT_PERCENT);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const currentYear = new Date().getFullYear();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    try { const u = localStorage.getItem('learnableUser'); return u ? !!JSON.parse(u).is_admin : false; } catch { return false; }
  });
  useEffect(() => {
    const onAuth = () => {
      try { const u = localStorage.getItem('learnableUser'); setIsAdmin(u ? !!JSON.parse(u).is_admin : false); } catch { setIsAdmin(false); }
    };
    window.addEventListener('learnable-auth-changed', onAuth);
    return () => window.removeEventListener('learnable-auth-changed', onAuth);
  }, []);
  const [improveLearnable, setImproveLearnable] = useState<boolean>(() => {
    try {
      const raw = localStorage.getItem('learnable:improve');
      return raw ? raw === '1' : true; // default ON
    } catch {
      return true; // default ON
    }
  });

  useEffect(() => {
    try { localStorage.setItem('learnable:improve', improveLearnable ? '1' : '0'); } catch {}
    try { window.dispatchEvent(new Event('learnable-improve-changed')); } catch {}
  }, [improveLearnable]);

  const handleMouseDown = (e: React.MouseEvent) => {
    // Prevent text selection when grabbing the divider
    e.preventDefault();
    setIsDragging(true);
    try {
      document.body.style.userSelect = 'none';
      // Safari
      (document.body.style as any).webkitUserSelect = 'none';
      document.body.style.cursor = 'col-resize';
      window.getSelection()?.removeAllRanges();
    } catch {}
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;
      // Clear accidental selections while dragging
      try { window.getSelection()?.removeAllRanges(); } catch {}
      
      const containerRect = containerRef.current.getBoundingClientRect();
      const pointerPercent = ((e.clientX - containerRect.left) / containerRect.width) * 100;
      // Convert to chat width percent
      const chatPercent = 100 - pointerPercent;

      // If user tries to shrink chat below MIN_CHAT_PERCENT, snap closed (0%).
      if (chatPercent < MIN_CHAT_PERCENT) {
        setSplitPosition(100); // canvas 100%, chat 0%
      } else {
        // Otherwise, let it be exactly where the pointer is (smooth), but within bounds.
        const newPosition = Math.max(0, Math.min(100, pointerPercent));
        setSplitPosition(newPosition);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      try {
        document.body.style.userSelect = '';
        (document.body.style as any).webkitUserSelect = '';
        document.body.style.cursor = '';
      } catch {}
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const isCanvasFullscreen = splitPosition <= 5;
  const isChatFullscreen = splitPosition >= 95;
  const isChatCollapsed = splitPosition === 100;
  const isCanvasCollapsed = splitPosition === 0;
  const isFullscreen = isCanvasFullscreen || isChatFullscreen;

  // Auth state: if not signed in, show only chat
  const [isAuthed, setIsAuthed] = useState<boolean>(!!localStorage.getItem('learnableToken'));
  useEffect(() => {
    const onAuthChanged = () => {
      const authed = !!localStorage.getItem('learnableToken');
      setIsAuthed(authed);
      if (authed) {
        setSplitPosition(70); // canvas 70%, chat 30%
      }
    };
    window.addEventListener('learnable-auth-changed', onAuthChanged);
    return () => window.removeEventListener('learnable-auth-changed', onAuthChanged);
  }, []);

  const toggleChat = () => {
    if (isChatCollapsed) {
      setSplitPosition(100 - MIN_CHAT_PERCENT); // Open to default chat 30%
    } else {
      setSplitPosition(100); // Collapse chat
    }
  };

  const toggleCanvas = () => {
    if (isCanvasCollapsed) {
      setSplitPosition(40); // Restore to 40% canvas / 60% chat
    } else {
      setSplitPosition(0); // Collapse canvas
    }
  };

  return (
    <div className="flex flex-col h-screen w-full bg-[#1C1C1C] overflow-hidden">
      {/* Topbar */}
      <Topbar />
      
      {/* Main Content Area */}
      <div ref={containerRef} className="relative flex-1 overflow-hidden">
        {/* If not authed, only render chat full width */}
        {isAuthed && (
          <div className="absolute inset-0 bg-[#272725]">
            <CardCanvas rightOffsetPercent={100 - splitPosition} />
          </div>
        )}

        {/* Divider (draggable) */}
        {isAuthed && !isFullscreen && !isChatCollapsed && !isCanvasCollapsed && (
          <div
            className="absolute top-0 bottom-0 w-0 cursor-col-resize z-50"
            style={{ left: `${splitPosition}%` }}
            onMouseDown={handleMouseDown}
          >
            <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-12 bg-[#C5C1BA] hover:bg-[#C5C1BA]/80 rounded-full flex items-center justify-center transition-colors shadow">
              <Columns2 className="w-4 h-4 text-[#1C1C1C]" />
            </div>
          </div>
        )}

        {/* Chat Toggle Button (Right Edge) */}
        {isChatCollapsed && (
          <button
            onClick={toggleChat}
            className="absolute top-1/2 right-0 -translate-y-1/2 w-6 h-12 bg-[#C5C1BA] hover:bg-[#C5C1BA]/80 rounded-l-full flex items-center justify-center transition-colors z-10"
          >
            <Columns2 className="w-4 h-4 text-[#1C1C1C]" />
          </button>
        )}

        {/* Canvas Toggle Button (Left Edge) */}
        {isCanvasCollapsed && (
          <button
            onClick={toggleCanvas}
            className="absolute top-1/2 left-0 -translate-y-1/2 w-6 h-12 bg-[#C5C1BA] hover:bg-[#C5C1BA]/80 rounded-r-full flex items-center justify-center transition-colors z-10"
          >
            <Columns2 className="w-4 h-4 text-[#1C1C1C]" />
          </button>
        )}

        {/* Chat Overlay (right side) */}
        <div
          className={`absolute inset-y-0 right-0 bg-[#1C1C1C] overflow-hidden z-40 ${
            isDragging ? '' : 'transition-[width] duration-200 ease-out will-change-[width]'
          }`}
          style={{ width: isAuthed ? `${100 - splitPosition}%` : '100%' }}
        >
          <div className={`${splitPosition >= 95 ? 'invisible' : 'visible'} h-full`}>
            <Chat />
          </div>
        </div>
      </div>
      <footer className="relative border-t border-[#272725] py-3 text-center text-xs text-[#76746F]">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center space-x-3">
          <a href="/terms#terms" className="text-[#C5C1BA] hover:text-white underline-offset-4 hover:underline">Terms</a>
          <a href="/terms#privacy" className="text-[#C5C1BA] hover:text-white underline-offset-4 hover:underline">Privacy</a>
          <a href="/terms#cookies" className="text-[#C5C1BA] hover:text-white underline-offset-4 hover:underline">Cookies</a>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-2 text-xs text-[#C5C1BA] cursor-default">
                  <span className="opacity-80">Improve Learnable</span>
                  <Switch
                    checked={improveLearnable}
                    onCheckedChange={(v) => {
                      if (!v) {
                        // Redirect to subscriptions when turning off, keep toggle ON
                        try { navigate('/subs'); } catch {}
                        setImproveLearnable(true);
                      } else {
                        setImproveLearnable(true);
                      }
                    }}
                    className="data-[state=checked]:bg-[#1E52F1]"
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent className="bg-[#1C1C1C] text-[#C5C1BA] border border-[#272725] max-w-xs">
                When on, you share your graphs and chats with Learnable to help improve the product. Toggle off for private mode.
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        {isAdmin && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <Button className="h-7 px-3 bg-[#1E52F1] hover:bg-[#1E52F1]/90 text-white" onClick={() => navigate('/admin')}>
              Admin Panel
            </Button>
          </div>
        )}
        © {currentYear} Learnable. All rights reserved.
      </footer>
    </div>
  );
};

export default Index;
