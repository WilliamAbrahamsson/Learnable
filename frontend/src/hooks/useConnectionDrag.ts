import { useEffect } from 'react';
import { Canvas as FabricCanvas, Line, Circle } from 'fabric';

export const useConnectionDrag = (
  fabricCanvas: FabricCanvas | null,
  apiBaseUrl: string,
  tempLineRef: React.MutableRefObject<Line | null>,
  draggedConnectionRef: React.MutableRefObject<{ connectionKey: string; isStartHandle: boolean } | null>,
  cardHandlesRef: React.MutableRefObject<Map<string, Circle[]>>,
  connectionLinesRef: React.MutableRefObject<
    Map<string, { line: Line; startHandle: Circle | null; endHandle: Circle | null }>
  >,
  setIsDraggingConnection: (value: boolean) => void
) => {
  useEffect(() => {
    if (!fabricCanvas) return;

    let hoveredHandle: Circle | null = null;

    const handleMouseMove = (e: any) => {
      if (tempLineRef.current && e.e) {
        const pointer = fabricCanvas.getPointer(e.e);
        const oppositeCardId = (tempLineRef.current as any).oppositeCardId;

        tempLineRef.current.set({ x2: pointer.x, y2: pointer.y });
        tempLineRef.current.setCoords();

        // Reset previous hover
        if (hoveredHandle) {
          hoveredHandle.set({ fill: (hoveredHandle as any).originalFill, radius: 7 });
          hoveredHandle = null;
        }

        // Find nearest handle
        let minDist = 25;
        cardHandlesRef.current.forEach((handles, cardId) => {
          if (cardId !== oppositeCardId) {
            handles.forEach((handle) => {
              const dist = Math.hypot(
                (handle.left ?? 0) - pointer.x,
                (handle.top ?? 0) - pointer.y
              );
              if (dist < minDist) {
                hoveredHandle = handle;
                minDist = dist;
              }
            });
          }
        });

        if (hoveredHandle) hoveredHandle.set({ fill: '#10B981', radius: 8 });
        fabricCanvas.requestRenderAll();
      }
    };

    const handleMouseUp = async (e: any) => {
      const sourceHandle = tempLineRef.current ? (tempLineRef.current as any).sourceHandle : null;
      const oppositeCardId = tempLineRef.current ? (tempLineRef.current as any).oppositeCardId : null;

      // remove temp line
      if (tempLineRef.current) {
        fabricCanvas.remove(tempLineRef.current);
        tempLineRef.current = null;
      }

      if (e && e.e && sourceHandle && oppositeCardId) {
        const pointer = fabricCanvas.getPointer(e.e);

        let targetHandle: Circle | null = null;
        let minDist = 25;

        cardHandlesRef.current.forEach((handles, cardId) => {
          if (cardId !== oppositeCardId) {
            handles.forEach((handle) => {
              const dist = Math.hypot(
                (handle.left ?? 0) - pointer.x,
                (handle.top ?? 0) - pointer.y
              );
              if (dist < minDist) {
                targetHandle = handle;
                minDist = dist;
              }
            });
          }
        });

        if (targetHandle && sourceHandle) {
          const sourceCardId =
            (sourceHandle as any).cardId ?? (sourceHandle as any).data?.cardId;
          const targetCardId =
            (targetHandle as any).cardId ?? (targetHandle as any).data?.cardId;

          const sourceSlot =
            (sourceHandle as any).slotIndex ??
            (sourceHandle as any).data?.slotIndex ??
            0;
          const targetSlot =
            (targetHandle as any).slotIndex ??
            (targetHandle as any).data?.slotIndex ??
            0;


          const connectionKey = [sourceCardId, targetCardId].sort().join('-');
          const existingConnection = connectionLinesRef.current.get(connectionKey);
          if (existingConnection) {
            fabricCanvas.remove(existingConnection.line);
            connectionLinesRef.current.delete(connectionKey);
          }

          const line = new Line(
            [
              sourceHandle.left ?? 0,
              sourceHandle.top ?? 0,
              targetHandle.left ?? 0,
              targetHandle.top ?? 0,
            ],
            {
              stroke: '#C5C1BA',
              strokeWidth: 3,
              selectable: false,
              evented: false,
            }
          );

          fabricCanvas.add(line);
          fabricCanvas.sendObjectToBack(line);
          connectionLinesRef.current.set(connectionKey, {
            line,
            startHandle: sourceHandle,
            endHandle: targetHandle,
          });

          // ✅ Persist with slot info
          const token = localStorage.getItem('learnableToken');
          if (token) {
            const a = Number(sourceCardId);
            const b = Number(targetCardId);
            if (Number.isFinite(a) && Number.isFinite(b)) {
              try {
                const res = await fetch(`${apiBaseUrl}/api/graph/connections`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                  },
                  body: JSON.stringify({
                    note_id_1: a,
                    note_id_2: b,
                    slot_1: sourceSlot,
                    slot_2: targetSlot,
                  }),
                });
                if (!res.ok) {
                  console.error('Failed to persist connection:', await res.text());
                } else {
                  console.log(`✅ Connection created (${a}→${b}) [slots ${sourceSlot}-${targetSlot}]`);
                }
              } catch (err) {
                console.error('Error creating connection:', err);
              }
            }
          }

          targetHandle.set({ fill: (targetHandle as any).originalFill, radius: 7 });
        } else {
          console.log('No valid target handle found');
          // If we were moving an existing connection and dropped on empty space,
          // delete that connection locally and in the backend.
          if (draggedConnectionRef.current) {
            const { connectionKey } = draggedConnectionRef.current;
            const existing = connectionLinesRef.current.get(connectionKey);
            // Remove from local map (line was already removed when drag started)
            connectionLinesRef.current.delete(connectionKey);

            // Persist deletion using the two note ids
            const token = localStorage.getItem('learnableToken');
            let a: number | null = null;
            let b: number | null = null;
            if (existing) {
              const sid = (existing.startHandle as any)?.cardId;
              const tid = (existing.endHandle as any)?.cardId;
              a = Number(sid);
              b = Number(tid);
            } else {
              // Fallback: parse from key
              const parts = connectionKey.split('-');
              if (parts.length === 2) {
                a = Number(parts[0]);
                b = Number(parts[1]);
              }
            }
            if (token && Number.isFinite(a!) && Number.isFinite(b!)) {
              try {
                const url = new URL(`${apiBaseUrl}/api/graph/connections`);
                url.searchParams.set('note_id_1', String(a));
                url.searchParams.set('note_id_2', String(b));
                await fetch(url.toString(), {
                  method: 'DELETE',
                  headers: { Authorization: `Bearer ${token}` },
                });
              } catch (err) {
                console.error('Failed to delete connection from backend', err);
              }
            }
            draggedConnectionRef.current = null;
          }
        }
      }

      if (hoveredHandle) {
        hoveredHandle.set({ fill: (hoveredHandle as any).originalFill, radius: 7 });
        hoveredHandle = null;
      }

      setIsDraggingConnection(false);
      cardHandlesRef.current.forEach((handles) => {
        handles.forEach((handle) => handle.set({ visible: false }));
      });
      // After drag completes, keep handles visible on the currently selected card (if any)
      try {
        const active: any = (fabricCanvas as any).getActiveObject?.();
        const activeId = active?.cardId as string | undefined;
        if (activeId && cardHandlesRef.current.has(activeId)) {
          const activeHandles = cardHandlesRef.current.get(activeId)!;
          activeHandles.forEach((h) => {
            h.set({ visible: true });
            fabricCanvas.bringObjectToFront(h);
          });
        }
      } catch {}
      fabricCanvas.requestRenderAll();
    };

    fabricCanvas.on('mouse:move', handleMouseMove);
    fabricCanvas.on('mouse:up', handleMouseUp);

    return () => {
      fabricCanvas.off('mouse:move', handleMouseMove);
      fabricCanvas.off('mouse:up', handleMouseUp);
    };
  }, [
    fabricCanvas,
    apiBaseUrl,
    tempLineRef,
    draggedConnectionRef,
    cardHandlesRef,
    connectionLinesRef,
    setIsDraggingConnection,
  ]);
};
