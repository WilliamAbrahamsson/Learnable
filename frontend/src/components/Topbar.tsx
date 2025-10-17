import { useState, FormEvent, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { waitForGoogleScript, initGoogleId, renderGoogleButton } from '@/lib/googleAuth';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle, DrawerClose, DrawerTrigger } from '@/components/ui/drawer';
import { Menu } from 'lucide-react';

type StoredUser = {
  id: number;
  email: string;
  username?: string | null;
  created_at?: string;
  [key: string]: unknown;
};

const authInputClasses =
  'bg-[#1C1C1C] border-[#272725] text-[#C5C1BA] placeholder:text-[#76746F]';

export const Topbar = () => {
  const navigate = useNavigate();
  const [isSignInOpen, setSignInOpen] = useState(false);
  const [isSignUpOpen, setSignUpOpen] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [currentUser, setCurrentUser] = useState<StoredUser | null>(null);
  const [tokenBalance, setTokenBalance] = useState<number | null>(null);
  const [tokensUsedToday, setTokensUsedToday] = useState<number | null>(null);
  const [tokensUsedMonth, setTokensUsedMonth] = useState<number | null>(null);
  const [now, setNow] = useState<Date>(new Date());
  const [clockHovered, setClockHovered] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const { toast } = useToast();

  const notifyAuthChange = () => {
    window.dispatchEvent(new Event('learnable-auth-changed'));
  };

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000';
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

  const formatTokens = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
    return `${n}`;
  };

  // Live date/time ticker (updates every second)
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

  const refreshTokenBalanceFromStorage = () => {
    try {
      const raw = localStorage.getItem('learnable:tokens');
      if (!raw) {
        setTokenBalance(null);
        return;
      }
      const num = parseInt(raw, 10);
      if (Number.isFinite(num)) setTokenBalance(num);
    } catch {
      setTokenBalance(null);
    }
  };

  const refreshTokensUsedTodayFromStorage = () => {
    try {
      const raw = localStorage.getItem('learnable:tokensUsedToday');
      if (!raw) {
        // Default to 0 so the indicator is visible even without prior data
        setTokensUsedToday(0);
        return;
      }
      const num = parseInt(raw, 10);
      if (Number.isFinite(num)) setTokensUsedToday(num);
      else setTokensUsedToday(0);
    } catch {
      setTokensUsedToday(0);
    }
  };

  const refreshTokensUsedMonthFromStorage = () => {
    try {
      const raw = localStorage.getItem('learnable:tokensUsedMonth');
      if (!raw) {
        setTokensUsedMonth(null);
        return;
      }
      const num = parseInt(raw, 10);
      if (Number.isFinite(num)) setTokensUsedMonth(num);
    } catch {
      setTokensUsedMonth(null);
    }
  };

  const refreshUserFromStorage = () => {
    const storedUser = localStorage.getItem('learnableUser');
    if (!storedUser) {
      setCurrentUser(null);
      return;
    }

    try {
      const parsed = JSON.parse(storedUser) as StoredUser;
      if (parsed && typeof parsed === 'object' && 'email' in parsed) {
        setCurrentUser(parsed);
      } else {
        setCurrentUser(null);
      }
    } catch {
      setCurrentUser(null);
    }
  };

  useEffect(() => {
    refreshUserFromStorage();
    refreshTokenBalanceFromStorage();
    refreshTokensUsedTodayFromStorage();
    refreshTokensUsedMonthFromStorage();
    const openSignup = () => setSignUpOpen(true);
    const openSignin = () => setSignInOpen(true);
    window.addEventListener('learnable-open-signup', openSignup as any);
    window.addEventListener('learnable-open-signin', openSignin as any);
    const onTokensChanged = () => refreshTokenBalanceFromStorage();
    const onTokensUsedChanged = () => refreshTokensUsedTodayFromStorage();
    const onTokensUsedMonthChanged = () => refreshTokensUsedMonthFromStorage();
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'learnable:tokens') refreshTokenBalanceFromStorage();
      if (e.key === 'learnable:tokensUsedToday') refreshTokensUsedTodayFromStorage();
      if (e.key === 'learnable:tokensUsedMonth') refreshTokensUsedMonthFromStorage();
    };
    window.addEventListener('learnable-tokens-changed', onTokensChanged as any);
    window.addEventListener('learnable-tokens-used-changed', onTokensUsedChanged as any);
    window.addEventListener('learnable-tokens-used-month-changed', onTokensUsedMonthChanged as any);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('learnable-open-signup', openSignup as any);
      window.removeEventListener('learnable-open-signin', openSignin as any);
      window.removeEventListener('learnable-tokens-changed', onTokensChanged as any);
      window.removeEventListener('learnable-tokens-used-changed', onTokensUsedChanged as any);
      window.removeEventListener('learnable-tokens-used-month-changed', onTokensUsedMonthChanged as any);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  // Initialize Google button when dialogs open
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
            const response = await fetch(`${apiBaseUrl}/api/auth/google`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id_token: credential }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error ?? 'Google sign-in failed');

            localStorage.setItem('learnableToken', data.token);
            localStorage.setItem('learnableUser', JSON.stringify(data.user));
            setCurrentUser(data.user as StoredUser);
            notifyAuthChange();
            setSignInOpen(false);
            setSignUpOpen(false);
            toast({ description: data.message ?? 'Signed in with Google' });
          } catch (err) {
            const message = err instanceof Error ? err.message : 'Google sign-in failed';
            toast({ variant: 'destructive', description: message });
          }
        });

        const signinBtn = document.getElementById('google-signin-btn');
        if (signinBtn) {
          signinBtn.innerHTML = '';
          renderGoogleButton(signinBtn as HTMLElement);
        }
        const signupBtn = document.getElementById('google-signup-btn');
        if (signupBtn) {
          signupBtn.innerHTML = '';
          renderGoogleButton(signupBtn as HTMLElement);
        }
      } catch {
        // Ignore load failures; button just won't render
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
    setTokensUsedToday(null);
    notifyAuthChange();
    toast({ description: 'Signed out successfully.' });
  };

  const handleSignIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const email = String(formData.get('email') ?? '').trim();
    const password = String(formData.get('password') ?? '').trim();

    if (!email || !password) {
      toast({
        variant: 'destructive',
        description: 'Email and password are required.',
      });
      return;
    }

    setIsSigningIn(true);
    try {
      const response = await fetch(`${apiBaseUrl}/api/auth/signin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? 'Sign in failed');
      }

      localStorage.setItem('learnableToken', data.token);
      localStorage.setItem('learnableUser', JSON.stringify(data.user));

      setCurrentUser(data.user as StoredUser);
      notifyAuthChange();
      form.reset();
      toast({ description: 'Welcome back!' });
      setSignInOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Sign in failed';
      toast({ variant: 'destructive', description: message });
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignUp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const email = String(formData.get('email') ?? '').trim();
    const username = String(formData.get('username') ?? '').trim();
    const password = String(formData.get('password') ?? '').trim();

    if (!email || !password) {
      toast({
        variant: 'destructive',
        description: 'Email and password are required.',
      });
      return;
    }

    if (!agreeTerms) {
      toast({ variant: 'destructive', description: 'You must accept the Terms to continue.' });
      return;
    }

    setIsSigningUp(true);
    try {
      const response = await fetch(`${apiBaseUrl}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, username: username || undefined, password }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? 'Sign up failed');
      }

      localStorage.setItem('learnableToken', data.token);
      localStorage.setItem('learnableUser', JSON.stringify(data.user));

      setCurrentUser(data.user as StoredUser);
      notifyAuthChange();
      form.reset();
      toast({ description: data.message ?? 'Account ready. Enjoy the demo!' });
      setSignUpOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Sign up failed';
      toast({ variant: 'destructive', description: message });
    } finally {
      setIsSigningUp(false);
    }
  };

  return (
    <>
      <header className="h-12 bg-[#1C1C1C] px-3 sm:px-6 flex items-center justify-between border-b border-[#272725] relative">
        {/* Left: Logo + Nav */}
        <div className="flex items-center gap-4">
          {/* Logo - L Badge + Learnable Text */}
          <div
            className="flex items-center gap-2 cursor-pointer select-none"
            role="button"
            aria-label="Go to home"
            tabIndex={0}
            onClick={() => {
              try {
                const token = localStorage.getItem('learnableToken');
                navigate(token ? '/my-graphs' : '/');
              } catch { navigate('/'); }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                try {
                  const token = localStorage.getItem('learnableToken');
                  navigate(token ? '/my-graphs' : '/');
                } catch { navigate('/'); }
              }
            }}
          >
            <span
              className="inline-flex items-center justify-center bg-[#1E52F1] rounded"
              style={{ borderRadius: '4px', width: '28px', height: '28px' }}
            >
              <img src="/learnable-logo.png" alt="Learnable logo" className="h-6 w-6" />
            </span>
            <span className="text-[#C5C1BA] font-medium" style={{ fontSize: '13.5px' }}>
              Learnable
            </span>
          </div>
          {/* My Learning Graphs only when signed in */}
          {currentUser && (
            <button
              className="hidden xl:inline-flex px-3 py-1.5 h-auto text-xs border border-[#272725] rounded-md text-[#C5C1BA] hover:bg-[#272725] hover:text-white transition-colors"
              onClick={() => navigate('/my-graphs')}
            >
              My Learning Graphs
            </button>
          )}
          <button
            className="hidden xl:inline-flex px-3 py-1.5 h-auto text-xs border border-[#272725] rounded-md text-[#C5C1BA] hover:bg-[#272725] hover:text-white transition-colors"
            onClick={() => navigate('/vision')}
          >
            Vision
          </button>
        </div>

        {/* Center: Date • Time • Week */}
        <div
          className="hidden xl:block absolute left-1/2 -translate-x-1/2 text-[#C5C1BA] text-xs sm:text-sm select-none"
          aria-live="polite"
          onMouseEnter={() => setClockHovered(true)}
          onMouseLeave={() => setClockHovered(false)}
        >
          {centerClock.prefix}
          <a
            href="https://vecka.nu"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#C5C1BA] underline-offset-4 hover:underline"
            aria-label={`Open vecka.nu (Week ${centerClock.week})`}
          >
            Week {centerClock.week}
          </a>
        </div>

        {/* Mobile menu (hamburger) */}
        <div className="xl:hidden flex items-center gap-2">
          <Drawer>
            <DrawerTrigger asChild>
              <button
                className="inline-flex items-center justify-center rounded-md h-8 w-8 text-[#C5C1BA] hover:text-white hover:bg-[#272725]"
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" />
              </button>
            </DrawerTrigger>
            <DrawerContent className="bg-[#1C1C1C] text-[#C5C1BA] border-t border-[#272725]">
              <DrawerHeader>
                <DrawerTitle className="text-[#E5E3DF]">Menu</DrawerTitle>
                <DrawerDescription className="text-[#76746F]">Quick actions</DrawerDescription>
              </DrawerHeader>
              <div className="px-4 pb-4 space-y-2">
                <button className="w-full text-left px-3 py-2 rounded border border-[#272725] hover:bg-[#272725]" onClick={()=>navigate('/vision')}>Vision</button>
                {currentUser && (
                  <button className="w-full text-left px-3 py-2 rounded border border-[#272725] hover:bg-[#272725]" onClick={()=>navigate('/my-graphs')}>My Learning Graphs</button>
                )}
                {currentUser ? (
                  <>
                    <button className="w-full text-left px-3 py-2 rounded border border-[#272725] hover:bg-[#272725]" onClick={()=>navigate('/sub')}>Manage Subscription</button>
                    <button className="w-full text-left px-3 py-2 rounded border border-[#272725] hover:bg-[#272725]" onClick={()=>navigate('/settings')}>Settings</button>
                    <button className="w-full text-left px-3 py-2 rounded border border-[#272725] hover:bg-[#272725]" onClick={handleSignOut}>Sign Out</button>
                  </>
                ) : (
                  <>
                    <button className="w-full text-left px-3 py-2 rounded border border-[#272725] hover:bg-[#272725]" onClick={()=>setSignUpOpen(true)}>Explore Demo</button>
                    <button className="w-full text-left px-3 py-2 rounded border border-[#272725] hover:bg-[#272725]" onClick={()=>setSignInOpen(true)}>Sign In</button>
                  </>
                )}
              </div>
              <DrawerClose asChild>
                <button className="mx-4 mb-4 w-full h-9 rounded bg-[#1E52F1] text-white hover:bg-[#1E52F1]/90">Close</button>
              </DrawerClose>
            </DrawerContent>
          </Drawer>
        </div>

        {/* Auth Buttons */}
        <div className="hidden xl:flex items-center gap-3">
          {currentUser ? (
            <>
            {typeof tokensUsedToday === 'number' && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className="hidden sm:flex items-center gap-2 px-3 py-1.5 h-auto text-xs border border-[#272725] rounded-md text-[#C5C1BA] cursor-default"
                    aria-label="Tokens used today"
                  >
                    <span className="opacity-80">Used Today</span>
                    <span className="font-medium text-white">5.2k</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent className="bg-[#1C1C1C] text-[#C5C1BA] border border-[#272725]">
                  {(() => {
                    const daysIntoMonth = new Date().getDate();
                    const usual = typeof tokensUsedMonth === 'number' && tokensUsedMonth > 0 ? Math.round(tokensUsedMonth / Math.max(1, daysIntoMonth)) : null;
                    if (!usual) return <span>No baseline yet for comparison.</span>;
                    const diff = tokensUsedToday - usual;
                    const pct = usual > 0 ? Math.round((diff / usual) * 100) : 0;
                    const trend = diff === 0 ? 'at usual' : diff > 0 ? 'above usual' : 'below usual';
                    return (
                      <div className="text-xs">
                        <div>Today: 5.2k tokens</div>
                        <div>Usual: {formatTokens(usual)}/day</div>
                        <div className="opacity-80">{Math.abs(pct)}% {trend}</div>
                      </div>
                    );
                  })()}
                </TooltipContent>
              </Tooltip>
            )}
            {typeof tokenBalance === 'number' && (
              <button
                className="hidden sm:flex items-center gap-2 px-3 py-1.5 h-auto text-xs border border-[#272725] rounded-md text-[#C5C1BA] hover:bg-[#272725] hover:text-white transition-colors"
                title="Token balance"
                aria-label="Open subscriptions"
                onClick={() => navigate('/sub')}
              >
                <span className="opacity-80">Tokens</span>
                <span className="font-medium text-white">{formatTokens(tokenBalance)}</span>
              </button>
            )}
            <Button
              variant="ghost"
              className="text-[#C5C1BA] hover:text-white hover:bg-[#272725] px-3 py-1.5 h-auto"
              style={{ borderRadius: '4px', fontSize: '13.5px' }}
              onClick={() => navigate('/sub')}
            >
              Manage Subscription
            </Button>
            {/* Admin Panel moved to footer when available */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="h-8 w-8 rounded-full bg-[#272725] text-[#C5C1BA] hover:text-white hover:bg-[#1E52F1] transition-colors flex items-center justify-center font-semibold uppercase"
                  aria-label="User menu"
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
                <DropdownMenuItem
                  className="focus:bg-[#272725] focus:text-white"
                  onSelect={() => navigate('/settings')}
                >
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-[#272725]" />
                <DropdownMenuItem
                  className="focus:bg-[#272725] focus:text-white"
                  onSelect={handleSignOut}
                >
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                className="text-[#C5C1BA] hover:text-white hover:bg-[#272725] px-3 py-1.5 h-auto"
                style={{ borderRadius: '4px', fontSize: '13.5px' }}
                onClick={() => setSignUpOpen(true)}
              >
                Explore Demo
              </Button>
              <Button
                className="bg-[#1E52F1] text-white hover:bg-[#1E52F1]/90 transition-colors px-3 py-1.5 h-auto"
                style={{ borderRadius: '4px', fontSize: '13.5px' }}
                onClick={() => setSignInOpen(true)}
              >
                Sign In
              </Button>
            </>
          )}
        </div>
      </header>

      {/* Sign Up Dialog (Try Demo) */}
      <Dialog open={isSignUpOpen} onOpenChange={setSignUpOpen}>
        <DialogContent className="max-w-sm bg-[#1C1C1C] text-[#C5C1BA] border border-[#272725]">
          <DialogHeader>
            <DialogTitle className="text-[#C5C1BA]">Get Started</DialogTitle>
            <DialogDescription className="text-[#76746F]">
              Create a quick demo account with your email and a password.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {googleClientId && (
              <div className="space-y-2">
                <div id="google-signup-btn" className="flex justify-center"></div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-px bg-[#272725]" />
                  <span className="text-xs text-[#76746F]">or</span>
                  <div className="flex-1 h-px bg-[#272725]" />
                </div>
              </div>
            )}
          </div>
          <form onSubmit={handleSignUp} className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label htmlFor="signup-email" className="text-[#C5C1BA]">
                Email
              </Label>
              <Input
                id="signup-email"
                name="email"
                type="email"
                placeholder="you@example.com"
                required
                className={authInputClasses}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="signup-username" className="text-[#C5C1BA]">
                Username (optional)
              </Label>
              <Input
                id="signup-username"
                name="username"
                placeholder="Learner123"
                className={authInputClasses}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="signup-password" className="text-[#C5C1BA]">
                Password
              </Label>
              <Input
                id="signup-password"
                name="password"
                type="password"
                placeholder="••••••••"
                required
                className={authInputClasses}
              />
          </div>
            <div className="flex items-start gap-2 text-xs text-[#C5C1BA]">
              <Checkbox
                id="signup-terms"
                checked={agreeTerms}
                onCheckedChange={(v) => setAgreeTerms(!!v)}
                className="mt-0.5 border-[#2A2A28] data-[state=checked]:bg-[#1E52F1]"
              />
              <Label htmlFor="signup-terms" className="leading-tight text-[#C5C1BA]">
                I agree to the{' '}
                <a href="/terms#terms" className="text-[#1E52F1] hover:underline">Terms</a>,{' '}
                <a href="/terms#privacy" className="text-[#1E52F1] hover:underline">Privacy Policy</a> and{' '}
                <a href="/terms#cookies" className="text-[#1E52F1] hover:underline">Cookie Policy</a>.
              </Label>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                className="text-[#C5C1BA] hover:text-white hover:bg-[#272725]"
                onClick={() => setSignUpOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-[#1E52F1] hover:bg-[#1E52F1]/90"
                disabled={isSigningUp || !agreeTerms}
              >
                {isSigningUp ? 'Creating...' : 'Create Demo'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Sign In Dialog */}
      <Dialog open={isSignInOpen} onOpenChange={setSignInOpen}>
        <DialogContent className="max-w-sm bg-[#1C1C1C] text-[#C5C1BA] border border-[#272725]">
          <DialogHeader>
            <DialogTitle className="text-[#C5C1BA]">Welcome back</DialogTitle>
            <DialogDescription className="text-[#76746F]">
              Enter your credentials to continue learning.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {googleClientId && (
              <div className="space-y-2">
                <div id="google-signin-btn" className="flex justify-center"></div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-px bg-[#272725]" />
                  <span className="text-xs text-[#76746F]">or</span>
                  <div className="flex-1 h-px bg-[#272725]" />
                </div>
              </div>
            )}
          </div>
          <form onSubmit={handleSignIn} className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label htmlFor="signin-email" className="text-[#C5C1BA]">
                Email
              </Label>
              <Input
                id="signin-email"
                name="email"
                type="email"
                placeholder="you@example.com"
                required
                className={authInputClasses}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="signin-password" className="text-[#C5C1BA]">
                Password
              </Label>
              <Input
                id="signin-password"
                name="password"
                type="password"
                placeholder="••••••••"
                required
                className={authInputClasses}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                className="text-[#C5C1BA] hover:text-white hover:bg-[#272725]"
                onClick={() => setSignInOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-[#1E52F1] hover:bg-[#1E52F1]/90"
                disabled={isSigningIn}
              >
                {isSigningIn ? 'Signing in...' : 'Sign In'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};
