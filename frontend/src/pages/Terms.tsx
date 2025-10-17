import { Topbar } from '@/components/Topbar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const Terms = () => {
  const currentYear = new Date().getFullYear();
  const location = useLocation();
  const navigate = useNavigate();

  const hashToTab = (hash: string): 'terms' | 'privacy' | 'cookies' => {
    const h = (hash || '').replace('#', '').toLowerCase();
    if (h === 'privacy') return 'privacy';
    if (h === 'cookies' || h === 'cookie' || h === 'cookie-policy') return 'cookies';
    return 'terms';
  };

  const [tab, setTab] = useState<'terms' | 'privacy' | 'cookies'>(hashToTab(location.hash));

  useEffect(() => {
    // Sync when hash changes (e.g., navigation from other links)
    setTab(hashToTab(location.hash));
  }, [location.hash]);

  useEffect(() => {
    // Update hash when tab changes
    const hash = `#${tab}`;
    if (location.hash !== hash) {
      navigate(`/terms${hash}`, { replace: true });
    }
  }, [tab]);

  return (
    <div className="flex h-screen w-full flex-col bg-[#1C1C1C] text-white overflow-hidden">
      <Topbar />
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto w-full px-4 py-10">
          <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="mt-6">
            <TabsList className="bg-[#232323] text-white">
              <TabsTrigger value="terms" className="data-[state=active]:bg-[#1E52F1] data-[state=active]:text-white">Terms of Service</TabsTrigger>
              <TabsTrigger value="privacy" className="data-[state=active]:bg-[#1E52F1] data-[state=active]:text-white">Privacy Policy</TabsTrigger>
              <TabsTrigger value="cookies" className="data-[state=active]:bg-[#1E52F1] data-[state=active]:text-white">Cookie Policy</TabsTrigger>
            </TabsList>

            <TabsContent value="terms" className="prose prose-invert max-w-none">
              <p className="text-white/70 text-sm">This sample is for information only and not legal advice. Consult counsel to adapt for your use case and jurisdiction.</p>
              <div className="h-px bg-[#272725] my-4" />
              <h2>Terms of Service</h2>
              <ul>
                <li>These Terms govern your access to and use of Learnable (the "Service").</li>
                <li>By using the Service, you agree to be bound by these Terms.</li>
                <li>If you do not agree, do not use the Service.</li>
              </ul>
              <h3>Eligibility & Accounts</h3>
              <ul>
                <li>You must be capable of forming a binding contract and comply with all applicable laws.</li>
                <li>You are responsible for maintaining the confidentiality of your account credentials and for all activity under your account.</li>
                <li>Notify us promptly of suspected unauthorized access.</li>
              </ul>
              <h3>Acceptable Use</h3>
              <ul>
                <li>Do not use the Service to violate any law, infringe third‑party rights, or distribute malware, spam, or harmful content.</li>
                <li>No reverse engineering, scraping at scale, or attempting to circumvent security or rate limits.</li>
                <li>We may suspend or terminate accounts that breach these Terms.</li>
              </ul>
              <h3>AI & Content</h3>
              <ul>
                <li>Outputs may be inaccurate or incomplete; do not rely on outputs as professional advice.</li>
                <li>You retain ownership of your content. You grant us a limited license to host, process, and display it to operate and improve the Service.</li>
                <li>You are responsible for ensuring you have rights to content you submit.</li>
              </ul>
              <h3>Plans, Tokens, and Billing</h3>
              <ul>
                <li>Some features are usage‑metered via tokens. Token balances and limits may reset on a monthly cycle.</li>
                <li>Subscriptions auto‑renew unless canceled. Fees are billed in advance and are non‑refundable except where required by law.</li>
                <li>We may modify pricing or features with reasonable notice. Continued use after changes constitutes acceptance.</li>
              </ul>
              <h3>Disclaimers</h3>
              <ul>
                <li>THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE".</li>
                <li>No warranties of any kind—express, implied, or statutory (including merchantability, fitness for a particular purpose, non‑infringement).</li>
                <li>We do not warrant continuous, uninterrupted, or error‑free operation.</li>
              </ul>
              <h3>Limitation of Liability</h3>
              <ul>
                <li>No liability for indirect, incidental, special, consequential, exemplary, or punitive damages.</li>
                <li>No liability for lost profits, revenues, data, or goodwill.</li>
                <li>Aggregate liability cap: the amounts paid by you to us for the Service in the 12 months before the claim.</li>
              </ul>
              <h3>Indemnification</h3>
              <ul>
                <li>You will defend, indemnify, and hold harmless the company and its affiliates, officers, employees, and agents</li>
                <li>From claims, damages, liabilities, costs, and expenses</li>
                <li>Arising out of your use of the Service or breach of these Terms.</li>
              </ul>
              <h3>Governing Law & Disputes</h3>
              <ul>
                <li>Governing law: the laws of your principal place of business (or as otherwise specified by us).</li>
                <li>Venue: courts of that jurisdiction, unless mandatory arbitration or consumer protections apply.</li>
              </ul>
              <h3>Changes</h3>
              <ul>
                <li>We may update these Terms from time to time.</li>
                <li>Material changes will be announced with reasonable notice.</li>
                <li>Continued use after the effective date constitutes acceptance.</li>
              </ul>
            </TabsContent>

            <TabsContent value="privacy" className="prose prose-invert max-w-none">
              <p className="text-white/70 text-sm">This sample is for information only and not legal advice. Consult counsel to adapt for your use case and jurisdiction.</p>
              <div className="h-px bg-[#272725] my-4" />
              <h2>Privacy Policy</h2>
              <ul>
                <li>This Privacy Policy explains how we collect, use, and disclose information when you use the Service.</li>
                <li>It applies to information you provide and information we collect automatically when you use the Service.</li>
              </ul>
              <h3>Information We Collect</h3>
              <ul>
                <li>Account data (e.g., email, username), authentication data (including optional Google sign‑in), and usage data.</li>
                <li>Content you submit (e.g., notes, graphs), and technical data (device, browser, IP, cookies).</li>
              </ul>
              <h3>How We Use Information</h3>
              <ul>
                <li>Provide, maintain, and improve the Service, personalize features, and secure accounts.</li>
                <li>Communicate with you about updates, security, and support.</li>
                <li>Comply with legal obligations and enforce Terms.</li>
              </ul>
              <h3>Sharing</h3>
              <ul>
                <li>Service providers (e.g., hosting, analytics) under confidentiality obligations.</li>
                <li>Legal and compliance requirements, or in connection with corporate transactions.</li>
              </ul>
              <h3>Security & Retention</h3>
              <ul>
                <li>We implement safeguards appropriate to the nature and sensitivity of the data.</li>
                <li>No method of transmission or storage is 100% secure.</li>
                <li>We retain data only as long as necessary for the purposes described or as required by law.</li>
              </ul>
              <h3>Your Rights</h3>
              <ul>
                <li>Depending on your location, you may have rights to access, correct, delete, or export personal data.</li>
                <li>You may also have rights to object to or restrict certain processing.</li>
                <li>Contact us to exercise these rights.</li>
              </ul>
              <h3>Children</h3>
              <ul>
                <li>The Service is not directed to children under 13 (or the age of digital consent in your jurisdiction).</li>
                <li>If you believe we have collected such data, contact us and we will delete it.</li>
              </ul>
            </TabsContent>

            <TabsContent value="cookies" className="prose prose-invert max-w-none">
              <p className="text-white/70 text-sm">This sample is for information only and not legal advice. Consult counsel to adapt for your use case and jurisdiction.</p>
              <div className="h-px bg-[#272725] my-4" />
              <h2>Cookie Policy</h2>
              <ul>
                <li>We use cookies and similar technologies to operate the Service, enhance functionality, analyze usage, and for security.</li>
                <li>Cookies may be set by us or by third‑party providers that help deliver the Service.</li>
              </ul>
              <h3>Types of Cookies</h3>
              <ul>
                <li>Essential: required for core features (e.g., authentication, session state).</li>
                <li>Functional: preferences such as theme or UI settings.</li>
                <li>Analytics: usage metrics to improve performance and features.</li>
              </ul>
              <h3>Your Choices</h3>
              <ul>
                <li>You can manage cookies in your browser settings. Disabling certain cookies may affect functionality.</li>
                <li>You may adjust in‑product preferences where available.</li>
              </ul>
              <h3>Updates</h3>
              <ul>
                <li>We may update this Cookie Policy periodically.</li>
                <li>Material changes will be indicated by updating the “Last updated” date.</li>
              </ul>
            </TabsContent>
          </Tabs>
        </div>
      </div>
      <footer className="relative border-t border-[#272725] py-3 text-center text-xs text-white/60">
        <div className="absolute left-4 space-x-3">
          <a href="/terms#terms" className="text-white/80 hover:text-white underline-offset-4 hover:underline">Terms</a>
          <a href="/terms#privacy" className="text-white/80 hover:text-white underline-offset-4 hover:underline">Privacy</a>
          <a href="/terms#cookies" className="text-white/80 hover:text-white underline-offset-4 hover:underline">Cookies</a>
        </div>
        © {currentYear} Learnable. All rights reserved.
      </footer>
    </div>
  );
};

export default Terms;
