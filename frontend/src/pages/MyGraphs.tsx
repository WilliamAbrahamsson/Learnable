import { Topbar } from '@/components/Topbar';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
  // MSc Software Engineering — base list
  const baseCourses = [
    { id: 'g1', name: 'Computer Networking', tags: ['TCP/IP', 'Routing'], updated: 'Today' },
    { id: 'g2', name: 'Algorithms', tags: ['Greedy', 'DP', 'Graphs'], updated: '1d ago' },
    { id: 'g3', name: 'Foundations of Computing', tags: ['Logic', 'Automata'], updated: '2d ago' },
    { id: 'g4', name: 'Parallel Computing', tags: ['MPI', 'OpenMP'], updated: '3d ago' },
    { id: 'g5', name: 'Distributed Systems', tags: ['Consensus', 'Fault‑tolerance'], updated: '4d ago' },
    { id: 'g6', name: 'Software Architecture', tags: ['Patterns', 'DDD'], updated: '5d ago' },
    { id: 'g7', name: 'Advanced Databases', tags: ['SQL', 'NoSQL'], updated: '6d ago' },
    { id: 'g8', name: 'DevOps & Cloud', tags: ['CI/CD', 'Kubernetes'], updated: '1w ago' },
    { id: 'g9', name: 'Cybersecurity Engineering', tags: ['Threats', 'Crypto'], updated: '1w ago' },
    { id: 'g10', name: 'Programming Languages & Compilers', tags: ['Parsing', 'IR'], updated: '2w ago' },
    { id: 'g11', name: 'Software Testing & QA', tags: ['Unit', 'E2E'], updated: '2w ago' },
    { id: 'g12', name: 'Human‑Computer Interaction', tags: ['UX', 'Usability'], updated: '3w ago' },
  ] as const;

  const randInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
  const formatTokenNumber = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
    return `${n}`;
  };
  const formatRelative = (d: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffDays <= 0) return 'Today';
    if (diffDays === 1) return '1d ago';
    if (diffDays < 30) return `${diffDays}d ago`;
    const diffMonths = Math.floor(diffDays / 30);
    if (diffMonths < 12) return `${diffMonths}mo ago`;
    const years = Math.floor(diffMonths / 12);
    return `${years}y ago`;
  };
  const initialGraphs = useMemo(() =>
    baseCourses.map((c) => {
      const questions = randInt(25, 1200);
      const tokensPerQ = randInt(600, 1600); // rough tokens per question
      const tokensUsed = questions * tokensPerQ;
      const notes = Math.max(8, Math.round(questions / 5));
      const daysAgo = randInt(0, Math.floor(365 * 1.2)); // spread over ~1.2 years
      const updatedAt = new Date(Date.now() - daysAgo * 86400000);
      return {
        ...c,
        notes,
        shared: randInt(0, 1200),
        questions,
        tokensUsed,
        updatedAt,
        updatedLabel: formatRelative(updatedAt),
      };
    }),
  []);
  const [graphs, setGraphs] = useState<any[]>(initialGraphs);

  // Ordering only
  const [orderBy, setOrderBy] = useState<'newest' | 'oldest'>('newest');
  const RECENT_DAYS = 30;

  const ordered = useMemo(() => {
    const list = [...graphs];
    list.sort((a: any, b: any) => {
      if (orderBy === 'oldest') return a.updatedAt.getTime() - b.updatedAt.getTime();
      return b.updatedAt.getTime() - a.updatedAt.getTime();
    });
    return list;
  }, [graphs, orderBy]);

  // Incremental loading
  const [visibleCount, setVisibleCount] = useState(6);
  useEffect(() => { setVisibleCount(6); }, [orderBy]);
  const visibleItems = useMemo(() => ordered.slice(0, Math.min(visibleCount, ordered.length)), [ordered, visibleCount]);
  // Public/private per graph (demo)
  const [publicMap, setPublicMap] = useState<Record<string, boolean>>(() => Object.fromEntries(initialGraphs.map((g: any) => [g.id, Math.random() < 0.5])) as Record<string, boolean>);
  const togglePublic = (id: string, v: boolean) => setPublicMap((m) => ({ ...m, [id]: !!v }));
  const { toast } = useToast();
  // Share dialog (demo)
  const [shareOpen, setShareOpen] = useState(false);
  const [shareGraphId, setShareGraphId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [invitees, setInvitees] = useState<string[]>([]);
  const demoContacts = useMemo(
    () => [
      'alice@example.com',
      'bob@example.com',
      'carol@university.edu',
      'dave@learnable.ai',
      'eve@research.lab',
      'mallory@security.org',
    ],
    [],
  );
  const suggestions = useMemo(
    () => demoContacts.filter((e) => query && e.toLowerCase().includes(query.toLowerCase()) && !invitees.includes(e)),
    [demoContacts, query, invitees],
  );
  const isValidEmail = (v: string) => /.+@.+\..+/.test(v);
  const addInvitee = (email: string) => {
    const e = email.trim();
    if (!isValidEmail(e)) return;
    if (!invitees.includes(e)) setInvitees((prev) => [...prev, e]);
    setQuery('');
  };
  const removeInvitee = (email: string) => setInvitees((prev) => prev.filter((x) => x !== email));
  const openShare = (id: string) => { setShareGraphId(id); setShareOpen(true); };
  const copyShare = async (id?: string) => {
    try {
      const target = id ?? shareGraphId;
      const url = `${window.location.origin}/?graph=${encodeURIComponent(target || '')}`;
      await navigator.clipboard.writeText(url);
      toast({ description: 'Share link copied (demo).' });
    } catch {}
  };
  const sendInvites = () => {
    if (invitees.length === 0) return;
    toast({ description: `Invites sent to ${invitees.join(', ')} (demo).` });
    setShareOpen(false);
    setInvitees([]);
    setQuery('');
  };

  // Delete graph dialog (demo)
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleteText, setDeleteText] = useState('');
  const confirmDelete = () => {
    if (!deleteTarget) return;
    if (deleteText.trim() !== deleteTarget.name) return;
    setGraphs((prev) => prev.filter((g) => g.id !== deleteTarget.id));
    setPublicMap((m) => { const n: Record<string, boolean> = { ...m }; delete (n as any)[deleteTarget.id]; return n; });
    setDeleteOpen(false);
    toast({ description: 'Graph deleted (demo).' });
  };

  const navigate = useNavigate();
  return (
    <div className="flex flex-col h-screen w-full bg-[#1C1C1C] overflow-hidden">
      <Topbar />
      <main className="flex-1 overflow-auto">
        <div className="max-w-5xl mx-auto px-6 pt-8 pb-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-[#E5E3DF] text-xl font-semibold">My Learning Graphs</h1>
              <p className="text-[#B5B2AC] text-sm mt-2">View and manage your saved learning graphs here.</p>
            </div>
            <Button className="h-8 px-3 bg-[#1E52F1] hover:bg-[#1E52F1]/90 text-sm" onClick={() => {
              const id = `g${Date.now()}`;
              const questions = randInt(25, 1200);
              const tokensPerQ = randInt(600, 1600);
              const tokensUsed = questions * tokensPerQ;
              const notes = Math.max(8, Math.round(questions / 5));
              const updatedAt = new Date();
              const g = { id, name: `New Graph ${graphs.length + 1}`, tags: [], updated: 'Today', updatedAt, updatedLabel: formatRelative(updatedAt), shared: randInt(0, 1200), notes, questions, tokensUsed };
              setGraphs((prev) => [g, ...prev]);
              setPublicMap((m) => ({ ...m, [id]: false }));
            }}>Add Graph</Button>
          </div>
          {/* Order by date toggle */}
          <div className="mt-6 flex items-center justify-end gap-2 text-xs text-[#C5C1BA]">
            <span>Order by date</span>
            <button
              type="button"
              onClick={() => setOrderBy(orderBy === 'newest' ? 'oldest' : 'newest')}
              className="inline-flex items-center gap-1 h-8 px-2 rounded border border-[#2A2A28] bg-[#1C1C1C] text-[#C5C1BA] hover:bg-[#272725]"
              aria-label={orderBy === 'newest' ? 'Newest first' : 'Oldest first'}
              title={orderBy === 'newest' ? 'Newest first' : 'Oldest first'}
            >
              {orderBy === 'newest' ? (
                <>
                  <ArrowDown className="h-4 w-4" />
                  Newest
                </>
              ) : (
                <>
                  <ArrowUp className="h-4 w-4" />
                  Oldest
                </>
              )}
            </button>
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-6">
            {visibleItems.map((g: any) => (
              <Card key={g.id} className="group relative rounded-xl bg-[#1C1C1C] border border-[#2A2A28] hover:border-[#3F3F3D] shadow-[0_1px_0_rgba(0,0,0,0.4)] hover:shadow-[0_6px_18px_rgba(0,0,0,0.35)] transition-all">
                <CardHeader className="pt-6 pb-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Network className="h-4 w-4 text-[#C5C1BA]" />
                      <span className="truncate text-[#E5E3DF] text-[18px] md:text-[19px]" title={g.name}>{g.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-[#B5B2AC] whitespace-nowrap">{g.updatedLabel}</span>
                      <button
                        type="button"
                        className="h-8 w-8 inline-flex items-center justify-center rounded hover:bg-[#272725] text-[#C5C1BA]"
                        onClick={() => { setDeleteTarget({ id: g.id, name: g.name }); setDeleteText(''); setDeleteOpen(true); }}
                        title="More"
                        aria-label="More"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="px-6 pt-2 pb-0 text-[14px] text-[#C5C1BA]">
                  <div className="mt-4 pt-5 border-t border-[#2A2A28] grid grid-cols-4 gap-x-6">
                    <div className="text-center">
                      <div className="text-[20px] md:text-[21px] font-semibold text-[#E5E3DF] leading-none">{g.shared}</div>
                      <div className="mt-2 text-[11px] text-[#B5B2AC]">Shared with</div>
                    </div>
                    <div className="text-center">
                      <div className="text-[20px] md:text-[21px] font-semibold text-[#E5E3DF] leading-none">{g.notes}</div>
                      <div className="mt-2 text-[11px] text-[#B5B2AC]">Notes added</div>
                    </div>
                    <div className="text-center">
                      <div className="text-[20px] md:text-[21px] font-semibold text-[#E5E3DF] leading-none">{formatTokenNumber(g.tokensUsed)}</div>
                      <div className="mt-2 text-[11px] text-[#B5B2AC]">Tokens used</div>
                    </div>
                    <div className="text-center">
                      <div className="text-[20px] md:text-[21px] font-semibold text-[#E5E3DF] leading-none">{g.questions}</div>
                      <div className="mt-2 text-[11px] text-[#B5B2AC]">Questions asked</div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="px-6 pt-8 pb-6 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center gap-2 text-xs text-[#C5C1BA] cursor-default">
                            <span className="opacity-80">Public</span>
                            <Switch
                              checked={!!publicMap[g.id]}
                              onCheckedChange={(v) => togglePublic(g.id, !!v)}
                              className="data-[state=checked]:bg-[#1E52F1]"
                            />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent className="bg-[#1C1C1C] text-[#C5C1BA] border border-[#272725] max-w-xs">
                          {publicMap[g.id] ? 'Public: Appears in Social; others can view it.' : 'Private: Only you can see it; not in Social.'}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openShare(g.id)}
                      className="h-8 px-3 rounded bg-emerald-600 hover:bg-emerald-600/90 text-white text-sm shadow inline-flex items-center gap-1.5"
                    >
                      <Share className="h-4 w-4" />
                      Share
                    </button>
                    <Button className="h-8 px-3 bg-[#1E52F1] hover:bg-[#1E52F1]/90 text-sm" onClick={() => navigate('/')}>Open</Button>
                  </div>
                </CardFooter>
              </Card>
            ))}
          </div>
          {visibleCount < ordered.length && (
            <div className="mt-4 pb-12 flex justify-center">
              <Button className="bg-[#1E52F1] hover:bg-[#1E52F1]/90" onClick={() => setVisibleCount((v) => Math.min(ordered.length, v + 4))}>
                Load more
              </Button>
            </div>
          )}
        </div>
      </main>
      {/* Share dialog (demo) */}
      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="max-w-md bg-[#1C1C1C] text-[#C5C1BA] border border-[#272725]">
          <DialogHeader>
            <DialogTitle className="text-[#E5E3DF]">Share Learning Graph</DialogTitle>
            <DialogDescription className="text-[#76746F]">
              Invite collaborators by email. They will receive an email with a link. (Demo)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="name@example.com"
                className="flex-1 bg-[#1C1C1C] border-[#2A2A28] text-[#C5C1BA] placeholder:text-[#76746F]"
              />
              <Button disabled={!isValidEmail(query)} onClick={() => addInvitee(query)} className="bg-[#1E52F1] hover:bg-[#1E52F1]/90">
                Add
              </Button>
            </div>
            {suggestions.length > 0 && (
              <div className="text-xs">
                <div className="mb-1 text-[#76746F]">Suggestions</div>
                <div className="flex flex-wrap gap-2">
                  {suggestions.map((s) => (
                    <button key={s} type="button" onClick={() => addInvitee(s)} className="px-2 py-1 rounded border border-[#2A2A28] hover:bg-[#272725]">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {invitees.length > 0 && (
              <div className="text-xs">
                <div className="mb-1 text-[#76746F]">People</div>
                <div className="flex flex-wrap gap-2">
                  {invitees.map((e) => (
                    <span key={e} className="inline-flex items-center gap-1 px-2 py-1 rounded bg-[#272725] text-[#C5C1BA]">
                      {e}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="flex items-center justify-between">
            <Button variant="ghost" className="text-[#C5C1BA] hover:text-white hover:bg-[#272725]" onClick={() => copyShare()}>
              Copy link
            </Button>
            <div className="flex gap-2">
              <Button variant="ghost" className="text-[#C5C1BA] hover:text-white hover:bg-[#272725]" onClick={() => setShareOpen(false)}>
                Close
              </Button>
              <Button disabled={invitees.length === 0} className="bg-[#1E52F1] hover:bg-[#1E52F1]/90" onClick={sendInvites}>
                Send Invites
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Delete graph dialog (demo) */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-sm bg-[#1C1C1C] text-[#C5C1BA] border border-[#272725]">
          <DialogHeader>
            <DialogTitle className="text-[#E5E3DF]">Delete Graph</DialogTitle>
            <DialogDescription className="text-[#76746F]">
              Type the name of the graph to confirm deletion.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <div className="text-xs text-[#B5B2AC]">Graph: <span className="text-[#E5E3DF]">{deleteTarget?.name}</span></div>
            <Input
              value={deleteText}
              onChange={(e) => setDeleteText(e.target.value)}
              placeholder="Type graph name"
              className="bg-[#1C1C1C] border-[#2A2A28] text-[#C5C1BA] placeholder:text-[#76746F]"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" className="text-[#C5C1BA] hover:text-white hover:bg-[#272725]" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-rose-600 hover:bg-rose-600/90 disabled:bg-rose-600/40"
              disabled={!deleteTarget || deleteText.trim() !== deleteTarget.name}
              onClick={confirmDelete}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <footer className="relative border-t border-[#272725] py-3 text-center text-xs text-white/60">
        <div className="absolute left-4 space-x-3">
          <a href="/terms#terms" className="text-white/80 hover:text-white underline-offset-4 hover:underline">Terms</a>
          <a href="/terms#privacy" className="text-white/80 hover:text-white underline-offset-4 hover:underline">Privacy</a>
          <a href="/terms#cookies" className="text-white/80 hover:text-white underline-offset-4 hover:underline">Cookies</a>
        </div>
        {(() => { try { const u = localStorage.getItem('learnableUser'); return u && JSON.parse(u).is_admin; } catch { return false; } })() && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <Button className="h-7 px-3 bg-[#1E52F1] hover:bg-[#1E52F1]/90 text-white" onClick={() => navigate('/admin')}>
              Admin Panel
            </Button>
          </div>
        )}
        © {currentYear} Learnable. All rights reserved.
      </footer>
    </div>
  );
};

export default MyGraphs;
