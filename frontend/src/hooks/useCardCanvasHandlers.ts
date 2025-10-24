import { Canvas, Group, Circle, Line } from 'fabric';
import { bringToFront, sendToBack } from './useCardCanvasUtils';
import { createConnectionHandles } from '@/utils/connectionHandles';

/**
 * 🎨 Convert connection strength (0–10) → color
 * - 0: white (#FFFFFF)
 * - 1: red (#FF0000)
 * - 10: bright green (#00FF00)
 * - Smoothly transitions between red → yellow → green
 */
const getColorForStrength = (strength: number): string => {
  const s = Math.max(0, Math.min(10, strength));

  if (s === 0) return '#FFFFFF'; // white for no data / disconnected

  // 1–5 → red → yellow gradient
  if (s <= 5) {
    const ratio = (s - 1) / 4; // 0 at 1 → 1 at 5
    const r = 255;
    const g = Math.round(255 * ratio);
    const b = 0;
    return `rgb(${r}, ${g}, ${b})`;
  }

  // 6–10 → yellow → green gradient
  const ratio = (s - 5) / 5; // 0 at 5 → 1 at 10
  const r = Math.round(255 * (1 - ratio));
  const g = 255;
  const b = 0;
  return `rgb(${r}, ${g}, ${b})`;
};

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
 * Each connection's color depends on its strength (0–10).
 */
export const drawConnections = (
  canvas: Canvas,
  cardsRef: React.MutableRefObject<Array<{ id: string; connections?: string[] }>>,
  cardHandlesRef: React.MutableRefObject<Map<string, Circle[]>>,
  connectionLinesRef: React.MutableRefObject<
    Map<string, { line: Line; startHandle: Circle | null; endHandle: Circle | null }>
  >,
  backendConnections?: Array<{ note_id_1: number; note_id_2: number; slot_1: number; slot_2: number; strength?: number }>
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
      const strength = conn.strength ?? 0;

      const handles1 = cardHandlesRef.current.get(id1);
      const handles2 = cardHandlesRef.current.get(id2);
      if (!handles1 || !handles2) return;

      // Use slot positions directly
      const h1 = handles1[slot1] ?? handles1[0];
      const h2 = handles2[slot2] ?? handles2[0];
      if (!h1 || !h2) return;

      // 🎨 Determine color based on strength (0–10)
      const color = getColorForStrength(strength);

      const line = new Line(
        [h1.left ?? 0, h1.top ?? 0, h2.left ?? 0, h2.top ?? 0],
        {
          stroke: color,
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
