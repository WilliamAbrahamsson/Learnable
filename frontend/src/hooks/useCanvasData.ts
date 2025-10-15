import { useRef } from 'react';
import { Group, Circle, Line, Textbox } from 'fabric';
import { CardData } from '@/types/canvas';

export const useCanvasData = () => {
  return {
    cardGroupsRef: useRef(new Map<string, Group>()),
    cardHandlesRef: useRef(new Map<string, Circle[]>()),
    connectionLinesRef: useRef(
      new Map<string, { line: Line; startHandle: Circle | null; endHandle: Circle | null }>()
    ),
    cardTextRefs: useRef(new Map<string, { title: Textbox; desc: Textbox }>()),
    tempLineRef: useRef<Line | null>(null),
    draggedRef: useRef<{ connectionKey: string; isStartHandle: boolean } | null>(null),
    cardsRef: useRef<CardData[]>([]),
    nextCardIndexRef: useRef(0),
  };
};
