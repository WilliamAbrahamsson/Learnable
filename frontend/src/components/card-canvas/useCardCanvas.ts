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

export const useCardCanvas = () => {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000';
  const { loadInitialData } = useCanvasInit(apiBaseUrl);

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
      canvas.backgroundColor = '#272725';
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

    const canvas = new fabric.Canvas(canvasRef.current, {
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
      backgroundColor: '#272725',
      preserveObjectStacking: true,
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

  // 🔥 Sync handle positions when card moved (local only)
  useEffect(() => {
    if (!fabricCanvas) return;

    const handleObjectMove = (
      e: fabric.TEvent<fabric.TPointerEvent> | fabric.ModifiedEvent<fabric.TPointerEvent>
    ) => {
      if (!('target' in e) || !e.target) return;
      const target = e.target as fabric.Group & { cardId?: string };
      if (!target?.cardId) return;

      const cardId = target.cardId;
      const handles = cardHandlesRef.current.get(cardId);
      if (!handles) return;

      handles.forEach((handle: any) => {
        handle.set({
          left: target.left + (handle.offsetX ?? 0),
          top: target.top + (handle.offsetY ?? 0),
        });
        handle.setCoords();
      });

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
    async (type: 'text' | 'image') => {
      if (!fabricCanvas) return;

      // Temporary ID (used until backend returns real one)
      const tempId = `card-${Date.now()}`;
      const newCard: CardData = {
        id: tempId,
        title: DEFAULT_TEXT_TITLE,
        description: DEFAULT_TEXT_DESCRIPTION,
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

        console.info(`✅ Synced new card ${tempId} → ${realId}`);
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
        void addCard('text');
      },
      handleAddImageCard: () => {
        setIsAddMenuOpen(false);
        void addCard('image');
      },
      zoomIn: () => zoom('in'),
      zoomOut: () => zoom('out'),
      isDraggingConnection,
    }),
    [isAddMenuOpen, zoom, addCard, isLoaded, isDraggingConnection]
  );
};
