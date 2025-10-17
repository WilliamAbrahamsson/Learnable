import { Topbar } from '@/components/Topbar';
import { useEffect, useMemo, useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

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
  // Demo users for sortable table (no real data)
  type DemoUser = {
    email: string;
    plan: 'Starter' | 'Pro' | 'Team';
    tokensUsed: number;
    graphs: number;
    joined: string; // ISO date
  };
  const demoUsers = useMemo<DemoUser[]>(() => [
    { email: 'alice@example.com', plan: 'Pro',     tokensUsed: 182_340, graphs: 12, joined: '2024-01-15T10:00:00Z' },
    { email: 'bob@example.com',   plan: 'Starter', tokensUsed: 64_210,  graphs: 5,  joined: '2024-03-02T10:00:00Z' },
    { email: 'carol@university.edu', plan: 'Team', tokensUsed: 402_991, graphs: 24, joined: '2023-11-28T10:00:00Z' },
    { email: 'daniel@company.com', plan: 'Pro',   tokensUsed: 251_119, graphs: 9,  joined: '2024-04-18T10:00:00Z' },
    { email: 'eve@startup.io',    plan: 'Starter', tokensUsed: 11_045, graphs: 2,  joined: '2024-05-05T10:00:00Z' },
    // Additional Pro users
    { email: 'frank@domain.com',   plan: 'Pro', tokensUsed: 98_221,  graphs: 7,  joined: '2024-02-12T10:00:00Z' },
    { email: 'grace@domain.com',   plan: 'Pro', tokensUsed: 310_555, graphs: 18, joined: '2023-12-05T10:00:00Z' },
    { email: 'henry@domain.com',   plan: 'Pro', tokensUsed: 44_120,  graphs: 3,  joined: '2024-06-01T10:00:00Z' },
    { email: 'irene@domain.com',   plan: 'Pro', tokensUsed: 205_330, graphs: 11, joined: '2024-01-27T10:00:00Z' },
    { email: 'jack@domain.com',    plan: 'Pro', tokensUsed: 512_004, graphs: 30, joined: '2023-10-11T10:00:00Z' },
    { email: 'kate@company.com',   plan: 'Pro', tokensUsed: 72_450,  graphs: 6,  joined: '2024-04-01T10:00:00Z' },
    { email: 'liam@company.com',   plan: 'Pro', tokensUsed: 163_874, graphs: 8,  joined: '2024-02-28T10:00:00Z' },
    { email: 'maya@startup.io',    plan: 'Pro', tokensUsed: 22_703,  graphs: 4,  joined: '2024-05-12T10:00:00Z' },
    { email: 'nick@startup.io',    plan: 'Pro', tokensUsed: 278_900, graphs: 16, joined: '2023-12-22T10:00:00Z' },
    { email: 'olivia@uni.edu',     plan: 'Pro', tokensUsed: 134_050, graphs: 10, joined: '2024-03-19T10:00:00Z' },
    { email: 'paul@uni.edu',       plan: 'Pro', tokensUsed: 88_612,  graphs: 5,  joined: '2024-03-25T10:00:00Z' },
    { email: 'quinn@agency.co',    plan: 'Pro', tokensUsed: 190_777, graphs: 9,  joined: '2024-01-05T10:00:00Z' },
    { email: 'rachel@agency.co',   plan: 'Pro', tokensUsed: 405_222, graphs: 21, joined: '2023-11-05T10:00:00Z' },
    { email: 'steve@consult.io',   plan: 'Pro', tokensUsed: 55_321,  graphs: 4,  joined: '2024-06-10T10:00:00Z' },
    { email: 'tina@consult.io',    plan: 'Pro', tokensUsed: 245_990, graphs: 13, joined: '2024-02-03T10:00:00Z' },
    { email: 'uma@product.dev',    plan: 'Pro', tokensUsed: 159_430, graphs: 7,  joined: '2024-01-22T10:00:00Z' },
    { email: 'victor@product.dev', plan: 'Pro', tokensUsed: 330_210, graphs: 19, joined: '2023-09-30T10:00:00Z' },
  ], []);
  const [userQuery, setUserQuery] = useState('');
  const filteredUsers = useMemo(() => demoUsers.filter(u => u.email.toLowerCase().includes(userQuery.toLowerCase())), [demoUsers, userQuery]);
  type SortKey = 'email' | 'plan' | 'tokensUsed' | 'graphs' | 'joined';
  const [sortKey, setSortKey] = useState<SortKey>('email');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const sortedUsers = useMemo(() => {
    const arr = [...filteredUsers];
    arr.sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      let av: string | number = (a as any)[sortKey];
      let bv: string | number = (b as any)[sortKey];
      if (sortKey === 'joined') {
        av = new Date(String(av)).getTime();
        bv = new Date(String(bv)).getTime();
      }
      if (typeof av === 'string' && typeof bv === 'string') return av.localeCompare(bv) * dir;
      return ((av as number) - (bv as number)) * dir;
    });
    return arr;
  }, [filteredUsers, sortKey, sortDir]);
  // Pagination (50 rows per page)
  const PAGE_SIZE = 10;
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(sortedUsers.length / PAGE_SIZE));
  useEffect(() => {
    // Clamp page when filter/sort changes
    if (page > totalPages) setPage(totalPages);
    if (page < 1) setPage(1);
  }, [page, totalPages]);
  const startIdx = (page - 1) * PAGE_SIZE;
  const pagedUsers = useMemo(() => sortedUsers.slice(startIdx, startIdx + PAGE_SIZE), [sortedUsers, startIdx]);
  const onSort = (key: SortKey) => {
    if (key === sortKey) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('asc'); }
  };
  const formatTokens = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
    return `${n}`;
  };
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

          {/* Users table */}
          <div className="mt-6 rounded-xl border border-[#2A2A28] p-4">
            <div className="text-lg font-semibold text-[#E5E3DF]">Users</div>
            <div className="mt-3 flex items-center gap-2">
              <Input
                placeholder="Search users by email..."
                className="bg-[#1C1C1C] border-[#2A2A28] text-[#C5C1BA] placeholder:text-[#76746F]"
                value={userQuery}
                onChange={(e) => setUserQuery(e.target.value)}
              />
            </div>
            <div className="mt-3 text-sm">
              <Table className="table-fixed">
                <TableHeader>
                  <TableRow className="border-[#2A2A28] hover:bg-transparent">
                    <TableHead
                      className="cursor-pointer select-none text-[#B5B2AC] text-xs uppercase tracking-wide py-2.5 px-3"
                      onClick={() => onSort('email')}
                      title="Sort by email"
                    >
                      Email {sortKey === 'email' ? <span className="opacity-60">{sortDir === 'asc' ? '▲' : '▼'}</span> : ''}
                    </TableHead>
                    <TableHead
                      className="cursor-pointer select-none text-[#B5B2AC] text-xs uppercase tracking-wide py-2.5 px-3"
                      onClick={() => onSort('plan')}
                      title="Sort by plan"
                    >
                      Plan {sortKey === 'plan' ? <span className="opacity-60">{sortDir === 'asc' ? '▲' : '▼'}</span> : ''}
                    </TableHead>
                    <TableHead
                      className="cursor-pointer select-none text-[#B5B2AC] text-xs uppercase tracking-wide py-2.5 px-3 text-right"
                      onClick={() => onSort('tokensUsed')}
                      title="Sort by tokens used"
                    >
                      Tokens Used {sortKey === 'tokensUsed' ? <span className="opacity-60">{sortDir === 'asc' ? '▲' : '▼'}</span> : ''}
                    </TableHead>
                    <TableHead
                      className="cursor-pointer select-none text-[#B5B2AC] text-xs uppercase tracking-wide py-2.5 px-3 text-right"
                      onClick={() => onSort('graphs')}
                      title="Sort by graphs"
                    >
                      Graphs {sortKey === 'graphs' ? <span className="opacity-60">{sortDir === 'asc' ? '▲' : '▼'}</span> : ''}
                    </TableHead>
                    <TableHead
                      className="cursor-pointer select-none text-[#B5B2AC] text-xs uppercase tracking-wide py-2.5 px-3"
                      onClick={() => onSort('joined')}
                      title="Sort by join date"
                    >
                      Joined {sortKey === 'joined' ? <span className="opacity-60">{sortDir === 'asc' ? '▲' : '▼'}</span> : ''}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagedUsers.map((u) => (
                    <TableRow key={u.email} className="hover:bg-[#272725] border-[#2A2A28]">
                      <TableCell className="py-2.5 px-3 font-medium text-[#E5E3DF] max-w-[260px] truncate">
                        {u.email}
                      </TableCell>
                      <TableCell className="py-2.5 px-3">
                        <Badge
                          className={
                            u.plan === 'Pro'
                              ? 'border-[#1E52F1]/30 bg-[#1E52F1]/10 text-[#C9D6FF]'
                              : u.plan === 'Team'
                                ? 'border-[#10B981]/30 bg-[#10B981]/10 text-[#CFF5E9]'
                                : 'border-[#2A2A28] bg-[#232322] text-[#C5C1BA]'
                          }
                          variant="outline"
                        >
                          {u.plan}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-2.5 px-3 text-right tabular-nums" title={String(u.tokensUsed)}>
                        {formatTokens(u.tokensUsed)}
                      </TableCell>
                      <TableCell className="py-2.5 px-3 text-right tabular-nums" title={String(u.graphs)}>
                        {u.graphs}
                      </TableCell>
                      <TableCell className="py-2.5 px-3 text-[#B5B2AC]">
                        {new Date(u.joined).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                  {sortedUsers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-[#76746F] text-xs">
                        No users match your search.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            {/* Pagination controls */}
            <div className="mt-3 flex items-center justify-between text-xs text-[#C5C1BA]">
              <div>
                {sortedUsers.length > 0 ? (
                  <span>
                    Showing {startIdx + 1}–{Math.min(startIdx + pagedUsers.length, sortedUsers.length)} of {sortedUsers.length}
                    {' '}· Rows per page: {PAGE_SIZE}
                  </span>
                ) : (
                  <span>Showing 0 of 0</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  className="h-7 px-2 text-[#C5C1BA] hover:text-white hover:bg-[#272725]"
                  disabled={page <= 1}
                  onClick={() => setPage(1)}
                >
                  « First
                </Button>
                <Button
                  variant="ghost"
                  className="h-7 px-2 text-[#C5C1BA] hover:text-white hover:bg-[#272725]"
                  disabled={page <= 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                >
                  ‹ Prev
                </Button>
                <span className="px-2">Page {page} of {totalPages}</span>
                <Button
                  variant="ghost"
                  className="h-7 px-2 text-[#C5C1BA] hover:text-white hover:bg-[#272725]"
                  disabled={page >= totalPages}
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                >
                  Next ›
                </Button>
                <Button
                  variant="ghost"
                  className="h-7 px-2 text-[#C5C1BA] hover:text-white hover:bg-[#272725]"
                  disabled={page >= totalPages}
                  onClick={() => setPage(totalPages)}
                >
                  Last »
                </Button>
              </div>
            </div>
          </div>

          {/* Users & Graphs and Chat History sections removed */}
        </div>
      </main>
      {/* User graphs & chats dialog removed */}
      <footer className="relative border-t border-[#272725] py-3 text-center text-xs text-white/60">
        <div className="xl:hidden flex flex-col items-center gap-2">
          <div>© {currentYear} Learnable. All rights reserved.</div>
          <div className="flex items-center gap-3">
            <a href="/terms#terms" className="text-white/80 hover:text-white underline-offset-4 hover:underline">Terms</a>
            <a href="/terms#privacy" className="text-white/80 hover:text-white underline-offset-4 hover:underline">Privacy</a>
            <a href="/terms#cookies" className="text-white/80 hover:text-white underline-offset-4 hover:underline">Cookies</a>
          </div>
        </div>
        <div className="hidden xl:block">
          <div className="absolute left-4 space-x-3">
            <a href="/terms#terms" className="text-white/80 hover:text-white underline-offset-4 hover:underline">Terms</a>
            <a href="/terms#privacy" className="text-white/80 hover:text-white underline-offset-4 hover:underline">Privacy</a>
            <a href="/terms#cookies" className="text-white/80 hover:text-white underline-offset-4 hover:underline">Cookies</a>
          </div>
          © {currentYear} Learnable. All rights reserved.
        </div>
      </footer>
    </div>
  );
};

export default Admin;
