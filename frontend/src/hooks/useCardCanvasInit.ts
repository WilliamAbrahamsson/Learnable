import { useCallback } from 'react';
import { CardData } from '@/types/canvas';

export const useCanvasInit = (apiBaseUrl: string) => {
    const loadInitialData = useCallback(
        async (
            cardsRef: React.MutableRefObject<CardData[]>,
            nextRef: React.MutableRefObject<number>
        ) => {
            const token = localStorage.getItem('learnableToken');
            if (!token) {
                cardsRef.current = [];
                nextRef.current = 0;
                return;
            }

            try {
                const headers = { Authorization: `Bearer ${token}` };
                const [notesRes, connectionsRes] = await Promise.all([
                    fetch(`${apiBaseUrl}/api/graph/notes`, { headers }),
                    fetch(`${apiBaseUrl}/api/graph/connections`, { headers }),
                ]);

                if (!notesRes.ok || !connectionsRes.ok) throw new Error('Fetch failed');

                const notes = await notesRes.json();
                const cons = await connectionsRes.json();

                const ids = new Set<string>(notes.map((n: any) => String(n.id)));
                const adj = new Map<string, Set<string>>();


                console.log('Fetched notes:', notes);


                cons.forEach((c: any) => {
                    const a = String(c.note_id_1);
                    const b = String(c.note_id_2);
                    if (!ids.has(a) || !ids.has(b) || a === b) return;
                    if (!adj.has(a)) adj.set(a, new Set());
                    if (!adj.has(b)) adj.set(b, new Set());
                    adj.get(a)!.add(b);
                    adj.get(b)!.add(a);
                });

                (cardsRef as any).connectionsFromDB = cons;


                const cards: CardData[] = notes.map((n: any, i: number) => {
                    const w = typeof n.width === 'number' ? n.width : 280;
                    const h = typeof n.height === 'number' ? n.height : 200;
                    const x = typeof n.x_pos === 'number' ? n.x_pos : 100 + (i % 3) * (w + 120 - 40);
                    const y = typeof n.y_pos === 'number' ? n.y_pos : 100 + Math.floor(i / 3) * (h + 100);
                    return {
                        id: String(n.id),
                        title: n.name ?? 'Untitled',
                        description: n.description ?? '',
                        color: '#1C1C1C',
                        connections: Array.from(adj.get(String(n.id)) ?? []),
                        type: 'text',                 // ✅ force text card
                        imageUrl: undefined,          // ✅ no image
                        x,
                        y,
                        width: w,
                        height: h,
                    };
                });


                cardsRef.current = cards;
                nextRef.current = cards.length;
            } catch (err) {
                console.error('Failed to load canvas data', err);
                cardsRef.current = [];
                nextRef.current = 0;
            }
        },
        [apiBaseUrl]
    );

    return { loadInitialData };
};
