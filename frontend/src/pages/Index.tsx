import { useState, useRef, useEffect } from 'react';
import { Chat } from '@/components/Chat';
import { CardCanvas } from '@/components/CardCanvas';
import { Topbar } from '@/components/Topbar';
import { Columns2 } from 'lucide-react';

const Index = () => {
  // splitPosition represents the canvas width percentage.
  // We want chat to default to 30% width, so canvas starts at 70%.
  const MIN_CHAT_PERCENT = 30;
  const [splitPosition, setSplitPosition] = useState(100 - MIN_CHAT_PERCENT);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const currentYear = new Date().getFullYear();

  const handleMouseDown = () => {
    setIsDragging(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;
      
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
      <footer className="border-t border-[#272725] py-3 text-center text-xs text-[#76746F]">
        © {currentYear} Learnable. All rights reserved.
      </footer>
    </div>
  );
};

export default Index;
