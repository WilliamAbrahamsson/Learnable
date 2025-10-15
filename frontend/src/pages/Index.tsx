import { useState, useRef, useEffect } from 'react';
import { Chat } from '@/components/Chat';
import { CardCanvas } from '@/components/CardCanvas';
import { Topbar } from '@/components/Topbar';
import { Columns2 } from 'lucide-react';

const Index = () => {
  const [splitPosition, setSplitPosition] = useState(50); // percentage
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
      let newPosition = ((e.clientX - containerRect.left) / containerRect.width) * 100;
      
      // Auto-snap chat if it goes below 40%
      if (newPosition > 60) {
        newPosition = 100;
      }
      // Auto-snap canvas if it goes below 40%
      if (newPosition < 40) {
        newPosition = 0;
      }
      
      // Clamp between 0 and 100
      setSplitPosition(Math.max(0, Math.min(100, newPosition)));
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

  const toggleChat = () => {
    if (isChatCollapsed) {
      setSplitPosition(60); // Restore to 60% canvas / 40% chat
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
        {/* Canvas spans full area; chat overlays on top */}
        <div className="absolute inset-0 bg-[#272725]">
          <CardCanvas rightOffsetPercent={100 - splitPosition} />
        </div>

        {/* Divider (draggable) */}
        {!isFullscreen && !isChatCollapsed && !isCanvasCollapsed && (
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
          className="absolute inset-y-0 right-0 bg-[#1C1C1C] overflow-hidden z-40 transition-[width]"
          style={{ width: `${100 - splitPosition}%` }}
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
