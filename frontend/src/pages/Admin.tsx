import { Topbar } from '@/components/Topbar';
import { useEffect, useMemo, useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const Admin = () => {
  const currentYear = new Date().getFullYear();
  const [purchasesDisabled, setPurchasesDisabled] = useState<boolean>(() => {
    try { return localStorage.getItem('learnable:disablePurchases') === '1'; } catch { return false; }
  });
  useEffect(() => {
    try { localStorage.setItem('learnable:disablePurchases', purchasesDisabled ? '1' : '0'); } catch {}
    try { window.dispatchEvent(new Event('learnable-purchases-changed')); } catch {}
  }, [purchasesDisabled]);

  const [period, setPeriod] = useState<'7d'|'30d'|'90d'>('30d');
  const series = useMemo(() => {
    const days = period === '7d' ? 7 : period === '90d' ? 90 : 30;
    const today = new Date();
    const data: { label: string; sessions: number; signups: number; paying: number }[] = [];
    let baseSessions = 1200, baseSignups = 120, basePaying = 40;
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today.getTime() - i * 86400000);
      const jitter = (n: number, varp: number) => Math.max(0, Math.round(n * (1 + (Math.random() - 0.5) * varp)));
      baseSessions = jitter(baseSessions, 0.12);
      baseSignups = jitter(baseSignups, 0.2);
      basePaying = jitter(basePaying, 0.25);
      data.push({ label: `${d.getMonth() + 1}/${d.getDate()}`, sessions: baseSessions, signups: baseSignups, paying: basePaying });
    }
    return data;
  }, [period]);
  const maxY = Math.max(...series.map((d) => Math.max(d.sessions, d.signups, d.paying)));
  const chartW = 720, chartH = 220, pad = 24;
  const x = (i: number) => pad + (i * (chartW - 2 * pad)) / (series.length - 1);
  const y = (v: number) => chartH - pad - (v * (chartH - 2 * pad)) / (maxY || 1);
  const toPath = (key: 'sessions' | 'signups' | 'paying') => series.map((d, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(d[key])}`).join(' ');
  // Demo users & interactive graph
  const demoUsers = useMemo(() => [
    { email: 'alice@example.com', queries: ['How does TCP handshake work?','Explain CAP theorem','What is DP vs Greedy?'] },
    { email: 'bob@example.com', queries: ['How to scale Postgres?','Kubernetes basics','MapReduce flow'] },
    { email: 'carol@university.edu', queries: ['P vs NP','Automata regular languages','Lambda calculus intro'] },
  ], []);
  const [userQuery, setUserQuery] = useState('');
  const filteredUsers = useMemo(() => demoUsers.filter(u => u.email.toLowerCase().includes(userQuery.toLowerCase())), [demoUsers, userQuery]);
  const [userOpen, setUserOpen] = useState(false);
  const [activeUser, setActiveUser] = useState<{ email: string; queries: string[] } | null>(null);
  const graphNodes = useMemo(() => [
    { id: 'a', label: 'Networking', x: 60, y: 60 },
    { id: 'b', label: 'Databases', x: 160, y: 40 },
    { id: 'c', label: 'Algorithms', x: 260, y: 70 },
    { id: 'd', label: 'Systems', x: 90, y: 140 },
    { id: 'e', label: 'Cloud', x: 220, y: 140 },
  ], []);
  const graphEdges: [string,string][] = [['a','b'],['b','c'],['a','d'],['b','e']];
  const nodeMap = useMemo(() => Object.fromEntries(graphNodes.map(n => [n.id, n])), [graphNodes]);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  return (
    <div className="flex flex-col h-screen w-full bg-[#1C1C1C] overflow-hidden">
      <Topbar />
      <main className="flex-1 overflow-auto">
        <div className="max-w-5xl mx-auto px-6 pt-8 pb-6 text-[#C5C1BA]">
          <h1 className="text-2xl font-semibold text-[#E5E3DF]">Admin Panel</h1>
          <p className="text-sm mt-2">Demo-only controls and metrics (no real data).</p>

          <div className="mt-6 rounded-xl border border-[#2A2A28] bg-[#1C1C1C] p-4">
            <div className="flex items-center justify-between">
              <div className="text-lg font-semibold text-[#E5E3DF]">Usage</div>
              <div className="flex items-center gap-3 text-xs">
                <span className="inline-flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-sm bg-[#3B82F6]" /> Sessions</span>
                <span className="inline-flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-sm bg-[#10B981]" /> Signups</span>
                <span className="inline-flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-sm bg-[#F59E0B]" /> Paying</span>
              </div>
            </div>
            <div className="mt-2 text-xs flex items-center gap-2">
              <span className="opacity-80">Period:</span>
              <div className="inline-flex rounded border border-[#2A2A28]">
                {(['7d','30d','90d'] as const).map(p => (
                  <button key={p} className={`px-2 py-1 ${period===p? 'bg-[#272725] text-white':'text-[#C5C1BA]'}`} onClick={() => setPeriod(p)}>{p}</button>
                ))}
              </div>
            </div>
            <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full mt-3">
              <rect x="0" y="0" width={chartW} height={chartH} fill="none" />
              {[0, 0.25, 0.5, 0.75, 1].map((t) => (
                <line key={t} x1={pad} x2={chartW - pad} y1={pad + (chartH - 2 * pad) * (1 - t)} y2={pad + (chartH - 2 * pad) * (1 - t)} stroke="#2A2A28" strokeWidth="1" />
              ))}
              <path d={toPath('sessions')} fill="none" stroke="#3B82F6" strokeWidth="2" />
              <path d={toPath('signups')} fill="none" stroke="#10B981" strokeWidth="2" />
              <path d={toPath('paying')} fill="none" stroke="#F59E0B" strokeWidth="2" />
            </svg>
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-xl border border-[#2A2A28] p-4">
              <div className="text-sm text-[#B5B2AC]">Distinct Sessions (IPs)</div>
              <div className="text-2xl font-semibold text-[#E5E3DF] mt-1">{series[series.length-1]?.sessions ?? 0}</div>
            </div>
            <div className="rounded-xl border border-[#2A2A28] p-4">
              <div className="text-sm text-[#B5B2AC]">Signups</div>
              <div className="text-2xl font-semibold text-[#E5E3DF] mt-1">{series[series.length-1]?.signups ?? 0}</div>
            </div>
            <div className="rounded-xl border border-[#2A2A28] p-4">
              <div className="text-sm text-[#B5B2AC]">Paying Users (total)</div>
              <div className="text-2xl font-semibold text-[#E5E3DF] mt-1">{series[series.length-1]?.paying ?? 0}</div>
            </div>
          </div>

          <div className="mt-6 rounded-xl border border-[#2A2A28] p-4">
            <div className="text-lg font-semibold text-[#E5E3DF]">Plans</div>
            <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <div className="rounded-lg border border-[#2A2A28] p-3"><div className="text-[#B5B2AC]">Starter</div><div className="text-[#E5E3DF] text-xl font-semibold mt-1">312</div></div>
              <div className="rounded-lg border border-[#2A2A28] p-3"><div className="text-[#B5B2AC]">Pro</div><div className="text-[#E5E3DF] text-xl font-semibold mt-1">147</div></div>
              <div className="rounded-lg border border-[#2A2A28] p-3"><div className="text-[#B5B2AC]">Team</div><div className="text-[#E5E3DF] text-xl font-semibold mt-1">26</div></div>
            </div>
          </div>

          <div className="mt-6 rounded-xl border border-[#2A2A28] p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-lg font-semibold text-[#E5E3DF]">Purchases</div>
                <div className="text-xs text-[#B5B2AC]">Disable all purchases site‑wide (subscriptions and packs).</div>
              </div>
              <Switch checked={purchasesDisabled} onCheckedChange={(v) => setPurchasesDisabled(!!v)} className="data-[state=checked]:bg-rose-600" />
            </div>
          </div>

          {/* User search */}
          <div className="mt-6 rounded-xl border border-[#2A2A28] p-4">
            <div className="text-lg font-semibold text-[#E5E3DF]">Users</div>
            <div className="mt-3 flex items-center gap-2">
              <Input placeholder="Search users by email..." className="bg-[#1C1C1C] border-[#2A2A28] text-[#C5C1BA] placeholder:text-[#76746F]" value={userQuery} onChange={(e) => setUserQuery(e.target.value)} />
            </div>
            <div className="mt-3 space-y-2 text-sm">
              {filteredUsers.map(u => (
                <div key={u.email} className="flex items-center justify-between">
                  <span className="truncate">{u.email}</span>
                  <Button variant="ghost" className="h-7 px-2 text-[#C5C1BA] hover:text-white hover:bg-[#272725]" onClick={() => { setActiveUser(u); setUserOpen(true); }}>View graphs</Button>
                </div>
              ))}
              {filteredUsers.length===0 && (<div className="text-xs text-[#76746F]">No users match your search.</div>)}
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-[#2A2A28] p-4">
              <div className="text-lg font-semibold text-[#E5E3DF]">Users & Graphs</div>
              <div className="mt-3 space-y-2 text-sm">
                {['alice@example.com','bob@example.com','carol@university.edu'].map((u) => (
                  <div key={u} className="flex items-center justify-between">
                    <span className="truncate">{u}</span>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" className="h-7 px-2 text-[#C5C1BA] hover:text-white hover:bg-[#272725]">View Graphs</Button>
                      <Button variant="ghost" className="h-7 px-2 text-[#C5C1BA] hover:text-white hover:bg-[#272725]">Export</Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-[#2A2A28] p-4">
              <div className="text-lg font-semibold text-[#E5E3DF]">Chat History</div>
              <div className="mt-3 space-y-2 text-sm">
                {['alice@example.com','bob@example.com','carol@university.edu'].map((u) => (
                  <div key={u} className="flex items-center justify-between">
                    <span className="truncate">{u}</span>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" className="h-7 px-2 text-[#C5C1BA] hover:text-white hover:bg-[#272725]">View</Button>
                      <Button variant="ghost" className="h-7 px-2 text-[#C5C1BA] hover:text-white hover:bg-[#272725]">Export</Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
      {/* User graphs & chats dialog (demo) */}
      <Dialog open={userOpen} onOpenChange={setUserOpen}>
        <DialogContent className="max-w-3xl bg-[#1C1C1C] text-[#C5C1BA] border border-[#272725]">
          <DialogHeader>
            <DialogTitle className="text-[#E5E3DF]">{activeUser?.email}</DialogTitle>
            <DialogDescription className="text-[#76746F]">Graphs and recent queries (demo).</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-lg border border-[#2A2A28] p-3">
              <div className="text-sm font-semibold text-[#E5E3DF]">Graph</div>
              <svg viewBox="0 0 320 220" className="w-full mt-2">
                {graphEdges.map((e, i) => (
                  <line key={i} x1={nodeMap[e[0]].x} y1={nodeMap[e[0]].y} x2={nodeMap[e[1]].x} y2={nodeMap[e[1]].y} stroke={selectedNode && (e[0]===selectedNode || e[1]===selectedNode) ? '#1E52F1' : '#2A2A28'} strokeWidth={1.5} />
                ))}
                {graphNodes.map((n) => (
                  <g key={n.id} onClick={() => setSelectedNode(n.id)}>
                    <circle cx={n.x} cy={n.y} r={selectedNode===n.id?10:7} fill={selectedNode===n.id?'#1E52F1':'#C5C1BA'} />
                    <text x={n.x+12} y={n.y+4} fill="#C5C1BA" fontSize="10">{n.label}</text>
                  </g>
                ))}
              </svg>
              <div className="text-xs text-[#76746F]">Click nodes to highlight connections.</div>
            </div>
            <div className="rounded-lg border border-[#2A2A28] p-3">
              <div className="text-sm font-semibold text-[#E5E3DF]">Recent Queries</div>
              <div className="mt-2 space-y-1 text-xs">
                {(activeUser?.queries ?? []).map((q, idx) => (<div key={idx} className="p-2 rounded bg-[#1C1C1C] border border-[#2A2A28]">{q}</div>))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button className="bg-[#1E52F1] hover:bg-[#1E52F1]/90" onClick={() => setUserOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <footer className="relative border-t border-[#272725] py-3 text-center text-xs text-white/60">
        <div className="absolute left-4 space-x-3">
          <a href="/terms#terms" className="text-white/80 hover:text-white underline-offset-4 hover:underline">Terms</a>
          <a href="/terms#privacy" className="text-white/80 hover:text-white underline-offset-4 hover:underline">Privacy</a>
          <a href="/terms#cookies" className="text-white/80 hover:text-white underline-offset-4 hover:underline">Cookies</a>
        </div>
        © {currentYear} Learnable. All rights reserved.
      </footer>
    </div>
  );
};

export default Admin;
