import { Topbar } from '@/components/Topbar';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Share, Network, MoreVertical } from 'lucide-react';

const MyGraphs = () => {
  const currentYear = new Date().getFullYear();
  const { toast } = useToast();
  const navigate = useNavigate();
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000';

  const [graphs, setGraphs] = useState<any[]>([]);

  const formatRelative = (d: Date) => {
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const days = Math.floor(diff / 86400000);
    if (days <= 0) return 'Today';
    if (days === 1) return '1d ago';
    if (days < 30) return `${days}d ago`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months}mo ago`;
    return `${Math.floor(months / 12)}y ago`;
  };

  // Load graphs
  useEffect(() => {
    const loadGraphs = async () => {
      try {
        const token = localStorage.getItem('learnableToken');
        if (!token) return;
        const res = await fetch(`${apiBaseUrl}/api/graph/graphs`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load graphs');
        const items = data.map((g: any) => ({
          id: String(g.id),
          name: g.name || 'Untitled',
          updatedAt: new Date((g.updated_at || 0) * 1000),
          updatedLabel: formatRelative(new Date((g.updated_at || 0) * 1000)),
          notes: 0,
          shared: 0,
          tokensUsed: 0,
          questions: 0,
        }));
        setGraphs(items);
      } catch (err) {
        console.error('Failed to load graphs', err);
        setGraphs([]);
      }
    };
    void loadGraphs();
  }, [apiBaseUrl]);

  const [orderBy, setOrderBy] = useState<'newest' | 'oldest'>('newest');
  const ordered = useMemo(() => {
    const list = [...graphs];
    list.sort((a, b) => (orderBy === 'newest' ? b.updatedAt - a.updatedAt : a.updatedAt - b.updatedAt));
    return list;
  }, [graphs, orderBy]);

  const [publicMap, setPublicMap] = useState<Record<string, boolean>>({});
  const togglePublic = (id: string, v: boolean) => setPublicMap((m) => ({ ...m, [id]: !!v }));

  const [shareOpen, setShareOpen] = useState(false);
  const [shareGraphId, setShareGraphId] = useState<string | null>(null);
  const [invitees, setInvitees] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const shareUrlFor = (id: string) => `${window.location.origin}/my-graphs/${id}`;
  const copyShareLink = async (id: string) => {
    try {
      await navigator.clipboard.writeText(shareUrlFor(id));
      toast({ description: 'Link copied to clipboard.' });
    } catch {
      toast({ description: 'Failed to copy link.', variant: 'destructive' });
    }
  };

  const addGraph = async () => {
    try {
      const token = localStorage.getItem('learnableToken');
      if (!token) return;
      const res = await fetch(`${apiBaseUrl}/api/graph/graphs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: `New Graph ${graphs.length + 1}` }),
      });
      const g = await res.json();
      if (!res.ok) throw new Error(g.error || 'Failed');
      const updatedAt = new Date((g.updated_at || 0) * 1000);
      setGraphs((prev) => [
        { id: String(g.id), name: g.name, updatedAt, updatedLabel: formatRelative(updatedAt), notes: 0, shared: 0, questions: 0, tokensUsed: 0 },
        ...prev,
      ]);
      toast({ description: 'Graph created successfully.' });
    } catch {
      toast({ description: 'Error creating graph.', variant: 'destructive' });
    }
  };

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleteText, setDeleteText] = useState('');

  const confirmDelete = () => {
    if (!deleteTarget || deleteText.trim() !== deleteTarget.name) return;
    setGraphs((prev) => prev.filter((g) => g.id !== deleteTarget.id));
    setDeleteOpen(false);
    toast({ description: 'Graph deleted (demo only).' });
  };

  return (
    <div className="flex flex-col h-screen bg-[#1C1C1C]">
      <Topbar />
      <main className="flex-1 overflow-auto">
        <div className="max-w-5xl mx-auto p-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-[#E5E3DF] text-xl font-semibold">My Learning Graphs</h1>
              <p className="text-[#B5B2AC] text-sm mt-2">View and manage your saved learning graphs here.</p>
            </div>
            <Button className="bg-[#1E52F1]" onClick={addGraph}>Add Graph</Button>
          </div>

          <div className="flex justify-end mt-4 text-xs text-[#C5C1BA] gap-2">
            <span>Order by date</span>
            <button
              onClick={() => setOrderBy(orderBy === 'newest' ? 'oldest' : 'newest')}
              className="flex items-center gap-1 border border-[#2A2A28] px-2 py-1 rounded"
            >
              {orderBy === 'newest' ? <ArrowDown className="h-4 w-4" /> : <ArrowUp className="h-4 w-4" />}
              {orderBy === 'newest' ? 'Newest' : 'Oldest'}
            </button>
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-6">
            {ordered.map((g) => (
              <Card key={g.id} className="bg-[#1C1C1C] border border-[#2A2A28] hover:border-[#3F3F3D] transition-all">
                <CardHeader className="pt-6 pb-0 flex justify-between">
                  <div className="flex items-center gap-2">
                    <Network className="h-4 w-4 text-[#C5C1BA]" />
                    <span className="text-[#E5E3DF] text-lg">{g.name}</span>
                  </div>
                  <div className="text-xs text-[#B5B2AC]">{g.updatedLabel}</div>
                </CardHeader>
                <CardContent className="text-[#C5C1BA] text-sm">
                  <div className="grid grid-cols-2 gap-4 mt-4 border-t border-[#2A2A28] pt-4">
                    <div className="text-center">
                      <div className="text-lg font-semibold text-[#E5E3DF]">{g.notes}</div>
                      <div className="text-xs text-[#B5B2AC] mt-1">Notes</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold text-[#E5E3DF]">{g.shared}</div>
                      <div className="text-xs text-[#B5B2AC] mt-1">Shared</div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#C5C1BA]">Public</span>
                    <Switch
                      checked={!!publicMap[g.id]}
                      onCheckedChange={(v) => togglePublic(g.id, v)}
                      className="data-[state=checked]:bg-[#1E52F1]"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" className="text-xs" onClick={() => navigate(`/my-graphs/${g.id}`)}>Open</Button>
                    <Button
                      className="text-xs bg-[#2A2A28] hover:bg-[#33332F] text-[#C5C1BA]"
                      onClick={() => { setShareGraphId(g.id); setShareOpen(true); }}
                    >
                      <span className="inline-flex items-center gap-1">
                        <Share className="h-3.5 w-3.5" />
                        Share
                      </span>
                    </Button>
                    <Button
                      variant="ghost"
                      className="text-xs text-rose-500 hover:text-rose-400"
                      onClick={() => { setDeleteTarget({ id: g.id, name: g.name }); setDeleteText(''); setDeleteOpen(true); }}
                    >
                      Delete
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </main>

      {/* Delete Graph Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-sm bg-[#1C1C1C] text-[#C5C1BA] border border-[#272725]">
          <DialogHeader>
            <DialogTitle>Delete Graph</DialogTitle>
            <DialogDescription>Type the graph name to confirm.</DialogDescription>
          </DialogHeader>
          <Input
            value={deleteText}
            onChange={(e) => setDeleteText(e.target.value)}
            placeholder="Type graph name"
            className="bg-[#1C1C1C] border-[#2A2A28]"
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button
              disabled={!deleteTarget || deleteText.trim() !== deleteTarget.name}
              className="bg-rose-600 hover:bg-rose-600/90"
              onClick={confirmDelete}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Share Graph Dialog */}
      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="max-w-sm bg-[#1C1C1C] text-[#C5C1BA] border border-[#272725]">
          <DialogHeader>
            <DialogTitle>Share Learning Graph</DialogTitle>
            <DialogDescription>Copy a link to share this graph.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {shareGraphId && (
              <Input
                readOnly
                value={shareUrlFor(shareGraphId)}
                onFocus={(e) => e.currentTarget.select()}
                className="bg-[#1C1C1C] border-[#2A2A28] text-[#C5C1BA]"
              />
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShareOpen(false)}>Close</Button>
            {shareGraphId && (
              <Button className="bg-[#2A2A28] hover:bg-[#33332F] text-[#C5C1BA]" onClick={() => copyShareLink(shareGraphId)}>
                Copy link
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <footer className="text-center py-3 text-xs text-white/60 border-t border-[#272725]">
        © {currentYear} Learnable. All rights reserved.
      </footer>
    </div>
  );
};

export default MyGraphs;
