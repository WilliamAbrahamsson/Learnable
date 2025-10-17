import { useEffect, useState } from 'react';
import { Topbar } from '@/components/Topbar';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

// ✅ Backend token purchase call
const buyTokens = async (tokens: number, price: number) => {
  const token = localStorage.getItem('learnableToken');
  if (!token) throw new Error('Not signed in');

  const res = await fetch(
    `${import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5000'}/api/payments/buy`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        tokens,
        price_usd: price,
        product_name: `${tokens.toLocaleString()} Token Pack`,
      }),
    }
  );

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Purchase failed');
  return data;
};

const Sub = () => {
  const currentYear = new Date().getFullYear();
  const { toast } = useToast();

  const [activePlan] = useState('Free Trial');
  const [tokenBalance, setTokenBalance] = useState<number>(() => {
    try {
      const u = JSON.parse(localStorage.getItem('learnableUser') || '{}');
      return u?.token_balance || 50000;
    } catch {
      return 50000;
    }
  });
  const [purchasesDisabled, setPurchasesDisabled] = useState<boolean>(() => {
    return localStorage.getItem('learnable:disablePurchases') === '1';
  });

  // --- Payment Methods ---
  type PaymentMethod = {
    id: string;
    brand: string;
    last4: string;
    expMonth: string;
    expYear: string;
    name: string;
  };
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>(() => {
    try {
      const raw = localStorage.getItem('learnable:paymentMethods');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [defaultPmId, setDefaultPmId] = useState<string | null>(() => {
    return localStorage.getItem('learnable:defaultPaymentMethod') || null;
  });
  const [addPmOpen, setAddPmOpen] = useState(false);
  const [removePmOpen, setRemovePmOpen] = useState<null | PaymentMethod>(null);
  const [pmName, setPmName] = useState('');
  const [pmNumber, setPmNumber] = useState('');
  const [pmExpiry, setPmExpiry] = useState('');
  const [pmCvc, setPmCvc] = useState('');

  useEffect(() => {
    localStorage.setItem('learnable:paymentMethods', JSON.stringify(paymentMethods));
  }, [paymentMethods]);
  useEffect(() => {
    if (defaultPmId) localStorage.setItem('learnable:defaultPaymentMethod', defaultPmId);
  }, [defaultPmId]);

  const detectBrand = (num: string) => {
    const n = num.replace(/\D/g, '');
    if (n.startsWith('4')) return 'Visa';
    if (n.startsWith('5')) return 'Mastercard';
    if (n.startsWith('3')) return 'Amex';
    if (n.startsWith('6')) return 'Discover';
    return 'Card';
  };

  const resetPmForm = () => {
    setPmName('');
    setPmNumber('');
    setPmExpiry('');
    setPmCvc('');
  };

  const handleAddPm = () => {
    const digits = pmNumber.replace(/\D/g, '');
    if (digits.length < 12) {
      toast({ variant: 'destructive', description: 'Enter a valid card number.' });
      return;
    }
    const [mm, yy] = pmExpiry.split('/').map((s) => s.trim());
    if (!mm || !yy) {
      toast({ variant: 'destructive', description: 'Enter expiry as MM/YY.' });
      return;
    }
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

  const formatTokens = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
    return `${n}`;
  };

  const plans = [
    {
      name: 'Free Trial',
      tokensPerMonth: 50_000,
      features: ['Includes 50K free tokens', 'Basic rate limits', '7-day free access'],
    },
  ];

  const plan = plans.find((p) => p.name === activePlan)!;

  const tokenPacks = [
    { tokens: 50_000, price: 5 },
    { tokens: 200_000, price: 15 },
    { tokens: 1_000_000, price: 60 },
  ];

  const handleBuyPack = async (tokens: number, price: number) => {
    try {
      const data = await buyTokens(tokens, price);
      const newBalance = data.user.token_balance;

      const storedUser = localStorage.getItem('learnableUser');
      if (storedUser) {
        const u = JSON.parse(storedUser);
        u.token_balance = newBalance;
        localStorage.setItem('learnableUser', JSON.stringify(u));
      }

      setTokenBalance(newBalance);
      window.dispatchEvent(new Event('storage')); // notify Topbar
      toast({ description: data.message || `Added ${formatTokens(tokens)} tokens.` });
    } catch (err: any) {
      toast({ variant: 'destructive', description: err.message || 'Error buying pack.' });
    }
  };

  return (
    <div className="flex h-screen w-full flex-col bg-[#1C1C1C] text-white overflow-hidden">
      <Topbar />
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto w-full px-4 py-8">
          <div className="flex items-end justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-semibold">Subscriptions</h1>
              <p className="mt-1 text-sm text-white/70">Manage your tokens and billing.</p>
            </div>
          </div>

          {/* Current Plan */}
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="bg-[#121212] border-[#2A2A28] col-span-1 lg:col-span-3">
              <CardContent className="py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <div className="text-sm text-white/70">Current Plan</div>
                  <div className="mt-1 text-xl font-semibold text-white flex items-center gap-2">
                    {plan.name}
                    <Badge className="bg-[#10B981]/20 text-[#CFF5E9]">Active</Badge>
                  </div>
                  <div className="text-xs text-white/60 mt-1">
                    Includes {formatTokens(plan.tokensPerMonth)} free tokens.
                  </div>
                  <div className="text-sm text-white mt-2">Price: Free</div>
                </div>

                <div className="w-full sm:w-1/2 text-right">
                  <div className="text-xs text-white/70 mb-1">Total Tokens</div>
                  <div className="text-2xl font-semibold text-white">
                    {formatTokens(tokenBalance)}{' '}
                    <span className="text-white/60 text-sm">available</span>
                  </div>
                  <div className="text-xs text-white/60 mt-1">
                    Plan limit: {formatTokens(plan.tokensPerMonth)}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Token Packs */}
          <h2 className="mt-10 text-lg font-semibold">One-time token packs</h2>
          <p className="text-xs text-white/70">Top up anytime. Great for bursts or testing.</p>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            {tokenPacks.map((pack) => (
              <Card key={pack.tokens} className="bg-[#1C1C1C] border-[#272725]">
                <CardHeader>
                  <CardTitle className="text-base text-white">
                    {formatTokens(pack.tokens)} tokens
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-semibold text-white">${pack.price}</div>
                  <div className="text-xs text-white/70 mt-1">
                    Lower unit price in larger packs.
                  </div>
                </CardContent>
                <CardFooter>
                  <Button
                    className="w-full bg-[#1E52F1] hover:bg-[#1E52F1]/90"
                    onClick={() => handleBuyPack(pack.tokens, pack.price)}
                    disabled={purchasesDisabled}
                  >
                    Buy pack
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>

          <Separator className="my-10 bg-[#2A2A28]" />

          {/* Payment Methods */}
          <div className="mt-8 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">Payment Methods</h2>
              <p className="text-xs text-white/70">
                Add, remove, or set a default method. Demo only — no real charges.
              </p>
            </div>
            <Button
              className="bg-[#1E52F1] hover:bg-[#1E52F1]/90"
              onClick={() => setAddPmOpen(true)}
            >
              Add Payment Method
            </Button>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {paymentMethods.length === 0 ? (
              <Card className="bg-[#1C1C1C] border-[#272725] col-span-1 md:col-span-2 lg:col-span-3">
                <CardContent className="py-6 text-sm text-white/70">
                  No payment methods yet. Click "Add Payment Method" to get started.
                </CardContent>
              </Card>
            ) : (
              paymentMethods.map((pm) => {
                const isDefault = defaultPmId === pm.id;
                return (
                  <Card
                    key={pm.id}
                    className={`bg-[#1C1C1C] border ${
                      isDefault ? 'border-[#1E52F1]' : 'border-[#272725]'
                    }`}
                  >
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base text-white">
                          {pm.brand} •••• {pm.last4}
                        </CardTitle>
                        {isDefault && (
                          <Badge className="bg-[#1E52F1] text-white">Default</Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="text-sm text-white/80">
                      <div>
                        Expires {pm.expMonth}/{pm.expYear}
                      </div>
                      <div className="text-white/60">Cardholder: {pm.name}</div>
                    </CardContent>
                    <CardFooter className="flex items-center justify-end gap-2">
                      {!isDefault && (
                        <Button
                          variant="ghost"
                          className="text-[#C5C1BA] hover:text-white hover:bg-[#272725]"
                          onClick={() => handleSetDefaultPm(pm)}
                        >
                          Make Default
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        className="text-rose-300 hover:text-white hover:bg-[#272725]"
                        onClick={() => setRemovePmOpen(pm)}
                      >
                        Remove
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Add payment dialog */}
      <Dialog open={addPmOpen} onOpenChange={setAddPmOpen}>
        <DialogContent className="max-w-sm bg-[#1C1C1C] text-white border border-[#272725]">
          <DialogHeader>
            <DialogTitle>Add Payment Method</DialogTitle>
            <DialogDescription className="text-white/70">
              Demo only — do not enter real card info.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-white/80">Cardholder Name</Label>
              <Input
                value={pmName}
                onChange={(e) => setPmName(e.target.value)}
                className="bg-[#1C1C1C] border-[#2A2A28] text-white"
                placeholder="Jane Learner"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-white/80">Card Number</Label>
              <Input
                value={pmNumber}
                onChange={(e) => setPmNumber(e.target.value)}
                className="bg-[#1C1C1C] border-[#2A2A28] text-white"
                placeholder="4242 4242 4242 4242"
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1 col-span-1">
                <Label className="text-white/80">Expiry (MM/YY)</Label>
                <Input
                  value={pmExpiry}
                  onChange={(e) => setPmExpiry(e.target.value)}
                  className="bg-[#1C1C1C] border-[#2A2A28] text-white"
                  placeholder="04/29"
                />
              </div>
              <div className="space-y-1 col-span-1">
                <Label className="text-white/80">CVC</Label>
                <Input
                  value={pmCvc}
                  onChange={(e) => setPmCvc(e.target.value)}
                  className="bg-[#1C1C1C] border-[#2A2A28] text-white"
                  placeholder="123"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              className="text-white hover:bg-[#272725]"
              onClick={() => {
                setAddPmOpen(false);
                resetPmForm();
              }}
            >
              Cancel
            </Button>
            <Button className="bg-[#1E52F1] hover:bg-[#1E52F1]/90" onClick={handleAddPm}>
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove payment dialog */}
      <Dialog open={!!removePmOpen} onOpenChange={(v) => !v && setRemovePmOpen(null)}>
        <DialogContent className="max-w-sm bg-[#1C1C1C] text-white border border-[#272725]">
          <DialogHeader>
            <DialogTitle>Remove Payment Method</DialogTitle>
            <DialogDescription className="text-white/70">
              This action can be reversed by adding the card again.
            </DialogDescription>
          </DialogHeader>
          <div className="text-sm text-white/80">
            {removePmOpen && (
              <span>
                Remove {removePmOpen.brand} •••• {removePmOpen.last4}?
              </span>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              className="text-white hover:bg-[#272725]"
              onClick={() => setRemovePmOpen(null)}
            >
              Cancel
            </Button>
            <Button
              className="bg-rose-600 hover:bg-rose-600/90"
              onClick={() => removePmOpen && handleRemovePm(removePmOpen)}
            >
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <footer className="relative border-t border-[#272725] py-3 text-center text-xs text-white/60">
        © {currentYear} Learnable. All rights reserved.
      </footer>
    </div>
  );
};

export default Sub;
