export type Canvas = {
  id: number;
  user_id: number;
  name: string;
  created_at: number;
  updated_at: number;
  camera_x?: number;
  camera_y?: number;
  camera_zoom_percentage?: number;
};

export type Chat = {
  id: number;
  canvas_id: number;
  created_at: number;
  updated_at: number;
};

export type ChatMessage = {
  id: number;
  chat_id: number;
  text: string;
  is_response: boolean;
  is_liked?: boolean;
  is_disliked?: boolean;
  created_at: number;
};

export type CanvasElement = {
  id: number;
  canvas_id: number;
  type: 'rectangle' | 'text' | 'image' | 'line' | string;
  x: number;
  y: number;
  width?: number | null;
  height?: number | null;
  rotation: number;
  z_index: number;
  bgcolor?: string;
  line_start_x?: number | null;
  line_start_y?: number | null;
  line_end_x?: number | null;
  line_end_y?: number | null;
  data: Record<string, unknown>;
  created_at: number;
  updated_at: number;
};

export type ElementGroup = {
  id: number;
  canvas_id: number;
  name: string;
  element_ids: number[];
  created_at: number;
  updated_at: number;
};
