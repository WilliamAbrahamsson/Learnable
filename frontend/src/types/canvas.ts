import { Group, Circle, Line } from 'fabric';

export interface CardData {
  id: string;
  title: string;
  description: string;
  color: string;
  connections?: string[];
  type?: 'text' | 'image';
  imageUrl?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

export interface ConnectionData {
  line: Line;
  startHandle: Circle | null;
  endHandle: Circle | null;
}

export interface CardRefs {
  cardGroupsRef: React.MutableRefObject<Map<string, Group>>;
  cardHandlesRef: React.MutableRefObject<Map<string, Circle[]>>;
  connectionLinesRef: React.MutableRefObject<Map<string, ConnectionData>>;
}
