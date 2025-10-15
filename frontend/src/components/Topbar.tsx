import { useState, FormEvent, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  const [isSignInOpen, setSignInOpen] = useState(false);
  const [isSignUpOpen, setSignUpOpen] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [currentUser, setCurrentUser] = useState<StoredUser | null>(null);
  const { toast } = useToast();

  const notifyAuthChange = () => {
    window.dispatchEvent(new Event('learnable-auth-changed'));
  };

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000';

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
  }, []);

  const handleSignOut = () => {
    localStorage.removeItem('learnableToken');
    localStorage.removeItem('learnableUser');
    setCurrentUser(null);
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
      <header className="h-12 bg-[#1C1C1C] px-6 flex items-center justify-between border-b border-[#272725]">
        {/* Logo - L Badge + Learnable Text */}
        <div className="flex items-center gap-2">
          <span
            className="inline-block bg-[#1E52F1] text-white font-medium px-3 py-1.5 rounded"
            style={{ borderRadius: '4px', fontSize: '13.5px' }}
          >
            L
          </span>
          <span className="text-[#C5C1BA] font-medium" style={{ fontSize: '13.5px' }}>
            Learnable
          </span>
        </div>

        {/* Auth Buttons */}
        <div className="flex items-center gap-3">
          {currentUser ? (
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
                  onSelect={() => toast({ description: 'Settings coming soon.' })}
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
          ) : (
            <>
              <Button
                variant="ghost"
                className="text-[#C5C1BA] hover:text-white hover:bg-[#272725] px-3 py-1.5 h-auto"
                style={{ borderRadius: '4px', fontSize: '13.5px' }}
                onClick={() => setSignUpOpen(true)}
              >
                Try Demo
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
          <form onSubmit={handleSignUp} className="space-y-4">
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
                disabled={isSigningUp}
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
          <form onSubmit={handleSignIn} className="space-y-4">
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
