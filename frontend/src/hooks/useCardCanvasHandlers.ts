import { Canvas, Group, Circle, Line } from 'fabric';
import { bringToFront, sendToBack } from './useCardCanvasUtils';
import { createConnectionHandles } from '@/utils/connectionHandles';

/**
 * Create draggable connection handles (8 slots) for a given card.
 */
export const createHandles = (
  canvas: Canvas,
  group: Group,
  cardId: string,
  width: number,
  height: number,
  padding: number,
  cardHandlesRef: React.MutableRefObject<Map<string, Circle[]>>,
  connectionLinesRef: React.MutableRefObject<
    Map<string, { line: Line; startHandle: Circle | null; endHandle: Circle | null }>
  >,
  tempLineRef: React.MutableRefObject<Line | null>,
  draggedRef: React.MutableRefObject<{ connectionKey: string; isStartHandle: boolean } | null>,
  setDragging: (v: boolean) => void
): void => {
  createConnectionHandles(
    canvas,
    group,
    cardId,
    width,
    height,
    padding,
    cardHandlesRef,
    canvas,
    connectionLinesRef,
    tempLineRef,
    draggedRef,
    setDragging
  );
};

/**
 * Bring all connection handles to the front for visibility.
 */
export const bringHandlesToFront = (
  canvas: Canvas,
  cardHandlesRef: React.MutableRefObject<Map<string, Circle[]>>
): void => {
  cardHandlesRef.current.forEach((handles) => {
    handles.forEach((handle) => bringToFront(canvas, handle));
  });
  canvas.requestRenderAll();
};

/**
 * Draws all visual connection lines between linked cards.
 * If backendConnections are provided, it uses slot_1 and slot_2
 * to attach the lines to the correct handles.
 */
export const drawConnections = (
  canvas: Canvas,
  cardsRef: React.MutableRefObject<Array<{ id: string; connections?: string[] }>>,
  cardHandlesRef: React.MutableRefObject<Map<string, Circle[]>>,
  connectionLinesRef: React.MutableRefObject<
    Map<string, { line: Line; startHandle: Circle | null; endHandle: Circle | null }>
  >,
  backendConnections?: Array<{ note_id_1: number; note_id_2: number; slot_1: number; slot_2: number }>
): void => {
  // 🔄 Clear existing lines
  connectionLinesRef.current.forEach(({ line }) => canvas.remove(line));
  connectionLinesRef.current.clear();

  // 🔗 Draw from backend data if available
  if (backendConnections && backendConnections.length > 0) {
    backendConnections.forEach((conn) => {
      const id1 = String(conn.note_id_1);
      const id2 = String(conn.note_id_2);
      const slot1 = conn.slot_1 ?? 0;
      const slot2 = conn.slot_2 ?? 0;

      const handles1 = cardHandlesRef.current.get(id1);
      const handles2 = cardHandlesRef.current.get(id2);
      if (!handles1 || !handles2) return;

      // Use slot positions directly
      const h1 = handles1[slot1] ?? handles1[0];
      const h2 = handles2[slot2] ?? handles2[0];
      if (!h1 || !h2) return;

      const line = new Line(
        [h1.left ?? 0, h1.top ?? 0, h2.left ?? 0, h2.top ?? 0],
        {
          stroke: '#9CA3AF',
          strokeWidth: 3,
          selectable: false,
          evented: false,
        }
      );

      canvas.add(line);
      sendToBack(canvas, line);

      const key = [id1, id2].sort().join('-');
      connectionLinesRef.current.set(key, {
        line,
        startHandle: h1,
        endHandle: h2,
      });
    });
  }

  canvas.requestRenderAll();
};
