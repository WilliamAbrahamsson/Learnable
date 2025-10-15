import { CanvasToolbar } from './card-canvas/CanvasToolbar';
import { useCardCanvas } from './card-canvas/useCardCanvas';

type Props = {
  // Percentage of the container width occupied by the right overlay (chat)
  rightOffsetPercent?: number;
};

export const CardCanvas = ({ rightOffsetPercent = 0 }: Props) => {
  const {
    canvasRef,
    containerRef,
    addMenuRef,
    isAddMenuOpen,
    toggleAddMenu,
    handleAddTextCard,
    handleAddImageCard,
    zoomIn,
    zoomOut,
  } = useCardCanvas();

  return (
    <div ref={containerRef} className="relative h-full w-full bg-[#272725]">
      <CanvasToolbar
        rightOffsetPercent={rightOffsetPercent}
        isMenuOpen={isAddMenuOpen}
        menuRef={addMenuRef}
        onToggleMenu={toggleAddMenu}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onAddText={handleAddTextCard}
        onAddImage={handleAddImageCard}
      />
      <canvas ref={canvasRef} />
    </div>
  );
};
