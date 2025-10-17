import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as fabric from 'fabric';

import { useCanvasData } from '@/hooks/useCanvasData';
import { useCanvasInit } from '@/hooks/useCardCanvasInit';
import {
  createHandles,
  bringHandlesToFront,
  drawConnections,
} from '@/hooks/useCardCanvasHandlers';
import { useCanvasInteractions } from '@/hooks/useCardCanvasInteractions';
import { useConnectionDrag } from '@/hooks/useConnectionDrag';
import {
  DEFAULT_TEXT_DESCRIPTION,
  DEFAULT_TEXT_TITLE,
  DEFAULT_IMAGE_URL,
} from '@/constants/cardDefaults';
import { createCard } from '@/utils/cardFactory';
import { updateConnectionLines } from '@/utils/connectionHandles';
import { CardData } from '@/types/canvas';

type FabricCanvas = fabric.Canvas;

export const useCardCanvas = (graphId?: number | null) => {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000';
  const { loadInitialData } = useCanvasInit(apiBaseUrl, graphId ?? undefined);

  const {
    cardGroupsRef,
    cardHandlesRef,
    connectionLinesRef,
    cardTextRefs,
    tempLineRef,
    draggedRef,
    cardsRef,
    nextCardIndexRef,
  } = useCanvasData();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const addMenuRef = useRef<HTMLDivElement>(null);

  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const [isDraggingConnection, setIsDraggingConnection] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  // Editor state for selected card
  const [editOpen, setEditOpen] = useState(false);
  const [editMode, setEditMode] = useState<'edit' | 'create'>('edit');
  const [editId, setEditId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState<string>('');
  const [editDescription, setEditDescription] = useState<string>('');
  const [editWidth, setEditWidth] = useState<number>(280);
  const [editHeight, setEditHeight] = useState<number>(200);

  // 🔥 Remove card and artifacts
  const removeCardArtifacts = useCallback(
    (canvas: FabricCanvas, cardId: string) => {
      const group = cardGroupsRef.current.get(cardId);
      if (group) {
        canvas.remove(group);
        cardGroupsRef.current.delete(cardId);
      }

      const handles = cardHandlesRef.current.get(cardId);
      if (handles) {
        handles.forEach((handle) => canvas.remove(handle));
        cardHandlesRef.current.delete(cardId);
      }

      const toDelete: string[] = [];
      connectionLinesRef.current.forEach(({ line, startHandle, endHandle }, key) => {
        const startId = (startHandle as any)?.cardId;
        const endId = (endHandle as any)?.cardId;
        if (startId === cardId || endId === cardId) {
          canvas.remove(line);
          toDelete.push(key);
        }
      });
      toDelete.forEach((key) => connectionLinesRef.current.delete(key));
    },
    [cardGroupsRef, cardHandlesRef, connectionLinesRef]
  );

  // 🔥 Initialize all objects
  const initializeCanvasObjects = useCallback(
    async (canvas: FabricCanvas) => {
      canvas.getObjects().forEach((obj) => canvas.remove(obj));
      canvas.backgroundColor = 'rgba(0,0,0,0)';
      canvas.requestRenderAll();

      // clear refs
      cardGroupsRef.current.clear();
      cardHandlesRef.current.clear();
      connectionLinesRef.current.clear();
      cardTextRefs.current.clear();
      tempLineRef.current = null;
      draggedRef.current = null;

      // create cards from DB
      const creationPromises = cardsRef.current.map((card, index) =>
        createCard(
          canvas,
          card,
          index,
          cardGroupsRef,
          cardTextRefs,
          (cnv, group, id, width, height, padding) =>
            createHandles(
              cnv,
              group,
              id,
              width,
              height,
              padding,
              cardHandlesRef,
              connectionLinesRef,
              tempLineRef,
              draggedRef,
              setIsDraggingConnection
            )
        )
      );

      await Promise.all(creationPromises);

      // draw connections
      drawConnections(canvas, cardsRef, cardHandlesRef, connectionLinesRef, (cardsRef as any).connectionsFromDB);
      bringHandlesToFront(canvas, cardHandlesRef);
      canvas.requestRenderAll();
      setIsLoaded(true);
    },
    [
      cardGroupsRef,
      cardHandlesRef,
      cardTextRefs,
      connectionLinesRef,
      cardsRef,
      tempLineRef,
      draggedRef,
      setIsDraggingConnection,
    ]
  );

  // 🔥 Delete card (local only)
  const deleteCard = useCallback(
    (cardId: string) => {
      if (!fabricCanvas) return;
      removeCardArtifacts(fabricCanvas, cardId);

      cardsRef.current = cardsRef.current
        .filter((card) => card.id !== cardId)
        .map((card) => ({
          ...card,
          connections: card.connections?.filter((targetId) => targetId !== cardId),
        }));

      updateConnectionLines(fabricCanvas, cardHandlesRef, cardGroupsRef, connectionLinesRef);
      fabricCanvas.discardActiveObject();
      fabricCanvas.requestRenderAll();
    },
    [fabricCanvas, removeCardArtifacts, cardsRef, cardHandlesRef, cardGroupsRef, connectionLinesRef]
  );

  const deleteConnection = useCallback(
    (line: fabric.Line) => {
      if (!fabricCanvas) return;
      let foundKey: string | null = null;
      let sourceId: string | null = null;
      let targetId: string | null = null;
      for (const [key, entry] of connectionLinesRef.current.entries()) {
        if (entry.line === line) {
          foundKey = key;
          sourceId = (entry.startHandle as any)?.cardId ?? null;
          targetId = (entry.endHandle as any)?.cardId ?? null;
          break;
        }
      }
      if (!foundKey || !sourceId || !targetId) return;

      fabricCanvas.remove(line);
      connectionLinesRef.current.delete(foundKey);
      cardsRef.current = cardsRef.current.map((c) =>
        c.id === sourceId
          ? { ...c, connections: (c.connections ?? []).filter((t) => t !== targetId) }
          : c.id === targetId
            ? { ...c, connections: (c.connections ?? []).filter((t) => t !== sourceId) }
            : c
      );
      fabricCanvas.requestRenderAll();

      const token = localStorage.getItem('learnableToken');
      const a = Number(sourceId);
      const b = Number(targetId);
      if (token && Number.isFinite(a) && Number.isFinite(b)) {
        const url = new URL(`${apiBaseUrl}/api/graph/connections`);
        url.searchParams.set('note_id_1', String(a));
        url.searchParams.set('note_id_2', String(b));
        fetch(url.toString(), {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => void 0);
      }
    }, [fabricCanvas, connectionLinesRef, cardsRef, apiBaseUrl]);

  const { zoom } = useCanvasInteractions(
    fabricCanvas,
    apiBaseUrl,
    deleteCard,
    deleteConnection
  );

  // connection dragging hook
  useConnectionDrag(
    fabricCanvas,
    apiBaseUrl,
    tempLineRef,
    draggedRef,
    cardHandlesRef,
    connectionLinesRef,
    setIsDraggingConnection
  );

  // 🔥 Initialize Fabric canvas
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    // Global Fabric selection styling: remove default blue boxes
    try {
      (fabric.Object.prototype as any).borderColor = '#3F3F3D';
      (fabric.Object.prototype as any).cornerColor = '#3F3F3D';
      (fabric.Object.prototype as any).cornerStrokeColor = '#3F3F3D';
      (fabric.Object.prototype as any).transparentCorners = false;
      if ((fabric as any).ActiveSelection) {
        // Hide the single group box that wraps multiple selected objects,
        // but keep individual object boxes visible.
        (fabric.ActiveSelection.prototype as any).hasBorders = false;
        (fabric.ActiveSelection.prototype as any).hasControls = false;
        (fabric.ActiveSelection.prototype as any).transparentCorners = true;
        // Ensure the selection is still draggable even without visible group box
        (fabric.ActiveSelection.prototype as any).perPixelTargetFind = true;
      }
    } catch {}

    const canvas = new fabric.Canvas(canvasRef.current, {
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
      backgroundColor: 'rgba(0,0,0,0)',
      preserveObjectStacking: true,
      // Make marquee (multi‑select) overlay gray instead of blue
      selectionColor: 'rgba(63,63,61,0.20)', // #3F3F3D @ 20%
      selectionBorderColor: '#3F3F3D',
      selectionLineWidth: 1,
      selectionDashArray: [4, 4],
    });

    setFabricCanvas(canvas);

    const setup = async () => {
      await loadInitialData(cardsRef, nextCardIndexRef);
      await initializeCanvasObjects(canvas);
    };

    void setup();

    const handleResize = () => {
      if (!containerRef.current) return;
      canvas.setDimensions({
        width: containerRef.current.clientWidth,
        height: containerRef.current.clientHeight,
      });
      canvas.requestRenderAll();
    };

    // Resize when the window changes OR when the container div resizes
    const resizeObserver = new ResizeObserver(() => handleResize());
    if (containerRef.current) resizeObserver.observe(containerRef.current);
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
      canvas.dispose();
      setFabricCanvas(null);
    };
  }, [initializeCanvasObjects, loadInitialData, cardsRef, nextCardIndexRef]);

  // Open editor when the edit button on a card is clicked
  useEffect(() => {
    if (!fabricCanvas) return;
    const handleMouseDown = (opt: any) => {
      // Check subTargets first for the edit button
      const sub = (opt as any).subTargets as any[] | undefined;
      const clicked = (sub && sub.find?.((o: any) => o?.isEditButton)) || (opt as any).target;
      if (!clicked || !(clicked as any).isEditButton) return;

      // Parent group holds the cardId
      const parent = (clicked as any).group as (fabric.Group & { cardId?: string }) | undefined;
      const id = (parent as any)?.cardId as string | undefined;
      if (!id) return;
      const texts = cardTextRefs.current.get(id);
      const cg = cardGroupsRef.current.get(id);
      if (!cg) return;
      const objs = (cg as any)._objects as any[];
      const background = objs?.find?.((o) => (o as any).isBackground) || null;
      const curW = Math.round(((background?.width as number) ?? (cg as any).cardWidth ?? 280));
      const curH = Math.round(((background?.height as number) ?? (cg as any).cardHeight ?? 200));
      setEditId(id);
      setEditTitle(texts?.title?.text ?? 'Card');
      setEditDescription(texts?.desc?.text ?? '');
      setEditWidth(curW);
      setEditHeight(curH);
      setEditMode('edit');
      setEditOpen(true);
    };
    fabricCanvas.on('mouse:down', handleMouseDown);
    return () => {
      fabricCanvas.off('mouse:down', handleMouseDown);
    };
  }, [fabricCanvas, cardTextRefs, cardGroupsRef]);

  // Save edits to DB and canvas
  const saveEdits = useCallback(async () => {
    if (!editId || !fabricCanvas) return;
    const id = editId;
    const token = localStorage.getItem('learnableToken');
    if (token) {
      try {
        const res = await fetch(`${apiBaseUrl}/api/graph/notes/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ name: editTitle, description: editDescription, width: editWidth, height: editHeight }),
        });
        if (!res.ok) {
          // eslint-disable-next-line no-console
          console.error('Failed to save card edits:', await res.text());
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('Save error', e);
      }
    }

    // Update local canvas
    const group = cardGroupsRef.current.get(id);
    const texts = cardTextRefs.current.get(id);
    if (group && texts) {
      const objs = (group as any)._objects as any[];
      const hover = objs?.find?.((o) => (o as any).isHoverArea) || null;
      const background = objs?.find?.((o) => (o as any).isBackground) || null;
      const editBtn = objs?.find?.((o) => (o as any).isEditButton) || null;
      const editGlyph = objs?.find?.((o) => (o as any).isEditGlyph) || null;
      const btnSize = 22, btnPad = 8;

      // Determine if size changed BEFORE touching text (for stable widths)
      const prevW = (background as any)?.width as number | undefined;
      const prevH = (background as any)?.height as number | undefined;
      const sizeChanged = prevW !== undefined && prevH !== undefined &&
        (Math.round(prevW) !== Math.round(editWidth) || Math.round(prevH) !== Math.round(editHeight));

      // Update text without moving it: preserve current left/top, only change width if size changed
      const prevTitleLeft = texts.title.left ?? 20;
      const prevTitleTop = texts.title.top ?? 15;
      const prevDescLeft = texts.desc.left ?? 20;
      const prevDescTop = texts.desc.top ?? 45;
      const prevTitleWidth = Math.round((texts.title.width as number) ?? (editWidth - 40));
      const prevDescWidth = Math.round((texts.desc.width as number) ?? (editWidth - 40));

      // Apply text changes
      texts.title.set({ text: editTitle, scaleX: 1, scaleY: 1 });
      texts.desc.set({ text: editDescription, scaleX: 1, scaleY: 1 });

      // Only adjust widths if the card width actually changed
      if (sizeChanged) {
        texts.title.set({ width: editWidth - 40 });
        texts.desc.set({ width: editWidth - 40 });
      } else {
        // Keep previous widths (avoid any reflow-based nudges)
        texts.title.set({ width: prevTitleWidth });
        texts.desc.set({ width: prevDescWidth });
      }

      // Restore exact positions
      texts.title.set({ left: prevTitleLeft, top: prevTitleTop });
      texts.desc.set({ left: prevDescLeft, top: prevDescTop });
      texts.title.setCoords();
      texts.desc.setCoords();
      // Update sizes (only if changed) to avoid tiny nudges
      if (background && sizeChanged) background.set({ width: editWidth, height: editHeight });
      if (hover && sizeChanged) hover.set({ width: editWidth + 2 * 25, height: editHeight + 2 * 25, left: -25, top: -25 });
      if (editBtn && sizeChanged) (editBtn as any).set({ left: editWidth - btnSize - btnPad, top: btnPad });
      if (editGlyph && sizeChanged) (editGlyph as any).set({ left: editWidth - btnSize - btnPad + 5, top: btnPad + 2 });
      (group as any).cardWidth = editWidth;
      (group as any).cardHeight = editHeight;
      // Keep group origin stable — avoid recalculating bounds which can shift children
      group.setCoords();
      updateConnectionLines(fabricCanvas, cardHandlesRef, cardGroupsRef, connectionLinesRef);
      bringHandlesToFront(fabricCanvas, cardHandlesRef);
      fabricCanvas.requestRenderAll();
    }
    // Update cached cards data for re-init
    cardsRef.current = cardsRef.current.map((c) => (c.id === id ? { ...c, title: editTitle, description: editDescription, width: editWidth, height: editHeight } : c));
    setEditOpen(false);
  }, [editId, editTitle, editDescription, editWidth, editHeight, apiBaseUrl, fabricCanvas, cardGroupsRef, cardTextRefs, cardHandlesRef, connectionLinesRef, cardsRef]);

  // Delete currently edited card (local + backend)
  const deleteEditedCard = useCallback(async () => {
    if (!editId) return;
    const id = editId;
    // Remove locally
    deleteCard(id);
    setEditOpen(false);
    setEditId(null);
    // Backend delete
    try {
      const token = localStorage.getItem('learnableToken');
      if (token) {
        await fetch(`${apiBaseUrl}/api/graph/notes/${id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch {
      // ignore network errors for delete here
    }
  }, [editId, deleteCard, apiBaseUrl]);

  // 🔥 Sync handle positions when any object moved (works for single and multi‑select)
  useEffect(() => {
    if (!fabricCanvas) return;

    const handleObjectMove = (
      e: fabric.TEvent<fabric.TPointerEvent> | fabric.ModifiedEvent<fabric.TPointerEvent>
    ) => {
      if (!('target' in e) || !e.target) return;
      // Recompute handle positions from card bounds to keep dots on edges for all moved items
      updateConnectionLines(fabricCanvas, cardHandlesRef, cardGroupsRef, connectionLinesRef);
      fabricCanvas.requestRenderAll();
    };

    fabricCanvas.on('object:moving', handleObjectMove);
    fabricCanvas.on('object:modified', handleObjectMove);

    return () => {
      fabricCanvas.off('object:moving', handleObjectMove);
      fabricCanvas.off('object:modified', handleObjectMove);
    };
  }, [fabricCanvas, cardHandlesRef, cardGroupsRef, connectionLinesRef]);

  // ✅ Fixed Add Card with POST request
  const addCard = useCallback(
    async (type: 'text' | 'image', openEditorOnCreate: boolean = false) => {
      if (!fabricCanvas) return;

      // Temporary ID (used until backend returns real one)
      const tempId = `card-${Date.now()}`;
      const newCard: CardData = {
        id: tempId,
        title: openEditorOnCreate ? '' : DEFAULT_TEXT_TITLE,
        description: openEditorOnCreate ? '' : DEFAULT_TEXT_DESCRIPTION,
        color: '#1C1C1C',
        type,
        imageUrl: type === 'image' ? DEFAULT_IMAGE_URL : undefined,
        connections: [],
        width: 280,
        height: 200,
        x: 100 + Math.random() * 300,
        y: 100 + Math.random() * 300,
      };

      // Add card locally to UI
      cardsRef.current.push(newCard);
      nextCardIndexRef.current += 1;

      await createCard(
        fabricCanvas,
        newCard,
        cardsRef.current.length - 1,
        cardGroupsRef,
        cardTextRefs,
        (cnv, group, cardId, width, height, padding) =>
          createHandles(
            cnv,
            group,
            cardId,
            width,
            height,
            padding,
            cardHandlesRef,
            connectionLinesRef,
            tempLineRef,
            draggedRef,
            setIsDraggingConnection
          )
      );

      updateConnectionLines(fabricCanvas, cardHandlesRef, cardGroupsRef, connectionLinesRef);
      bringHandlesToFront(fabricCanvas, cardHandlesRef);
      fabricCanvas.requestRenderAll();

      // ✅ Backend: Create new note (POST)
      const token = localStorage.getItem('learnableToken');
      try {
        const res = await fetch(`${apiBaseUrl}/api/graph/notes`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: newCard.title,
            description: newCard.description,
            x_pos: newCard.x,
            y_pos: newCard.y,
            width: newCard.width,
            height: newCard.height,
            image_url: newCard.imageUrl,
            graph_id: (window as any).learnableActiveGraphId || undefined,
          }),
        });

        if (!res.ok) {
          console.error('Create note failed:', await res.text());
          return;
        }

        const saved = await res.json();
        const realId = String(saved.id);

        // Replace temp ID with real ID in all references
        const cardIndex = cardsRef.current.findIndex((c) => c.id === tempId);
        if (cardIndex !== -1) {
          cardsRef.current[cardIndex].id = realId;
        }

        const group = cardGroupsRef.current.get(tempId);
        if (group) {
          (group as any).cardId = realId;
          cardGroupsRef.current.delete(tempId);
          cardGroupsRef.current.set(realId, group);
        }

        const handles = cardHandlesRef.current.get(tempId);
        if (handles) {
          handles.forEach((h: any) => (h.cardId = realId));
          cardHandlesRef.current.delete(tempId);
          cardHandlesRef.current.set(realId, handles);
        }

        // Also migrate text refs from tempId -> realId so edits update immediately
        const textRefs = cardTextRefs.current.get(tempId);
        if (textRefs) {
          cardTextRefs.current.delete(tempId);
          cardTextRefs.current.set(realId, textRefs);
        }

        console.info(`✅ Synced new card ${tempId} → ${realId}`);

        if (openEditorOnCreate) {
          try {
            const texts = cardTextRefs.current.get(realId);
            const cg = cardGroupsRef.current.get(realId);
            const objs = (cg as any)?._objects as any[] | undefined;
            const background = objs?.find?.((o) => (o as any).isBackground) || null;
            const curW = Math.round(((background?.width as number) ?? (cg as any)?.cardWidth ?? 280));
            const curH = Math.round(((background?.height as number) ?? (cg as any)?.cardHeight ?? 200));
            setEditId(realId);
            setEditTitle(texts?.title?.text ?? '');
            setEditDescription(texts?.desc?.text ?? '');
            setEditWidth(curW);
            setEditHeight(curH);
            setEditMode('create');
            setEditOpen(true);
          } catch {}
        }
      } catch (err) {
        console.error('Create note error:', err);
      }
    },
    [
      fabricCanvas,
      cardsRef,
      nextCardIndexRef,
      cardGroupsRef,
      cardTextRefs,
      cardHandlesRef,
      connectionLinesRef,
      tempLineRef,
      draggedRef,
      setIsDraggingConnection,
      apiBaseUrl,
    ]
  );

  // ✅ Add an already-created note (e.g., from Chat) without re-posting to backend
  const addExistingNoteToCanvas = useCallback(
    async (note: any) => {
      if (!fabricCanvas) return;
      const id = String(note.id);
      // Prevent duplicates if the note somehow already exists on canvas
      if (cardsRef.current.some((c) => c.id === id)) return;

      const newCard: CardData = {
        id,
        title: note.name || DEFAULT_TEXT_TITLE,
        description: note.description || DEFAULT_TEXT_DESCRIPTION,
        color: '#1C1C1C',
        type: note.image_url ? 'image' : 'text',
        imageUrl: note.image_url || undefined,
        connections: [],
        width: Number(note.width ?? 280),
        height: Number(note.height ?? 200),
        x: Number(note.x_pos ?? 100),
        y: Number(note.y_pos ?? 100),
      };

      cardsRef.current.push(newCard);
      nextCardIndexRef.current += 1;

      await createCard(
        fabricCanvas,
        newCard,
        cardsRef.current.length - 1,
        cardGroupsRef,
        cardTextRefs,
        (cnv, group, cardId, width, height, padding) =>
          createHandles(
            cnv,
            group,
            cardId,
            width,
            height,
            padding,
            cardHandlesRef,
            connectionLinesRef,
            tempLineRef,
            draggedRef,
            setIsDraggingConnection
          )
      );

      updateConnectionLines(fabricCanvas, cardHandlesRef, cardGroupsRef, connectionLinesRef);
      bringHandlesToFront(fabricCanvas, cardHandlesRef);
      fabricCanvas.requestRenderAll();
    },
    [
      fabricCanvas,
      cardsRef,
      nextCardIndexRef,
      cardGroupsRef,
      cardTextRefs,
      cardHandlesRef,
      connectionLinesRef,
      tempLineRef,
      draggedRef,
      setIsDraggingConnection,
    ]
  );

  // Listen for notes added elsewhere (e.g., via Chat) and reflect immediately on canvas
  useEffect(() => {
    const handler = (e: Event) => {
      try {
        const custom = e as CustomEvent<any>;
        const note = custom.detail;
        if (!note) return;
        void addExistingNoteToCanvas(note);
      } catch {}
    };
    window.addEventListener('learnable-note-added', handler as EventListener);
    return () => window.removeEventListener('learnable-note-added', handler as EventListener);
  }, [addExistingNoteToCanvas]);


  return useMemo(
    () => ({
      canvasRef,
      containerRef,
      addMenuRef,
      isAddMenuOpen,
      isLoaded,
      toggleAddMenu: () => setIsAddMenuOpen((p) => !p),
      handleAddTextCard: () => {
        setIsAddMenuOpen(false);
        void addCard('text', true);
      },
      handleAddImageCard: () => {
        setIsAddMenuOpen(false);
        void addCard('image', true);
      },
      zoomIn: () => zoom('in'),
      zoomOut: () => zoom('out'),
      isDraggingConnection,
      // Editor API
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
    }),
    [isAddMenuOpen, zoom, addCard, isLoaded, isDraggingConnection, editOpen, editId, editTitle, editDescription, editWidth, editHeight, saveEdits, deleteEditedCard, editMode]
  );
};
