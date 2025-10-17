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
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
  DrawerTrigger,
} from '@/components/ui/drawer';
import { Menu } from 'lucide-react';

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
  const [isSignInOpen, setSignInOpen] = useState(false);
  const [isSignUpOpen, setSignUpOpen] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [currentUser, setCurrentUser] = useState<StoredUser | null>(null);
  const [tokenBalance, setTokenBalance] = useState<number | null>(null);
  const [now, setNow] = useState<Date>(new Date());
  const [clockHovered, setClockHovered] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const { toast } = useToast();

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

  // Read user from localStorage
  const refreshUserFromStorage = () => {
    const storedUser = localStorage.getItem('learnableUser');
    if (!storedUser) {
      setCurrentUser(null);
      setTokenBalance(null);
      return;
    }
    try {
      const parsed = JSON.parse(storedUser) as StoredUser;
      if (parsed && parsed.email) {
        setCurrentUser(parsed);
        setTokenBalance(typeof parsed.token_balance === 'number' ? parsed.token_balance : null);
      } else {
        setCurrentUser(null);
        setTokenBalance(null);
      }
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
            renderGoogleButton(el);
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

        {/* Mobile Drawer */}
        <div className="xl:hidden flex items-center gap-2">
          <Drawer>
            <DrawerTrigger asChild>
              <button className="inline-flex items-center justify-center rounded-md h-8 w-8 text-[#C5C1BA] hover:text-white hover:bg-[#272725]">
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

        {/* Right Section */}
        <div className="hidden xl:flex items-center gap-3">
          {currentUser ? (
            <>
              {typeof tokenBalance === 'number' && (
                <button
                  className="hidden sm:flex items-center gap-2 px-3 py-1.5 h-auto text-xs border border-[#272725] rounded-md text-[#C5C1BA] hover:bg-[#272725] hover:text-white transition-colors"
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
                  <DropdownMenuItem onSelect={() => navigate('/settings')}>
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-[#272725]" />
                  <DropdownMenuItem onSelect={handleSignOut}>Sign Out</DropdownMenuItem>
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

      {/* Dialogs remain same (sign up/sign in) using handleSignUp & handleSignIn */}
    </>
  );
};
