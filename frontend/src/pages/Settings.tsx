import { useEffect, useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Topbar } from '@/components/Topbar';

type ChatPrefs = {
  enterToSend: boolean;
  showTypingIndicator: boolean;
  showProposalCards: boolean;
};

type GraphPrefs = {
  snapToGrid: boolean;
  showConnectionLabels: boolean;
};

const SETTINGS_KEY = 'learnable:prefs';

const loadPrefs = (): { chat: ChatPrefs; graph: GraphPrefs } => {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) throw new Error('no prefs');
    const parsed = JSON.parse(raw);
    return {
      chat: {
        enterToSend: !!parsed?.chat?.enterToSend,
        showTypingIndicator: !!parsed?.chat?.showTypingIndicator,
        showProposalCards: parsed?.chat?.showProposalCards ?? true,
      },
      graph: {
        snapToGrid: !!parsed?.graph?.snapToGrid,
        showConnectionLabels: !!parsed?.graph?.showConnectionLabels,
      },
    };
  } catch {
    return {
      chat: { enterToSend: true, showTypingIndicator: true, showProposalCards: true },
      graph: { snapToGrid: false, showConnectionLabels: false },
    };
  }
};

const savePrefs = (prefs: { chat: ChatPrefs; graph: GraphPrefs }) => {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(prefs));
};

const Settings = () => {
  const { toast } = useToast();
  const currentUser = useMemo(() => {
    try {
      const raw = localStorage.getItem('learnableUser');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

  const [email] = useState<string>(currentUser?.email ?? '');
  const [username, setUsername] = useState<string>(currentUser?.username ?? '');
  const [chat, setChat] = useState<ChatPrefs>(loadPrefs().chat);
  const [graph, setGraph] = useState<GraphPrefs>(loadPrefs().graph);

  useEffect(() => {
    savePrefs({ chat, graph });
  }, [chat, graph]);

  const saveProfile = () => {
    // Persist locally only for now
    try {
      const raw = localStorage.getItem('learnableUser');
      const user = raw ? JSON.parse(raw) : {};
      localStorage.setItem('learnableUser', JSON.stringify({ ...user, username }));
      window.dispatchEvent(new Event('learnable-auth-changed'));
      toast({ description: 'Profile updated.' });
    } catch {
      toast({ variant: 'destructive', description: 'Failed to save profile.' });
    }
  };

  const currentYear = new Date().getFullYear();

  return (
    <div className="flex h-screen w-full flex-col bg-[#1C1C1C] text-[#C5C1BA] overflow-hidden">
      <Topbar />
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto w-full px-4 py-8">
          <h1 className="text-2xl font-semibold">Settings</h1>
          <p className="mt-2 text-sm text-[#B5B2AC]">Tune your Learnable experience.</p>

          <div className="mt-8 grid gap-8">
          {/* Account */}
          <section>
            <h2 className="text-lg font-semibold">Account</h2>
            <p className="text-xs text-[#B5B2AC] mb-4">Manage your account details.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-[#C5C1BA]">Email</Label>
                <Input id="email" value={email} disabled className="bg-[#1C1C1C] border-[#2A2A28]" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="username" className="text-[#C5C1BA]">Username</Label>
                <Input
                  id="username"
                  placeholder="Your name"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="bg-[#1C1C1C] border-[#2A2A28]"
                />
              </div>
            </div>
            <div className="mt-4">
              <Button onClick={saveProfile} className="bg-[#1E52F1] hover:bg-[#1E52F1]/90">Save changes</Button>
            </div>
          </section>

          <Separator className="bg-[#2A2A28]" />

          {/* Chat Preferences */}
          <section>
            <h2 className="text-lg font-semibold">Chat</h2>
            <p className="text-xs text-[#B5B2AC] mb-4">Customize how chat behaves.</p>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm">Press Enter to send</div>
                  <div className="text-xs text-[#B5B2AC]">Shift+Enter inserts a new line.</div>
                </div>
                <Switch checked={chat.enterToSend} onCheckedChange={(v) => setChat({ ...chat, enterToSend: !!v })} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm">Show typing indicator</div>
                  <div className="text-xs text-[#B5B2AC]">Animate assistant while it’s generating.</div>
                </div>
                <Switch checked={chat.showTypingIndicator} onCheckedChange={(v) => setChat({ ...chat, showTypingIndicator: !!v })} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm">Show proposal cards</div>
                  <div className="text-xs text-[#B5B2AC]">Offer quick-add suggestions from assistant replies.</div>
                </div>
                <Switch checked={chat.showProposalCards} onCheckedChange={(v) => setChat({ ...chat, showProposalCards: !!v })} />
              </div>
            </div>
          </section>

          <Separator className="bg-[#2A2A28]" />

          {/* Graph Preferences */}
          <section>
            <h2 className="text-lg font-semibold">Learning Graph</h2>
            <p className="text-xs text-[#B5B2AC] mb-4">Adjust how your canvas behaves.</p>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm">Snap to grid</div>
                  <div className="text-xs text-[#B5B2AC]">Keeps notes aligned neatly.</div>
                </div>
                <Switch checked={graph.snapToGrid} onCheckedChange={(v) => setGraph({ ...graph, snapToGrid: !!v })} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm">Show connection labels</div>
                  <div className="text-xs text-[#B5B2AC]">Display labels on connectors where available.</div>
                </div>
                <Switch checked={graph.showConnectionLabels} onCheckedChange={(v) => setGraph({ ...graph, showConnectionLabels: !!v })} />
              </div>
            </div>
          </section>

          <Separator className="bg-[#2A2A28]" />

          {/* Security (placeholder) */}
          <section>
            <h2 className="text-lg font-semibold">Security</h2>
            <p className="text-xs text-[#B5B2AC] mb-4">Password updates and sessions (coming soon).</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="current-password">Current password</Label>
                <Input id="current-password" type="password" disabled className="bg-[#1C1C1C] border-[#2A2A28]" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password">New password</Label>
                <Input id="new-password" type="password" disabled className="bg-[#1C1C1C] border-[#2A2A28]" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm new password</Label>
                <Input id="confirm-password" type="password" disabled className="bg-[#1C1C1C] border-[#2A2A28]" />
              </div>
            </div>
            <div className="mt-4">
              <Button disabled className="bg-[#1E52F1]/40">Update password</Button>
            </div>
          </section>
        </div>
        </div>
      </div>
      <footer className="border-t border-[#272725] py-3 text-center text-xs text-[#76746F]">
        © {currentYear} Learnable. All rights reserved.
      </footer>
    </div>
  );
};

export default Settings;
