import { Topbar } from '@/components/Topbar';
import { Button } from '@/components/ui/button';

const Vision = () => {
  const currentYear = new Date().getFullYear();
  return (
    <div className="flex flex-col h-screen w-full bg-[#1C1C1C] overflow-hidden">
      <Topbar />
      <main className="flex-1 overflow-auto">
        <div className="max-w-5xl mx-auto px-6 pt-8 pb-6">
          <h1 className="text-[#E5E3DF] text-2xl font-semibold">Vision</h1>
          <p className="text-[#B5B2AC] text-sm mt-2 max-w-3xl">
            Learnable aims to be your intelligent, visual second brain — a place to explore ideas,
            ask questions, and grow a connected graph of knowledge that evolves with you. This page
            outlines the product direction, the learning philosophy behind concept cards and graphs,
            and upcoming areas we’re excited about.
          </p>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-[#2A2A28] bg-[#1C1C1C] p-4">
              <h2 className="text-[#E5E3DF] text-lg font-semibold">Connected Learning</h2>
              <p className="text-[#C5C1BA] text-sm mt-2">
                Cards capture concise concepts. Connections reveal patterns. Over time, your graph
                becomes a map of how you think and what you know — not just a list of notes.
              </p>
            </div>
            <div className="rounded-xl border border-[#2A2A28] bg-[#1C1C1C] p-4">
              <h2 className="text-[#E5E3DF] text-lg font-semibold">AI as a Study Partner</h2>
              <p className="text-[#C5C1BA] text-sm mt-2">
                The assistant helps you generate, refine, and connect ideas — but you stay in control.
                Edit suggestions, shape cards, and decide what belongs in your graph.
              </p>
            </div>
            <div className="rounded-xl border border-[#2A2A28] bg-[#1C1C1C] p-4">
              <h2 className="text-[#E5E3DF] text-lg font-semibold">Privacy by Default</h2>
              <p className="text-[#C5C1BA] text-sm mt-2">
                Your notes are yours. Opt in to sharing to collaborate or publish to Social when you
                want feedback or to showcase your learning journey.
              </p>
            </div>
            <div className="rounded-xl border border-[#2A2A28] bg-[#1C1C1C] p-4">
              <h2 className="text-[#E5E3DF] text-lg font-semibold">What’s Next</h2>
              <p className="text-[#C5C1BA] text-sm mt-2">
                Richer graph operations, spaced repetition from cards, collaborative graphs, and
                better imports from the tools you already use.
              </p>
            </div>
          </div>
        </div>
      </main>
      <footer className="relative border-t border-[#272725] py-3 text-center text-xs text-white/60">
        {/* Mobile (<= lg) stacked footer */}
        <div className="xl:hidden flex flex-col items-center gap-2">
          <div>© {currentYear} Learnable. All rights reserved.</div>
          <div className="flex items-center gap-3">
            <a href="/terms#terms" className="text-white/80 hover:text-white underline-offset-4 hover:underline">Terms</a>
            <a href="/terms#privacy" className="text-white/80 hover:text-white underline-offset-4 hover:underline">Privacy</a>
            <a href="/terms#cookies" className="text-white/80 hover:text-white underline-offset-4 hover:underline">Cookies</a>
          </div>
          {(() => { try { const u = localStorage.getItem('learnableUser'); return u && JSON.parse(u).is_admin; } catch { return false; } })() && (
            <Button className="h-7 px-3 bg-[#1E52F1] hover:bg-[#1E52F1]/90 text-white" onClick={() => (window.location.href = '/admin')}>
              Admin Panel
            </Button>
          )}
        </div>
        {/* Desktop footer */}
        <div className="hidden xl:block">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 space-x-3">
            <a href="/terms#terms" className="text-white/80 hover:text-white underline-offset-4 hover:underline">Terms</a>
            <a href="/terms#privacy" className="text-white/80 hover:text-white underline-offset-4 hover:underline">Privacy</a>
            <a href="/terms#cookies" className="text-white/80 hover:text-white underline-offset-4 hover:underline">Cookies</a>
          </div>
          {(() => { try { const u = localStorage.getItem('learnableUser'); return u && JSON.parse(u).is_admin; } catch { return false; } })() && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              <Button className="h-7 px-3 bg-[#1E52F1] hover:bg-[#1E52F1]/90 text-white" onClick={() => (window.location.href = '/admin')}>
                Admin Panel
              </Button>
            </div>
          )}
          © {currentYear} Learnable. All rights reserved.
        </div>
      </footer>
    </div>
  );
};

export default Vision;
