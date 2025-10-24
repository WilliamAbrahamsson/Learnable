import { RefObject, useMemo, useState } from 'react';
import { ZoomIn, ZoomOut, Plus, Type, Image as ImageIcon, Sparkles, Share, X, Loader2 } from 'lucide-react';
import axios from 'axios';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

type CanvasToolbarProps = {
  rightOffsetPercent?: number;
  isMenuOpen: boolean;
  menuRef: RefObject<HTMLDivElement>;
  onToggleMenu: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onAddText: () => void;
  onAddImage: () => void;
  graphId?: number;
};

export const CanvasToolbar = ({
  rightOffsetPercent = 0,
  isMenuOpen,
  menuRef,
  onToggleMenu,
  onZoomIn,
  onZoomOut,
  onAddText,
  onAddImage,
  graphId,
}: CanvasToolbarProps) => {
  const { toast } = useToast();
  const [shareOpen, setShareOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [invitees, setInvitees] = useState<string[]>([]);
  const [analyzing, setAnalyzing] = useState(false);

  const demoContacts = useMemo(
    () => [
      'alice@example.com',
      'bob@example.com',
      'carol@university.edu',
      'dave@learnable.ai',
      'eve@research.lab',
      'mallory@security.org',
    ],
    []
  );

  const suggestions = useMemo(
    () =>
      demoContacts.filter(
        (e) => query && e.toLowerCase().includes(query.toLowerCase()) && !invitees.includes(e)
      ),
    [demoContacts, query, invitees]
  );

  const isValidEmail = (v: string) => /.+@.+\..+/.test(v);
  const addInvitee = (email: string) => {
    const e = email.trim();
    if (!isValidEmail(e)) return;
    if (!invitees.includes(e)) setInvitees((prev) => [...prev, e]);
    setQuery('');
  };
  const removeInvitee = (email: string) =>
    setInvitees((prev) => prev.filter((x) => x !== email));
  const handleShare = () => setShareOpen(true);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast({ description: 'Link copied to clipboard.' });
    } catch {}
  };

  const sendInvites = () => {
    if (invitees.length === 0) return;
    toast({ description: `Invites sent to ${invitees.join(', ')} (demo).` });
    setShareOpen(false);
    setInvitees([]);
    setQuery('');
  };

  const compact = rightOffsetPercent >= 55;

  // ----------------------------
  // 🧠 AI Relationship Check (with live update)
  // ----------------------------
  const handleAnalyzeRelationships = async () => {
    if (!graphId) {
      toast({ variant: 'destructive', description: 'No active graph selected.' });
      return;
    }
    if (analyzing) return;

    setAnalyzing(true);
    try {
      const res = await axios.post('http://127.0.0.1:5000/api/chat/analyze-graph', {
        graph_id: graphId,
      });

      toast({
        description: `AI analyzed ${res.data.updated} connections for graph ${res.data.graph_id}.`,
      });

      // ✅ Dispatch event to refresh canvas connection colors
      window.dispatchEvent(
        new CustomEvent('learnable-graph-analyzed', {
          detail: { graphId },
        })
      );
    } catch (err: any) {
      console.error(err);
      toast({
        variant: 'destructive',
        description:
          err?.response?.data?.error ||
          'Failed to analyze relationships. Please try again.',
      });
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <>
      {/* Top-left vertical zoom bar */}
      <div className="pointer-events-none absolute top-6 left-6 z-10">
        <div className="pointer-events-auto flex flex-col gap-2 rounded-lg border border-[#3F3F3D] bg-[#1C1C1C]/95 p-1 shadow-lg backdrop-blur">
          <button
            type="button"
            onClick={onZoomIn}
            className="flex h-10 w-10 items-center justify-center rounded-md text-[#C5C1BA] transition hover:bg-[#33332F]"
            aria-label="Zoom in"
          >
            <ZoomIn className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={onZoomOut}
            className="flex h-10 w-10 items-center justify-center rounded-md text-[#C5C1BA] transition hover:bg-[#33332F]"
            aria-label="Zoom out"
          >
            <ZoomOut className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="absolute bottom-0 left-0 z-10" style={{ right: `${rightOffsetPercent}%` }}>
        <div className="relative h-12 bg-[#1C1C1C] flex items-center justify-center gap-2 px-0">
          <button
            type="button"
            onClick={onToggleMenu}
            className="rounded-lg bg-[#1E52F1] px-3 py-1.5 text-sm text-white transition hover:bg-[#1E52F1]/90"
            aria-expanded={isMenuOpen}
            aria-label="Add card"
          >
            <span className="inline-flex items-center gap-1.5">
              <Plus className="h-4 w-4" />
              Add Card
            </span>
          </button>

          {/* AI Relationship Strength Check */}
          <TooltipProvider>
            {!compact && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={handleAnalyzeRelationships}
                    disabled={analyzing}
                    className="rounded-lg bg-gradient-to-r from-[#F59E0B] to-[#F97316] hover:from-[#D97706] hover:to-[#EA580C] px-3 py-1.5 text-sm text-white shadow flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {analyzing ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        AI Relationship Strength Check
                      </>
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent className="bg-[#1C1C1C] text-[#C5C1BA] border border-[#272725] max-w-xs">
                  The color of the relationships will update automatically (red → orange → green)
                </TooltipContent>
              </Tooltip>
            )}
          </TooltipProvider>

          {/* Share button */}
          {!compact && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={handleShare}
                    className="rounded-lg bg-[#2A2A28] hover:bg-[#33332F] px-3 py-1.5 text-sm text-[#C5C1BA] shadow"
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <Share className="h-4 w-4" />
                      Share Learning Graph
                    </span>
                  </button>
                </TooltipTrigger>
                <TooltipContent className="bg-[#1C1C1C] text-[#C5C1BA] border border-[#272725] max-w-xs">
                  Shares your Learning Graph only. Chat is private and not included.
                </TooltipContent>
              </Tooltip>
            </div>
          )}

          {/* Add Card menu */}
          {isMenuOpen && (
            <div
              ref={menuRef}
              className="absolute bottom-14 left-1/2 -translate-x-1/2 w-48 rounded-lg border border-[#3F3F3D] bg-[#1C1C1C]/95 p-2 shadow-xl backdrop-blur"
            >
              <button
                type="button"
                onClick={onAddText}
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-[#C5C1BA] transition hover:bg-[#33332F]"
              >
                <Type className="h-4 w-4" />
                Text Card
              </button>
              <button
                type="button"
                onClick={onAddImage}
                className="mt-1 flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-[#C5C1BA] transition hover:bg-[#33332F]"
              >
                <ImageIcon className="h-4 w-4" />
                Image Card
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Share dialog */}
      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="max-w-md bg-[#1C1C1C] text-[#C5C1BA] border border-[#272725]">
          <DialogHeader>
            <DialogTitle className="text-[#E5E3DF]">Share Learning Graph</DialogTitle>
            <DialogDescription className="text-[#76746F]">
              Invite collaborators by email. They will receive a demo invite link.
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
              <Button
                disabled={!isValidEmail(query)}
                onClick={() => addInvitee(query)}
                className="bg-[#1E52F1] hover:bg-[#1E52F1]/90"
              >
                Add
              </Button>
            </div>
            {suggestions.length > 0 && (
              <div className="text-xs">
                <div className="mb-1 text-[#76746F]">Suggestions</div>
                <div className="flex flex-wrap gap-2">
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => addInvitee(s)}
                      className="px-2 py-1 rounded border border-[#2A2A28] hover:bg-[#272725]"
                    >
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
                    <span
                      key={e}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded bg-[#272725] text-[#C5C1BA]"
                    >
                      {e}
                      <button
                        type="button"
                        onClick={() => removeInvitee(e)}
                        className="text-[#B5B2AC] hover:text-white"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="flex items-center justify-between">
            <Button
              variant="ghost"
              className="text-[#C5C1BA] hover:text-white hover:bg-[#272725]"
              onClick={copyLink}
            >
              Copy link
            </Button>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                className="text-[#C5C1BA] hover:text-white hover:bg-[#272725]"
                onClick={() => setShareOpen(false)}
              >
                Close
              </Button>
              <Button
                disabled={invitees.length === 0}
                className="bg-[#1E52F1] hover:bg-[#1E52F1]/90"
                onClick={sendInvites}
              >
                Send Invites
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
