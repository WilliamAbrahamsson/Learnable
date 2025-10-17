import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const preventNav = (e: React.MouseEvent<HTMLAnchorElement>) => {
  e.preventDefault();
};

export const CookieConsent = () => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('learnable:cookieConsent');
      // Treat 'true', 'accepted', or 'rejected' as dismissed
      const dismissed = stored === 'true' || stored === 'accepted' || stored === 'rejected';
      setOpen(!dismissed);
    } catch {
      setOpen(true);
    }
  }, []);

  const acceptAll = () => {
    try {
      // store a boolean to indicate the banner was handled
      localStorage.setItem('learnable:cookieConsent', 'true');
      localStorage.setItem('learnable:cookieConsentChoice', 'accepted');
    } catch {}
    setOpen(false);
  };

  const rejectAll = () => {
    try {
      // store a boolean to indicate the banner was handled
      localStorage.setItem('learnable:cookieConsent', 'true');
      localStorage.setItem('learnable:cookieConsentChoice', 'rejected');
    } catch {}
    setOpen(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 pointer-events-none">
      <div className="max-w-4xl mx-auto mb-4 px-4 pointer-events-auto">
        <div className="rounded-lg border border-[#272725] bg-[#1C1C1C] text-white shadow-lg">
          <div className="p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div className="flex-1">
                <div className="text-base font-semibold">We use cookies</div>
                <p className="mt-1 text-sm text-white/70">
                  We use cookies and similar technologies to enhance your experience, analyze usage, and improve our services. See our{' '}
                  <Link to="/terms#privacy" className="text-[#1E52F1] hover:underline">Privacy Policy</Link>,{' '}
                  <Link to="/terms#cookies" className="text-[#1E52F1] hover:underline">Cookie Policy</Link>, and{' '}
                  <Link to="/terms#terms" className="text-[#1E52F1] hover:underline">Terms</Link>.
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button
                  variant="ghost"
                  className="text-white hover:text-white hover:bg-[#272725]"
                  onClick={rejectAll}
                >
                  Decline
                </Button>
                <Button className="bg-[#1E52F1] hover:bg-[#1E52F1]/90" onClick={acceptAll}>
                  Accept all
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CookieConsent;
