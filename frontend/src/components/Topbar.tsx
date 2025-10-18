import { useState, FormEvent, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { waitForGoogleScript, initGoogleId, renderGoogleButton } from '@/lib/googleAuth';
// (Drawer imports removed: not used)

type StoredUser = {
  id: number;
  email: string;
  username?: string | null;
  created_at?: string;
  token_balance?: number;
  [key: string]: unknown;
};

const authInputClasses =
  'bg-[#1C1C1C] border-[#272725] text-[#C5C1BA] placeholder:text-[#76746F]';

export const Topbar = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [isSignInOpen, setSignInOpen] = useState(false);
  const [isSignUpOpen, setSignUpOpen] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [currentUser, setCurrentUser] = useState<StoredUser | null>(null);
  const [tokenBalance, setTokenBalance] = useState<number | null>(null);
  const [now, setNow] = useState<Date>(new Date());
  const [clockHovered, setClockHovered] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000';
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

  const notifyAuthChange = () => window.dispatchEvent(new Event('learnable-auth-changed'));

  const formatTokens = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
    return `${n}`;
  };

  // Clock
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const pad2 = (n: number) => String(n).padStart(2, '0');
  const getISOWeek = (d: Date) => {
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const dayNum = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  };
  const centerClock = (() => {
    const weekday = now.toLocaleDateString(undefined, { weekday: 'short' });
    const month = now.toLocaleDateString(undefined, { month: 'short' });
    const day = now.getDate();
    const h = pad2(now.getHours());
    const m = pad2(now.getMinutes());
    const s = pad2(now.getSeconds());
    const wk = getISOWeek(now);
    const time = clockHovered ? `${h}:${m}:${s}` : `${h}:${m}`;
    return { prefix: `${weekday}, ${month} ${day} • ${time} • `, week: wk };
  })();

  // Read user
  const refreshUserFromStorage = () => {
    const storedUser = localStorage.getItem('learnableUser');
    if (!storedUser) {
      setCurrentUser(null);
      setTokenBalance(null);
      return;
    }
    try {
      const parsed = JSON.parse(storedUser) as StoredUser;
      setCurrentUser(parsed);
      setTokenBalance(typeof parsed.token_balance === 'number' ? parsed.token_balance : null);
    } catch {
      setCurrentUser(null);
      setTokenBalance(null);
    }
  };
  useEffect(() => {
    refreshUserFromStorage();
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'learnableUser') refreshUserFromStorage();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Open auth dialogs from elsewhere (e.g., Chat CTA)
  useEffect(() => {
    const openSignin = () => {
      setSignUpOpen(false);
      setSignInOpen(true);
    };
    const openSignup = () => {
      setSignInOpen(false);
      setSignUpOpen(true);
    };
    window.addEventListener('learnable-open-signin', openSignin as EventListener);
    window.addEventListener('learnable-open-signup', openSignup as EventListener);
    return () => {
      window.removeEventListener('learnable-open-signin', openSignin as EventListener);
      window.removeEventListener('learnable-open-signup', openSignup as EventListener);
    };
  }, []);

  // Google auth
  useEffect(() => {
    const shouldLoad = (isSignInOpen || isSignUpOpen) && !!googleClientId;
    if (!shouldLoad) return;
    let cancelled = false;
    (async () => {
      try {
        await waitForGoogleScript();
        if (cancelled) return;
        initGoogleId(googleClientId!, async (credential) => {
          try {
            const res = await fetch(`${apiBaseUrl}/api/auth/google`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id_token: credential }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error ?? 'Google sign-in failed');
            localStorage.setItem('learnableToken', data.token);
            localStorage.setItem('learnableUser', JSON.stringify(data.user));
            setCurrentUser(data.user);
            setTokenBalance(data.user?.token_balance ?? null);
            notifyAuthChange();
            setSignInOpen(false);
            setSignUpOpen(false);
            toast({ description: data.message ?? 'Signed in with Google' });
          } catch (err) {
            toast({ variant: 'destructive', description: (err as Error).message });
          }
        });
        ['google-signin-btn', 'google-signup-btn'].forEach((id) => {
          const el = document.getElementById(id);
          if (el) {
            el.innerHTML = '';
            const max = Math.min(360, Math.max(240, Math.floor((el.parentElement?.clientWidth ?? 320) - 8)));
            renderGoogleButton(el, 'filled_blue', max);
          }
        });
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isSignInOpen, isSignUpOpen, googleClientId, apiBaseUrl]);

  const handleSignOut = () => {
    localStorage.removeItem('learnableToken');
    localStorage.removeItem('learnableUser');
    setCurrentUser(null);
    setTokenBalance(null);
    notifyAuthChange();
    toast({ description: 'Signed out successfully.' });
  };

  const handleSignIn = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const email = String(formData.get('email') ?? '').trim();
    const password = String(formData.get('password') ?? '').trim();
    if (!email || !password)
      return toast({ variant: 'destructive', description: 'Email and password are required.' });

    setIsSigningIn(true);
    try {
      const res = await fetch(`${apiBaseUrl}/api/auth/signin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Sign in failed');
      localStorage.setItem('learnableToken', data.token);
      localStorage.setItem('learnableUser', JSON.stringify(data.user));
      setCurrentUser(data.user);
      setTokenBalance(data.user?.token_balance ?? null);
      notifyAuthChange();
      toast({ description: 'Welcome back!' });
      setSignInOpen(false);
    } catch (err) {
      toast({ variant: 'destructive', description: (err as Error).message });
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignUp = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const email = String(formData.get('email') ?? '').trim();
    const username = String(formData.get('username') ?? '').trim();
    const password = String(formData.get('password') ?? '').trim();
    if (!email || !password)
      return toast({ variant: 'destructive', description: 'Email and password are required.' });
    if (!agreeTerms)
      return toast({ variant: 'destructive', description: 'You must accept the Terms.' });

    setIsSigningUp(true);
    try {
      const res = await fetch(`${apiBaseUrl}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, username, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Sign up failed');
      localStorage.setItem('learnableToken', data.token);
      localStorage.setItem('learnableUser', JSON.stringify(data.user));
      setCurrentUser(data.user);
      setTokenBalance(data.user?.token_balance ?? null);
      notifyAuthChange();
      toast({ description: data.message ?? 'Account created.' });
      setSignUpOpen(false);
    } catch (err) {
      toast({ variant: 'destructive', description: (err as Error).message });
    } finally {
      setIsSigningUp(false);
    }
  };

  return (
    <>
      <header className="h-12 bg-[#1C1C1C] px-3 sm:px-6 flex items-center justify-between border-b border-[#272725] relative">
        {/* Left Section */}
        <div className="flex items-center gap-4">
          <div
            className="flex items-center gap-2 cursor-pointer select-none"
            role="button"
            onClick={() => {
              const token = localStorage.getItem('learnableToken');
              navigate(token ? '/my-graphs' : '/');
            }}
          >
            <span className="inline-flex items-center justify-center bg-[#1E52F1] rounded w-[28px] h-[28px]">
              <img src="/learnable-logo.png" alt="Learnable logo" className="h-6 w-6" />
            </span>
            <span className="text-[#C5C1BA] font-medium text-[13.5px]">Learnable</span>
          </div>
          {currentUser && (
            <button
              className="hidden xl:inline-flex px-3 py-1.5 text-xs border border-[#272725] rounded-md text-[#C5C1BA] hover:bg-[#272725]"
              onClick={() => navigate('/my-graphs')}
            >
              My Learning Graphs
            </button>
          )}
          <button
            className="hidden xl:inline-flex px-3 py-1.5 text-xs border border-[#272725] rounded-md text-[#C5C1BA] hover:bg-[#272725]"
            onClick={() => navigate('/vision')}
          >
            Vision
          </button>
        </div>

        {/* Center Clock */}
        <div
          className="hidden xl:block absolute left-1/2 -translate-x-1/2 text-[#C5C1BA] text-xs select-none"
          onMouseEnter={() => setClockHovered(true)}
          onMouseLeave={() => setClockHovered(false)}
        >
          {centerClock.prefix}
          <a
            href="https://vecka.nu"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#C5C1BA] hover:underline"
          >
            Week {centerClock.week}
          </a>
        </div>

        {/* Right Section */}
        <div className="hidden xl:flex items-center gap-3">
          {currentUser ? (
            <>
              {typeof tokenBalance === 'number' && (
                <button
                  className="hidden sm:flex items-center gap-2 px-3 py-1.5 h-auto text-xs border border-[#272725] rounded-md text-[#C5C1BA] hover:bg-[#272725]"
                  onClick={() => navigate('/sub')}
                >
                  <span className="opacity-80">Tokens</span>
                  <span className="font-medium text-white">{formatTokens(tokenBalance)}</span>
                </button>
              )}
              <Button
                variant="ghost"
                className="text-[#C5C1BA] hover:text-white hover:bg-[#272725] px-3 py-1.5 h-auto"
                onClick={() => navigate('/sub')}
              >
                Manage Subscription
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="h-8 w-8 rounded-full bg-[#272725] text-[#C5C1BA] hover:text-white hover:bg-[#1E52F1] flex items-center justify-center font-semibold uppercase"
                  >
                    {(currentUser.username || currentUser.email || '?')
                      .trim()
                      .charAt(0)
                      .toUpperCase() || '?'}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-40 bg-[#1C1C1C] text-[#C5C1BA] border border-[#272725]"
                >
                  <DropdownMenuItem onSelect={() => navigate('/settings')}>Settings</DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-[#272725]" />
                  <DropdownMenuItem onSelect={handleSignOut}>Sign Out</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                className="text-[#C5C1BA] hover:text-white hover:bg-[#272725]"
                onClick={() => {
                  setSignInOpen(false);
                  setSignUpOpen(true);
                }}
              >
                Explore Demo
              </Button>
              <Button
                className="bg-[#1E52F1] text-white hover:bg-[#1E52F1]/90"
                onClick={() => {
                  setSignUpOpen(false);
                  setSignInOpen(true);
                }}
              >
                Sign In
              </Button>
            </>
          )}
        </div>
      </header>

      {/* ---- Sign In Dialog ---- */}
      <Dialog open={isSignInOpen} onOpenChange={setSignInOpen}>
        <DialogContent className="bg-[#1C1C1C] border border-[#272725] text-[#C5C1BA] sm:max-w-md p-0 overflow-hidden rounded-xl">
          <div className="p-6">
            {/* Brand header */}
            <div className="flex items-center gap-3 mb-4">
              <span className="inline-flex items-center justify-center bg-[#1E52F1] rounded w-8 h-8">
                <img src="/learnable-logo.png" alt="Learnable" className="h-6 w-6" />
              </span>
              <div>
                <div className="text-sm font-semibold text-[#E5E3DF]">Welcome back</div>
                <div className="text-xs text-[#B5B2AC]">Sign in to your account</div>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signin-email">Email</Label>
                <Input id="signin-email" name="email" autoComplete="email" autoFocus type="email" required className={`${authInputClasses} h-9`} />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="signin-password">Password</Label>
                  <button type="button" className="text-xs text-[#9E9B94] hover:text-[#C5C1BA]">Forgot?</button>
                </div>
                <Input id="signin-password" name="password" type="password" autoComplete="current-password" required className={`${authInputClasses} h-9`} />
              </div>
              <Button type="submit" disabled={isSigningIn} className="w-full h-9 bg-[#1E52F1] hover:bg-[#1E52F1]/90">
                {isSigningIn ? 'Signing in…' : 'Sign In'}
              </Button>
            </form>

            {/* OR divider */}
            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-[#272725]" /></div>
              <div className="relative flex justify-center text-xs text-[#76746F]"><span className="bg-[#1C1C1C] px-2">Or continue with</span></div>
            </div>
            <div className="flex justify-center">
              <div id="google-signin-btn" className="w-full flex justify-center" />
            </div>

            {/* Switch */}
            <div className="mt-4 text-xs text-[#B5B2AC] text-center">
              Don’t have an account?{' '}
              <button
                type="button"
                className="text-[#E5E3DF] hover:underline"
                onClick={() => {
                  setSignInOpen(false);
                  setSignUpOpen(true);
                }}
              >
                Create one
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ---- Sign Up Dialog ---- */}
      <Dialog open={isSignUpOpen} onOpenChange={setSignUpOpen}>
        <DialogContent className="bg-[#1C1C1C] border border-[#272725] text-[#C5C1BA] sm:max-w-md p-0 overflow-hidden rounded-xl">
          <div className="p-6">
            {/* Brand header */}
            <div className="flex items-center gap-3 mb-4">
              <span className="inline-flex items-center justify-center bg-[#1E52F1] rounded w-8 h-8">
                <img src="/learnable-logo.png" alt="Learnable" className="h-6 w-6" />
              </span>
              <div>
                <div className="text-sm font-semibold text-[#E5E3DF]">Create your account</div>
                <div className="text-xs text-[#B5B2AC]">Start building your Learning Graph</div>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSignUp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signup-email">Email</Label>
                <Input id="signup-email" name="email" type="email" autoComplete="email" required className={`${authInputClasses} h-9`} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-username">Username (optional)</Label>
                <Input id="signup-username" name="username" type="text" autoComplete="username" className={`${authInputClasses} h-9`} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-password">Password</Label>
                <Input id="signup-password" name="password" type="password" autoComplete="new-password" required className={`${authInputClasses} h-9`} />
              </div>
              <div className="flex items-center gap-2 text-xs text-[#B5B2AC]">
                <Checkbox id="terms" checked={agreeTerms} onCheckedChange={(v) => setAgreeTerms(!!v)} />
                <Label htmlFor="terms">I agree to the <a className="underline hover:text-[#E5E3DF]" href="/terms#terms" onClick={(e) => e.stopPropagation()}>Terms</a></Label>
              </div>
              <Button type="submit" disabled={isSigningUp} className="w-full h-9 bg-[#1E52F1] hover:bg-[#1E52F1]/90">
                {isSigningUp ? 'Creating…' : 'Create account'}
              </Button>
            </form>

            {/* OR divider */}
            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-[#272725]" /></div>
              <div className="relative flex justify-center text-xs text-[#76746F]"><span className="bg-[#1C1C1C] px-2">Or continue with</span></div>
            </div>
            <div className="flex justify-center">
              <div id="google-signup-btn" className="w-full flex justify-center" />
            </div>

            {/* Switch */}
            <div className="mt-4 text-xs text-[#B5B2AC] text-center">
              Already have an account?{' '}
              <button
                type="button"
                className="text-[#E5E3DF] hover:underline"
                onClick={() => {
                  setSignUpOpen(false);
                  setSignInOpen(true);
                }}
              >
                Sign in
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
