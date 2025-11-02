import { API_BASE_URL } from '@/config';
import type { Canvas, ChatMessage, CanvasElement, ElementGroup } from '@/types/api';

const authHeader = (token?: string) => (token ? { Authorization: `Bearer ${token}` } : {});

export const CanvasAPI = {
  async listCanvases(token: string): Promise<Canvas[]> {
    const res = await fetch(`${API_BASE_URL}/api/canvas/canvases`, { headers: { ...authHeader(token) } });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || 'Failed to load canvases');
    return data as Canvas[];
  },
  async listGroups(token: string, canvasId: number): Promise<ElementGroup[]> {
    const res = await fetch(`${API_BASE_URL}/api/canvas/groups?canvas_id=${canvasId}`, {
      headers: { ...authHeader(token) },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || 'Failed to load groups');
    return data as ElementGroup[];
  },
  async createGroup(token: string, canvasId: number, name: string, elementIds: number[]): Promise<ElementGroup> {
    const res = await fetch(`${API_BASE_URL}/api/canvas/groups`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader(token) },
      body: JSON.stringify({ canvas_id: canvasId, name, element_ids: elementIds }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || 'Failed to create group');
    return data as ElementGroup;
  },
  async updateGroup(token: string, groupId: number, patch: Partial<Pick<ElementGroup, 'name' | 'element_ids'>>): Promise<ElementGroup> {
    const res = await fetch(`${API_BASE_URL}/api/canvas/groups/${groupId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeader(token) },
      body: JSON.stringify(patch),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || 'Failed to update group');
    return data as ElementGroup;
  },
  async deleteGroup(token: string, groupId: number): Promise<{ success: boolean }> {
    const res = await fetch(`${API_BASE_URL}/api/canvas/groups/${groupId}`, {
      method: 'DELETE',
      headers: { ...authHeader(token) },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || 'Failed to delete group');
    return data as { success: boolean };
  },

  async createCanvas(token: string, name: string): Promise<Canvas & { chat_id?: number }> {
    const res = await fetch(`${API_BASE_URL}/api/canvas/canvases`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader(token) },
      body: JSON.stringify({ name }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || 'Failed to create canvas');
    return data as Canvas & { chat_id?: number };
  },

  async getCanvas(token: string, canvasId: number): Promise<Canvas> {
    const res = await fetch(`${API_BASE_URL}/api/canvas/canvases/${canvasId}`, {
      headers: { ...authHeader(token) },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || 'Failed to load canvas');
    return data as Canvas;
  },

  async updateCanvas(
    token: string,
    canvasId: number,
    patch: Partial<Pick<Canvas, 'name' | 'camera_x' | 'camera_y' | 'camera_zoom_percentage'>>
  ): Promise<Canvas> {
    const res = await fetch(`${API_BASE_URL}/api/canvas/canvases/${canvasId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeader(token) },
      body: JSON.stringify(patch),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || 'Failed to update canvas');
    return data as Canvas;
  },

  async getChatWithMessages(token: string, canvasId: number): Promise<{ chat: { id: number }; messages: ChatMessage[] }> {
    const res = await fetch(`${API_BASE_URL}/api/canvas/chat?canvas_id=${canvasId}`, { headers: { ...authHeader(token) } });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || 'Failed to load chat');
    return data as { chat: { id: number }; messages: ChatMessage[] };
  },

  async deleteCanvas(token: string, canvasId: number): Promise<{ success: boolean }> {
    const res = await fetch(`${API_BASE_URL}/api/canvas/canvases/${canvasId}`, {
      method: 'DELETE',
      headers: { ...authHeader(token) },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || 'Failed to delete canvas');
    return data as { success: boolean };
  },

  async listElements(token: string, canvasId: number): Promise<CanvasElement[]> {
    const res = await fetch(`${API_BASE_URL}/api/canvas/elements?canvas_id=${canvasId}`, {
      headers: { ...authHeader(token) },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || 'Failed to load elements');
    return data as CanvasElement[];
  },

  async createElement(
    token: string,
    payload: Omit<CanvasElement, 'id' | 'created_at' | 'updated_at'>
  ): Promise<CanvasElement> {
    const res = await fetch(`${API_BASE_URL}/api/canvas/elements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader(token) },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || 'Failed to create element');
    return data as CanvasElement;
  },

  async updateElement(
    token: string,
    elementId: number,
    patch: Partial<Omit<CanvasElement, 'id' | 'canvas_id' | 'created_at' | 'updated_at'>>
  ): Promise<CanvasElement> {
    const res = await fetch(`${API_BASE_URL}/api/canvas/elements/${elementId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeader(token) },
      body: JSON.stringify(patch),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || 'Failed to update element');
    return data as CanvasElement;
  },

  async deleteElement(token: string, elementId: number): Promise<{ success: boolean }> {
    const res = await fetch(`${API_BASE_URL}/api/canvas/elements/${elementId}`, {
      method: 'DELETE',
      headers: { ...authHeader(token) },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || 'Failed to delete element');
    return data as { success: boolean };
  },
};

export const ChatAPI = {
  stream(prompt: string, canvasId?: number | null) {
    return fetch(`${API_BASE_URL}/api/chat/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: prompt, canvas_id: canvasId ?? undefined }),
    });
  },
};
