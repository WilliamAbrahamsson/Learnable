import { useEffect, useMemo, useState } from 'react';
import { Topbar } from '@/components/Topbar';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

const Sub = () => {
  const currentYear = new Date().getFullYear();
  const { toast } = useToast();

  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly');
  const [activePlan, setActivePlan] = useState<string>(() => {
    try {
      return localStorage.getItem('learnable:activePlan') || 'Starter';
    } catch {
      return 'Starter';
    }
  });
  const [activePlanBilling, setActivePlanBilling] = useState<'monthly' | 'yearly'>(() => {
    try {
      const saved = localStorage.getItem('learnable:activePlanBilling');
      return saved === 'yearly' ? 'yearly' : 'monthly';
    } catch {
      return 'monthly';
    }
  });
  const [tokenBalance, setTokenBalance] = useState<number>(() => {
    try {
      return parseInt(localStorage.getItem('learnable:tokens') || '250000', 10);
    } catch {
      return 250000;
    }
  });
  const [monthUsed, setMonthUsed] = useState<number>(() => {
    try {
      return parseInt(localStorage.getItem('learnable:tokensUsedMonth') || '80000', 10);
    } catch {
      return 80000;
    }
  });
  const [subCanceled, setSubCanceled] = useState<boolean>(() => {
    try { return localStorage.getItem('learnable:subCanceled') === '1'; } catch { return false; }
  });
  const [purchasesDisabled, setPurchasesDisabled] = useState<boolean>(() => {
    try { return localStorage.getItem('learnable:disablePurchases') === '1'; } catch { return false; }
  });
  useEffect(() => {
    const onAdmin = () => {
      try { setPurchasesDisabled(localStorage.getItem('learnable:disablePurchases') === '1'); } catch { setPurchasesDisabled(false); }
    };
    window.addEventListener('learnable-purchases-changed', onAdmin);
    window.addEventListener('storage', onAdmin);
    return () => { window.removeEventListener('learnable-purchases-changed', onAdmin); window.removeEventListener('storage', onAdmin); };
  }, []);

  // Dialog state
  const [switchOpen, setSwitchOpen] = useState(false);
  const [pendingPlan, setPendingPlan] = useState<string | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelText, setCancelText] = useState('');

  // Payment methods (demo-only)
  type PaymentMethod = {
    id: string;
    brand: string;
    last4: string;
    expMonth: string;
    expYear: string;
    name: string;
  };
  const loadPaymentMethods = (): PaymentMethod[] => {
    try {
      const raw = localStorage.getItem('learnable:paymentMethods');
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>(loadPaymentMethods);
  const [defaultPmId, setDefaultPmId] = useState<string | null>(() => {
    try { return localStorage.getItem('learnable:defaultPaymentMethod') || null; } catch { return null; }
  });
  useEffect(() => {
    try { localStorage.setItem('learnable:paymentMethods', JSON.stringify(paymentMethods)); } catch {}
  }, [paymentMethods]);
  useEffect(() => {
    try { if (defaultPmId) localStorage.setItem('learnable:defaultPaymentMethod', defaultPmId); } catch {}
  }, [defaultPmId]);
  useEffect(() => {
    if (!defaultPmId && paymentMethods.length > 0) setDefaultPmId(paymentMethods[0].id);
  }, [paymentMethods, defaultPmId]);

  const [addPmOpen, setAddPmOpen] = useState(false);
  const [removePmOpen, setRemovePmOpen] = useState<null | PaymentMethod>(null);
  const [pmName, setPmName] = useState('');
  const [pmNumber, setPmNumber] = useState('');
  const [pmExpiry, setPmExpiry] = useState(''); // MM/YY
  const [pmCvc, setPmCvc] = useState('');

  const detectBrand = (num: string) => {
    const n = num.replace(/\D/g, '');
    if (n.startsWith('4')) return 'Visa';
    if (n.startsWith('5')) return 'Mastercard';
    if (n.startsWith('3')) return 'Amex';
    if (n.startsWith('6')) return 'Discover';
    return 'Card';
  };
  const resetPmForm = () => { setPmName(''); setPmNumber(''); setPmExpiry(''); setPmCvc(''); };
  const handleAddPm = () => {
    const digits = pmNumber.replace(/\D/g, '');
    if (digits.length < 12) { toast({ variant: 'destructive', description: 'Enter a valid card number.' }); return; }
    const [mm, yy] = pmExpiry.split('/').map((s) => s?.trim());
    if (!mm || !yy || Number(mm) < 1 || Number(mm) > 12 || yy.length < 2) { toast({ variant: 'destructive', description: 'Enter expiry as MM/YY.' }); return; }
    const pm: PaymentMethod = {
      id: `pm_${Date.now()}`,
      brand: detectBrand(digits),
      last4: digits.slice(-4),
      expMonth: mm.padStart(2, '0'),
      expYear: yy.padStart(2, '0'),
      name: pmName || 'Cardholder',
    };
    setPaymentMethods((prev) => [...prev, pm]);
    if (!defaultPmId) setDefaultPmId(pm.id);
    setAddPmOpen(false);
    resetPmForm();
    toast({ description: 'Payment method added.' });
  };
  const handleRemovePm = (pm: PaymentMethod) => {
    setPaymentMethods((prev) => prev.filter((m) => m.id !== pm.id));
    if (defaultPmId === pm.id) setDefaultPmId(null);
    setRemovePmOpen(null);
    toast({ description: 'Payment method removed.' });
  };
  const handleSetDefaultPm = (pm: PaymentMethod) => {
    setDefaultPmId(pm.id);
    toast({ description: 'Default payment method updated.' });
  };

  // Auto‑recharge settings (local only for now)
  const [autoRecharge, setAutoRecharge] = useState<boolean>(() => {
    try {
      return localStorage.getItem('learnable:autoRecharge') === '1';
    } catch {
      return false;
    }
  });
  const [rechargeThreshold, setRechargeThreshold] = useState<number>(() => {
    try {
      return parseInt(localStorage.getItem('learnable:rechargeThreshold') || '20000', 10);
    } catch {
      return 20000;
    }
  });
  const [rechargePack, setRechargePack] = useState<number>(() => {
    try {
      return parseInt(localStorage.getItem('learnable:rechargePack') || '200000', 10);
    } catch {
      return 200000;
    }
  });

  useEffect(() => {
    localStorage.setItem('learnable:tokens', String(tokenBalance));
    // Notify other components (e.g., Topbar) within this tab
    try { window.dispatchEvent(new Event('learnable-tokens-changed')); } catch {}
  }, [tokenBalance]);
  useEffect(() => {
    localStorage.setItem('learnable:tokensUsedMonth', String(monthUsed));
  }, [monthUsed]);
  useEffect(() => {
    try { localStorage.setItem('learnable:activePlan', activePlan); } catch {}
  }, [activePlan]);
  useEffect(() => {
    try { localStorage.setItem('learnable:activePlanBilling', activePlanBilling); } catch {}
  }, [activePlanBilling]);
  useEffect(() => {
    try { localStorage.setItem('learnable:subCanceled', subCanceled ? '1' : '0'); } catch {}
  }, [subCanceled]);

  const formatTokens = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
    return `${n}`;
  };

  const plans = [
    {
      name: 'Starter',
      tokensPerMonth: 200_000,
      monthly: 12,
      yearly: 120, // 2 months free
      features: ['200K tokens / mo', 'Basic rate limits', 'Email support'],
      popular: false,
    },
    {
      name: 'Pro',
      tokensPerMonth: 1_000_000,
      monthly: 39,
      yearly: 390, // 2 months free
      features: ['1M tokens / mo', 'Higher rate limits', 'Priority support'],
      popular: true,
    },
    {
      name: 'Team',
      tokensPerMonth: 4_000_000,
      monthly: 119,
      yearly: 1190, // 2 months free
      features: ['4M tokens / mo', 'Team seats (up to 5)', 'SLA & SSO (coming soon)'],
      popular: false,
    },
  ] as const;

  const tokenPacks = [
    { tokens: 50_000, price: 5 },
    { tokens: 200_000, price: 15 },
    { tokens: 1_000_000, price: 60 },
  ] as const;

  const handleRequestSwitch = (name: string) => {
    setPendingPlan(name);
    setSwitchOpen(true);
  };

  const handleBuyPack = (tokens: number) => {
    setTokenBalance((b) => b + tokens);
    toast({ description: `Added ${formatTokens(tokens)} tokens (demo only).` });
  };

  const currentPlan = useMemo(() => plans.find((p) => p.name === activePlan) || plans[0], [activePlan]);
  const monthlyUsagePercent = useMemo(() => {
    const limit = Math.max(1, currentPlan.tokensPerMonth);
    return Math.min(100, Math.round((monthUsed / limit) * 100));
  }, [currentPlan, monthUsed]);
  const monthlyRemaining = Math.max(0, (currentPlan?.tokensPerMonth ?? 0) - monthUsed);
  const currentPrice = activePlanBilling === 'monthly' ? currentPlan.monthly : currentPlan.yearly;
  const priceSuffix = activePlanBilling === 'monthly' ? '/mo' : '/yr';
  const yearlyEq = activePlanBilling === 'yearly' ? ` (~$${(currentPlan.yearly / 12).toFixed(2)}/mo)` : '';

  const saveAutoRecharge = () => {
    localStorage.setItem('learnable:autoRecharge', autoRecharge ? '1' : '0');
    localStorage.setItem('learnable:rechargeThreshold', String(rechargeThreshold));
    localStorage.setItem('learnable:rechargePack', String(rechargePack));
    toast({ description: 'Auto‑recharge preferences saved.' });
  };

  return (
    <div className="flex h-screen w-full flex-col bg-[#1C1C1C] text-white overflow-hidden">
      <Topbar />
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto w-full px-4 py-8">
          <div className="flex items-end justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-semibold">Subscriptions</h1>
              <p className="mt-1 text-sm text-white/70">Manage tokens, plans, and billing.</p>
            </div>
          </div>

          {/* Current plan summary */}
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="bg-[#121212] border-[#2A2A28] col-span-1 lg:col-span-3">
              <CardContent className="py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <div className="text-sm text-white/70">Current Plan</div>
                  <div className="mt-1 text-xl font-semibold text-white flex items-center gap-2">
                    {currentPlan.name}
                    <Badge className="bg-[#1E52F1] text-white">{formatTokens(currentPlan.tokensPerMonth)} / month</Badge>
                  </div>
                  <div className="text-xs text-white/60 mt-1">Billing: {activePlanBilling === 'monthly' ? 'Monthly' : 'Annual'}</div>
                  <div className="text-sm text-white mt-2">Price: ${currentPrice} <span className="text-white/70">{priceSuffix}{yearlyEq}</span></div>
                  <div className="text-xs mt-1">
                    <span className={`px-2 py-0.5 rounded ${subCanceled ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500/20 text-emerald-300'}`}>
                      {subCanceled ? 'Canceled (ends at period end)' : 'Active'}
                    </span>
                  </div>
                </div>
                <div className="w-full sm:w-1/2">
                  <div className="flex items-center justify-between text-xs text-white/80">
                    <span>Used this month</span>
                    <span>{formatTokens(monthUsed)} / {formatTokens(currentPlan.tokensPerMonth)} ({monthlyUsagePercent}%)</span>
                  </div>
                  <div className="mt-2">
                    <Progress value={monthlyUsagePercent} className="h-2 bg-[#232323] [&>div]:bg-[#1E52F1]" />
                  </div>
                  <div className="text-xs text-white/60 mt-1">Remaining: {formatTokens(monthlyRemaining)}</div>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  {!subCanceled ? (
                    <Button variant="ghost" className="text-rose-300 hover:text-white hover:bg-[#272725]" onClick={() => { setCancelText(''); setCancelOpen(true); }}>
                      Cancel Subscription
                    </Button>
                  ) : (
                    <Button className="bg-[#1E52F1] hover:bg-[#1E52F1]/90" onClick={() => setSubCanceled(false)}>
                      Resume Subscription
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Balance & usage */}
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="bg-[#1C1C1C] border-[#272725] col-span-1">
              <CardHeader>
                <CardTitle className="text-sm text-white">Token balance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold text-white">{formatTokens(tokenBalance)} tokens</div>
                <p className="text-xs text-white/70 mt-1">Includes any purchased packs and plan monthly allotments.</p>
              </CardContent>
            </Card>
            <Card className="bg-[#1C1C1C] border-[#272725] col-span-1">
              <CardHeader>
                <CardTitle className="text-sm text-white">Usage this month</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-sm text-white">
                  <span>{formatTokens(monthUsed)} used</span>
                  <span>{monthlyUsagePercent}%</span>
                </div>
                <div className="mt-2">
                  <Progress value={monthlyUsagePercent} className="h-2 bg-[#232323] [&>div]:bg-[#1E52F1]" />
                </div>
                <p className="text-xs text-white/70 mt-2">Plan limit: {formatTokens(currentPlan.tokensPerMonth)} / month</p>
              </CardContent>
            </Card>
            <Card className="bg-[#1C1C1C] border-[#272725] col-span-1">
              <CardHeader>
                <CardTitle className="text-sm text-white">Auto‑recharge</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-white">Enable auto‑recharge</div>
                    <div className="text-xs text-white/70">Automatically top up when balance is low.</div>
                  </div>
                  <Switch checked={autoRecharge} onCheckedChange={(v) => setAutoRecharge(!!v)} className="data-[state=checked]:bg-[#1E52F1]" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <div className="text-xs text-white">Threshold (tokens)</div>
                    <Input
                      type="number"
                      value={rechargeThreshold}
                      onChange={(e) => setRechargeThreshold(Math.max(0, parseInt(e.target.value || '0', 10)))}
                      className="bg-[#1C1C1C] border-[#2A2A28] text-white placeholder:text-white/60"
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs text-white">Pack size (tokens)</div>
                    <Input
                      type="number"
                      value={rechargePack}
                      onChange={(e) => setRechargePack(Math.max(0, parseInt(e.target.value || '0', 10)))}
                      className="bg-[#1C1C1C] border-[#2A2A28] text-white placeholder:text-white/60"
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end">
                <Button className="bg-[#1E52F1] hover:bg-[#1E52F1]/90" onClick={saveAutoRecharge}>Save</Button>
              </CardFooter>
            </Card>
          </div>

          {/* Plans */}
          <div className="mt-10 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">Plans</h2>
              <p className="text-xs text-white/70">Pick the plan that fits you. Your current plan is marked below. Switching takes effect immediately.</p>
            </div>
            <Tabs value={billing} onValueChange={(v) => setBilling(v as any)}>
              <TabsList className="bg-[#232323] text-white">
                <TabsTrigger value="monthly" className="data-[state=active]:bg-[#1E52F1] data-[state=active]:text-white">Monthly</TabsTrigger>
                <TabsTrigger value="yearly" className="data-[state=active]:bg-[#1E52F1] data-[state=active]:text-white">Yearly <span className="ml-2 text-[11px] text-white/80">(2 months free)</span></TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            {plans.map((p) => {
              const price = billing === 'monthly' ? p.monthly : p.yearly;
              const per = billing === 'monthly' ? '/mo' : '/yr';
              const perEquivalent = billing === 'yearly' ? ` (~$${(p.yearly / 12).toFixed(2)}/mo)` : '';
              const isCurrent = p.name === activePlan && billing === activePlanBilling;
              return (
                <Card key={p.name} className={`bg-[#1C1C1C] border ${isCurrent ? 'border-[#1E52F1]' : p.popular ? 'border-[#1E52F1]/60' : 'border-[#272725]'}`}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base text-white">{p.name}</CardTitle>
                    <div className="flex items-center gap-2">
                      {isCurrent && <Badge className="bg-[#1E52F1] text-white">Current</Badge>}
                      {p.popular && !isCurrent && <Badge className="bg-[#1E52F1] text-white">Popular</Badge>}
                    </div>
                  </div>
                  <div className="mt-2 text-2xl font-semibold text-white">${price}<span className="ml-1 text-sm text-white/70">{per}</span></div>
                  {perEquivalent && <div className="text-xs text-white/70">{perEquivalent}</div>}
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {p.features.map((f) => (
                    <div key={f} className="text-white">• {f}</div>
                  ))}
                </CardContent>
                  <CardFooter>
                    {isCurrent ? (
                      <Button className="w-full bg-[#1E52F1]/60 cursor-default" disabled>
                        Current Plan
                      </Button>
                    ) : (
                      <Button className="w-full bg-[#1E52F1] hover:bg-[#1E52F1]/90" onClick={() => handleRequestSwitch(p.name)} disabled={purchasesDisabled}>
                        Switch to {p.name}
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              );
            })}
          </div>

          <Separator className="my-10 bg-[#2A2A28]" />

          {/* Token packs */}
          <h2 className="text-lg font-semibold">One‑time token packs</h2>
          <p className="text-xs text-white/70">Top up anytime. Great for bursts or testing.</p>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            {tokenPacks.map((pack) => (
              <Card key={pack.tokens} className="bg-[#1C1C1C] border-[#272725]">
                <CardHeader>
                  <CardTitle className="text-base text-white">{formatTokens(pack.tokens)} tokens</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-semibold text-white">${pack.price}</div>
                  <div className="text-xs text-white/70 mt-1">Lower unit price in larger packs.</div>
                </CardContent>
                <CardFooter>
                  <Button className="w-full bg-[#1E52F1] hover:bg-[#1E52F1]/90" onClick={() => handleBuyPack(pack.tokens)} disabled={purchasesDisabled}>Buy pack</Button>
              </CardFooter>
            </Card>
          ))}
          </div>
          {purchasesDisabled && (
            <div className="mt-3 text-xs text-rose-400">Purchases are currently disabled by an admin.</div>
          )}

          {/* Payment Methods (demo) */}
          <div className="mt-8 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">Payment Methods</h2>
              <p className="text-xs text-white/70">Add, remove, or set a default method. Demo only — no real charges.</p>
            </div>
            <Button className="bg-[#1E52F1] hover:bg-[#1E52F1]/90" onClick={() => setAddPmOpen(true)}>Add Payment Method</Button>
          </div>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {paymentMethods.length === 0 ? (
              <Card className="bg-[#1C1C1C] border-[#272725] col-span-1 md:col-span-2 lg:col-span-3">
                <CardContent className="py-6 text-sm text-white/70">No payment methods yet. Click "Add Payment Method" to get started.</CardContent>
              </Card>
            ) : (
              paymentMethods.map((pm) => {
                const isDefault = defaultPmId === pm.id;
                return (
                  <Card key={pm.id} className={`bg-[#1C1C1C] border ${isDefault ? 'border-[#1E52F1]' : 'border-[#272725]'}`}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base text-white">{pm.brand} •••• {pm.last4}</CardTitle>
                        {isDefault && <Badge className="bg-[#1E52F1] text-white">Default</Badge>}
                      </div>
                    </CardHeader>
                    <CardContent className="text-sm text-white/80">
                      <div>Expires {pm.expMonth}/{pm.expYear}</div>
                      <div className="text-white/60">Cardholder: {pm.name}</div>
                    </CardContent>
                    <CardFooter className="flex items-center justify-end gap-2">
                      {!isDefault && (
                        <Button variant="ghost" className="text-[#C5C1BA] hover:text-white hover:bg-[#272725]" onClick={() => handleSetDefaultPm(pm)}>Make Default</Button>
                      )}
                      <Button variant="ghost" className="text-rose-300 hover:text-white hover:bg-[#272725]" onClick={() => setRemovePmOpen(pm)}>Remove</Button>
                    </CardFooter>
                  </Card>
                );
              })
            )}
          </div>
          <p className="mt-10 text-xs text-white/60">
            Pricing is illustrative and may change. Annual plans are typically priced with ~2 months free compared to 12× monthly.
          </p>
      </div>
    </div>

    {/* Add payment method dialog (demo) */}
    <Dialog open={addPmOpen} onOpenChange={setAddPmOpen}>
      <DialogContent className="max-w-sm bg-[#1C1C1C] text-white border border-[#272725]">
        <DialogHeader>
          <DialogTitle>Add Payment Method</DialogTitle>
          <DialogDescription className="text-white/70">Demo only — do not enter real card info.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-white/80">Cardholder Name</Label>
            <Input value={pmName} onChange={(e) => setPmName(e.target.value)} className="bg-[#1C1C1C] border-[#2A2A28] text-white placeholder:text-white/60" placeholder="Jane Learner" />
          </div>
          <div className="space-y-1">
            <Label className="text-white/80">Card Number</Label>
            <Input value={pmNumber} onChange={(e) => setPmNumber(e.target.value)} className="bg-[#1C1C1C] border-[#2A2A28] text-white placeholder:text-white/60" placeholder="4242 4242 4242 4242" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1 col-span-1">
              <Label className="text-white/80">Expiry (MM/YY)</Label>
              <Input value={pmExpiry} onChange={(e) => setPmExpiry(e.target.value)} className="bg-[#1C1C1C] border-[#2A2A28] text-white placeholder:text-white/60" placeholder="04/29" />
            </div>
            <div className="space-y-1 col-span-1">
              <Label className="text-white/80">CVC</Label>
              <Input value={pmCvc} onChange={(e) => setPmCvc(e.target.value)} className="bg-[#1C1C1C] border-[#2A2A28] text-white placeholder:text-white/60" placeholder="123" />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" className="text-white hover:text-white hover:bg-[#272725]" onClick={() => { setAddPmOpen(false); resetPmForm(); }}>Cancel</Button>
          <Button className="bg-[#1E52F1] hover:bg-[#1E52F1]/90" onClick={handleAddPm}>Add</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Remove payment method confirm */}
    <Dialog open={!!removePmOpen} onOpenChange={(v) => !v && setRemovePmOpen(null)}>
      <DialogContent className="max-w-sm bg-[#1C1C1C] text-white border border-[#272725]">
        <DialogHeader>
          <DialogTitle>Remove Payment Method</DialogTitle>
          <DialogDescription className="text-white/70">This action can be reversed by adding the card again.</DialogDescription>
        </DialogHeader>
        <div className="text-sm text-white/80">
          {removePmOpen && (<span>Remove {removePmOpen.brand} •••• {removePmOpen.last4}?</span>)}
        </div>
        <DialogFooter>
          <Button variant="ghost" className="text-white hover:text-white hover:bg-[#272725]" onClick={() => setRemovePmOpen(null)}>Cancel</Button>
          <Button className="bg-rose-600 hover:bg-rose-600/90" onClick={() => removePmOpen && handleRemovePm(removePmOpen)}>Remove</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    {/* Switch plan dialog */}
    <Dialog open={switchOpen} onOpenChange={setSwitchOpen}>
      <DialogContent className="max-w-sm bg-[#1C1C1C] text-white border border-[#272725]">
        <DialogHeader>
          <DialogTitle>Switch Plan</DialogTitle>
          <DialogDescription className="text-white/70">
            {pendingPlan ? `Switch to ${pendingPlan}?` : 'Switch plan'}
          </DialogDescription>
        </DialogHeader>
        <div className="text-sm text-white/80">
          {pendingPlan && (
            <>
              <div>
                New plan: <span className="font-semibold">{pendingPlan}</span>
              </div>
              <div className="mt-1">
                Price now: <span className="font-semibold">${billing === 'monthly' ? (plans.find(p => p.name === pendingPlan)?.monthly ?? 0) : (plans.find(p => p.name === pendingPlan)?.yearly ?? 0)}</span> {billing === 'monthly' ? '/mo' : '/yr'}
              </div>
              <div className="text-xs text-white/60 mt-2">This is a demo UI. No real billing occurs.</div>
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" className="text-white hover:text-white hover:bg-[#272725]" onClick={() => setSwitchOpen(false)}>Cancel</Button>
          <Button className="bg-[#1E52F1] hover:bg-[#1E52F1]/90" onClick={() => {
            if (pendingPlan) {
              setActivePlan(pendingPlan);
              setActivePlanBilling(billing);
              setSubCanceled(false);
              toast({ description: `Switched to ${pendingPlan} (${billing}).` });
            }
            setSwitchOpen(false);
          }}>Confirm Switch</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Cancel subscription dialog */}
    <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
      <DialogContent className="max-w-sm bg-[#1C1C1C] text-white border border-[#272725]">
        <DialogHeader>
          <DialogTitle>Cancel Subscription</DialogTitle>
          <DialogDescription className="text-white/70">
            Type UNSUBSCRIBE to confirm cancellation.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Input
            value={cancelText}
            onChange={(e) => setCancelText(e.target.value)}
            placeholder="UNSUBSCRIBE"
            className="bg-[#1C1C1C] border-[#2A2A28] text-white placeholder:text-white/60"
          />
          <div className="text-xs text-white/60">This is a demo UI. No real billing occurs.</div>
        </div>
        <DialogFooter>
          <Button variant="ghost" className="text-white hover:text-white hover:bg-[#272725]" onClick={() => setCancelOpen(false)}>Back</Button>
          <Button
            className="bg-rose-600 hover:bg-rose-600/90 disabled:bg-rose-600/40"
            disabled={cancelText.trim().toUpperCase() !== 'UNSUBSCRIBE'}
            onClick={() => {
              setSubCanceled(true);
              setCancelOpen(false);
              toast({ description: 'Subscription set to cancel at period end.' });
            }}
          >
            Confirm Cancellation
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

export default Sub;
