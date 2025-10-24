import { Canvas as FabricCanvas, Group, Circle, Line } from 'fabric';

export const createConnectionHandles = (
  canvas: FabricCanvas,
  cardGroup: Group,
  cardId: string,
  cardWidth: number,
  cardHeight: number,
  hoverPadding: number,
  cardHandlesRef: React.MutableRefObject<Map<string, Circle[]>>,
  fabricCanvas: FabricCanvas | null,
  connectionLinesRef: React.MutableRefObject<Map<string, { line: Line; startHandle: Circle | null; endHandle: Circle | null }>>,
  tempLineRef: React.MutableRefObject<Line | null>,
  draggedConnectionRef: React.MutableRefObject<{ connectionKey: string; isStartHandle: boolean } | null>,
  setIsDraggingConnection: (value: boolean) => void
) => {
  const handles: Circle[] = [];
  const cardBounds = cardGroup.getBoundingRect();
  
  // Calculate actual card position (accounting for hover area offset)
  const left = cardBounds.left + hoverPadding;
  const top = cardBounds.top + hoverPadding;

  // Define 8 positions on actual card borders
  const positions = [
    { x: left, y: top, name: 'top-left' },
    { x: left + cardWidth / 2, y: top, name: 'top-center' },
    { x: left + cardWidth, y: top, name: 'top-right' },
    { x: left + cardWidth, y: top + cardHeight / 2, name: 'middle-right' },
    { x: left + cardWidth, y: top + cardHeight, name: 'bottom-right' },
    { x: left + cardWidth / 2, y: top + cardHeight, name: 'bottom-center' },
    { x: left, y: top + cardHeight, name: 'bottom-left' },
    { x: left, y: top + cardHeight / 2, name: 'middle-left' },
  ];

  positions.forEach((pos, idx) => {
    const handle = new Circle({
      left: pos.x,
      top: pos.y,
      radius: 8,
      fill: '#C5C1BA',
      stroke: '#C5C1BA',
      strokeWidth: 2,
      originX: 'center',
      originY: 'center',
      hasControls: false,
      hasBorders: false,
      // Prevent handles from being part of marquee multi‑select, but keep them interactive
      selectable: false,
      evented: true,
      hoverCursor: 'crosshair',
      visible: false, // Hidden by default
      opacity: 0.9,
    });

    (handle as any).cardId = cardId;
    (handle as any).handlePosition = pos.name;
    (handle as any).slotIndex = idx; // 0..7 ordered per positions array
    (handle as any).isConnectionHandle = true;
    (handle as any).originalFill = '#C5C1BA';

    // Handle hover effects
    handle.on('mouseover', () => {
      handle.set({ fill: '#10B981', radius: 9 });
      canvas.requestRenderAll();
    });

    handle.on('mouseout', () => {
      handle.set({ fill: (handle as any).originalFill, radius: 8 });
      // Keep handles visible on mouseout
      canvas.requestRenderAll();
    });

    // Handle mouse down - start dragging connection line (left-click only)
    handle.on('mousedown', (e) => {
      if (!fabricCanvas) return;
      
      const event = e.e as MouseEvent;
      if (!event) return;
      // Ignore non-left clicks so middle/right can be used for panning
      if (event.button !== 0) return;
      
      // Prevent selection box from being drawn
      fabricCanvas.selection = false;
      
      event.preventDefault();
      event.stopPropagation();
      
      console.log('Handle clicked, starting connection drag...');
      
      // Show ALL handles on ALL cards while dragging a connection (including source)
      cardHandlesRef.current.forEach((handles) => {
        handles.forEach((h: Circle) => {
          h.set({ visible: true });
          fabricCanvas.bringObjectToFront(h);
        });
      });
      fabricCanvas.renderAll();
      
      // Check if this handle has an existing connection that we should move
      let foundExistingConnection = false;
      for (const [key, connection] of connectionLinesRef.current.entries()) {
        if (connection.startHandle === handle) {
          console.log('Moving existing connection from start handle');
          foundExistingConnection = true;
          draggedConnectionRef.current = { connectionKey: key, isStartHandle: true };
          
          const pointer = fabricCanvas.getPointer(event);
          if (tempLineRef.current) {
            fabricCanvas.remove(tempLineRef.current);
            tempLineRef.current = null;
          }
          const tempLine = new Line(
            [connection.endHandle?.left || 0, connection.endHandle?.top || 0, pointer.x, pointer.y],
            {
              stroke: '#C5C1BA',
              strokeWidth: 3,
              selectable: false,
              evented: false,
              strokeDashArray: [5, 5],
              opacity: 0.8,
            }
          );
          
          tempLineRef.current = tempLine;
          (tempLine as any).sourceHandle = connection.endHandle;
          (tempLine as any).oppositeCardId = (connection.endHandle as any)?.cardId;
          fabricCanvas.add(tempLine);
          fabricCanvas.remove(connection.line);
          setIsDraggingConnection(true);
          break;
        } else if (connection.endHandle === handle) {
          console.log('Moving existing connection from end handle');
          foundExistingConnection = true;
          draggedConnectionRef.current = { connectionKey: key, isStartHandle: false };
          
          const pointer = fabricCanvas.getPointer(event);
          if (tempLineRef.current) {
            fabricCanvas.remove(tempLineRef.current);
            tempLineRef.current = null;
          }
          const tempLine = new Line(
            [connection.startHandle?.left || 0, connection.startHandle?.top || 0, pointer.x, pointer.y],
            {
              stroke: '#C5C1BA',
              strokeWidth: 3,
              selectable: false,
              evented: false,
              strokeDashArray: [5, 5],
              opacity: 0.8,
            }
          );
          
          tempLineRef.current = tempLine;
          (tempLine as any).sourceHandle = connection.startHandle;
          (tempLine as any).oppositeCardId = (connection.startHandle as any)?.cardId;
          fabricCanvas.add(tempLine);
          fabricCanvas.remove(connection.line);
          setIsDraggingConnection(true);
          break;
        }
      }

      if (!foundExistingConnection) {
        // Start new connection - draw line from this handle to cursor
        console.log('Starting new connection from handle');
        if (tempLineRef.current) {
          fabricCanvas.remove(tempLineRef.current);
          tempLineRef.current = null;
        }
        const pointer = fabricCanvas.getPointer(event);
        const tempLine = new Line([handle.left!, handle.top!, pointer.x, pointer.y], {
          stroke: '#C5C1BA',
          strokeWidth: 3,
          selectable: false,
          evented: false,
          strokeDashArray: [5, 5],
          opacity: 0.8,
        });
        
        tempLineRef.current = tempLine;
        (tempLine as any).sourceHandle = handle;
        (tempLine as any).oppositeCardId = (handle as any).cardId;
        fabricCanvas.add(tempLine);
        fabricCanvas.renderAll();
        setIsDraggingConnection(true);
      }
      
      fabricCanvas.renderAll();
    });

    canvas.add(handle);
    canvas.bringObjectToFront(handle);
    handles.push(handle);
  });

  cardHandlesRef.current.set(cardId, handles);

  // Add hover events to card group to show/hide handles
  // These will trigger even when hovering over the larger invisible hover area
  cardGroup.on('mouseover', () => {
    // Check if this is the card with the given ID
    if ((cardGroup as any).cardId === cardId) {
      // If currently dragging a connection, don't show handles on the source card
      if (tempLineRef.current && (tempLineRef.current as any).oppositeCardId === cardId) {
        return; // Don't show handles on the card we're dragging from
      }
      
      handles.forEach(handle => {
        handle.set({ visible: true });
        handle.setCoords();
      });
      // Bring all handles to front after making them visible
      handles.forEach(handle => {
        canvas.bringObjectToFront(handle);
      });
      canvas.renderAll();
    }
  });

  cardGroup.on('mouseout', (e) => {
    // Only hide if not currently dragging a connection and not hovering over a handle
    if (!tempLineRef.current && (cardGroup as any).cardId === cardId) {
      // Keep handles visible while this card is selected
      try {
        const active = (fabricCanvas as any)?.getActiveObject?.();
        if (active && (active as any).cardId === cardId) {
          return;
        }
      } catch {}
      const pointer = e.e ? canvas.getPointer(e.e as MouseEvent) : null;
      if (pointer) {
        // Check if mouse is over any handle
        const isOverHandle = handles.some(handle => {
          const handleBounds = handle.getBoundingRect();
          return pointer.x >= handleBounds.left && 
                 pointer.x <= handleBounds.left + handleBounds.width &&
                 pointer.y >= handleBounds.top && 
                 pointer.y <= handleBounds.top + handleBounds.height;
        });
        
        if (!isOverHandle) {
          handles.forEach(handle => {
            handle.set({ visible: false });
          });
          canvas.requestRenderAll();
        }
      }
    }
  });

  // Keep handles visible while selected; hide on deselect
  cardGroup.on('selected', () => {
    handles.forEach((handle) => {
      handle.set({ visible: true });
      canvas.bringObjectToFront(handle);
    });
    canvas.requestRenderAll();
  });
  cardGroup.on('deselected', () => {
    // If not dragging from this card, hide on deselect
    if (tempLineRef.current && (tempLineRef.current as any).oppositeCardId === cardId) return;
    handles.forEach((handle) => handle.set({ visible: false }));
    canvas.requestRenderAll();
  });
};

export const updateConnectionLines = (
  canvas: FabricCanvas,
  cardHandlesRef: React.MutableRefObject<Map<string, Circle[]>>,
  cardGroupsRef: React.MutableRefObject<Map<string, Group>>,
  connectionLinesRef: React.MutableRefObject<Map<string, { line: Line; startHandle: Circle | null; endHandle: Circle | null }>>
) => {
  // Update card handles positions immediately
  cardHandlesRef.current.forEach((handles, cardId) => {
    const cardGroup = cardGroupsRef.current.get(cardId);
    if (cardGroup) {
      const cardBounds = cardGroup.getBoundingRect();

      // Get the scale of the card group
      const scaleX = cardGroup.scaleX || 1;
      const scaleY = cardGroup.scaleY || 1;

      const baseWidth = (cardGroup as any).cardWidth ?? 280;
      const baseHeight = (cardGroup as any).cardHeight ?? 200;
      const hoverPadding = (cardGroup as any).hoverPadding ?? 25;

      // Calculate scaled dimensions
      const scaledWidth = baseWidth * scaleX;
      const scaledHeight = baseHeight * scaleY;
      const scaledPaddingX = hoverPadding * scaleX;
      const scaledPaddingY = hoverPadding * scaleY;

      // Calculate actual card position (accounting for hover area and scale)
      const left = cardBounds.left + scaledPaddingX;
      const top = cardBounds.top + scaledPaddingY;

      const positions = [
        { x: left, y: top },
        { x: left + scaledWidth / 2, y: top },
        { x: left + scaledWidth, y: top },
        { x: left + scaledWidth, y: top + scaledHeight / 2 },
        { x: left + scaledWidth, y: top + scaledHeight },
        { x: left + scaledWidth / 2, y: top + scaledHeight },
        { x: left, y: top + scaledHeight },
        { x: left, y: top + scaledHeight / 2 },
      ];

      handles.forEach((handle, index) => {
        const isVisible = handle.visible;
        handle.set({ 
          left: positions[index].x, 
          top: positions[index].y 
        });
        handle.setCoords();
        // Always bring visible handles to front
        if (isVisible) {
          canvas.bringObjectToFront(handle);
        }
      });
    }
  });

  // Update connection lines to follow handles
  connectionLinesRef.current.forEach(({ line, startHandle, endHandle }) => {
    if (startHandle && endHandle) {
      line.set({
        x1: startHandle.left,
        y1: startHandle.top,
        x2: endHandle.left,
        y2: endHandle.top,
      });
      line.setCoords();
    }
  });
  
  canvas.requestRenderAll();
};
