import { CanvasToolbar } from './card-canvas/CanvasToolbar';
import { useCardCanvas } from './card-canvas/useCardCanvas';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

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
    // Editor
    editOpen,
    editId,
    editTitle,
    editDescription,
    editWidth,
    editHeight,
    setEditTitle,
    setEditDescription,
    setEditWidth,
    setEditHeight,
    setEditOpen,
    saveEdits,
    deleteEditedCard,
    editMode,
  } = useCardCanvas();

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full bg-[#272725]"
      style={{
        backgroundImage: 'radial-gradient(#3F3F3D 1px, transparent 1px)',
        backgroundSize: '22px 22px',
        backgroundPosition: '0 0',
      }}
    >
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

      {/* Edit Card Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md bg-[#1C1C1C] text-[#C5C1BA] border border-[#272725]">
          <DialogHeader>
            <DialogTitle className="text-[#E5E3DF]">{editMode === 'create' ? 'Create Card' : 'Edit Card'}</DialogTitle>
            <DialogDescription className="text-[#76746F]">{editMode === 'create' ? 'Set title, description, and size.' : 'Update title, description, and size.'}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <div className="text-xs text-[#B5B2AC] mb-1">Title</div>
              <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="h-8 bg-transparent border-[#3F3F3D] text-[#C5C1BA]" />
            </div>
            <div>
              <div className="text-xs text-[#B5B2AC] mb-1">Description</div>
              <Textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} className="bg-transparent border-[#3F3F3D] text-[#C5C1BA] min-h-[100px]" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-xs text-[#B5B2AC] mb-1">Width</div>
                <Input type="number" value={editWidth} onChange={(e) => setEditWidth(Math.max(140, Number(e.target.value) || 0))} className="h-8 bg-transparent border-[#3F3F3D] text-[#C5C1BA]" />
              </div>
              <div>
                <div className="text-xs text-[#B5B2AC] mb-1">Height</div>
                <Input type="number" value={editHeight} onChange={(e) => setEditHeight(Math.max(120, Number(e.target.value) || 0))} className="h-8 bg-transparent border-[#3F3F3D] text-[#C5C1BA]" />
              </div>
            </div>
            <div className="text-[11px] text-[#76746F]">Card ID: {editId}</div>
          </div>
          <DialogFooter className="flex items-center justify-between gap-2">
            <Button
              className="h-8 px-3 bg-[#DC2626] hover:bg-[#DC2626]/90 text-white"
              onClick={() => deleteEditedCard()}
            >
              Delete
            </Button>
            <div className="space-x-2">
              <Button variant="ghost" className="h-8 px-3 text-[#C5C1BA] hover:text-white hover:bg-[#272725]" onClick={() => setEditOpen(false)}>
                Cancel
              </Button>
              <Button className="h-8 px-3 bg-[#1E52F1] hover:bg-[#1E52F1]/90 text-white" onClick={() => saveEdits()}>
                {editMode === 'create' ? 'Create' : 'Save'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
