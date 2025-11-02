import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import Settings from "./pages/Settings";
import Terms from "./pages/Terms";
import Sub from "./pages/Sub";
import SubAlias from "./pages/Sub";
import MyCanvases from "./pages/MyCanvases";
import NotFound from "./pages/NotFound";
import Vision from "./pages/Vision";
import CookieConsent from "@/components/CookieConsent";
import Admin from "./pages/Admin";

const queryClient = new QueryClient();

// Route wrapper: if a user is signed in, redirect "/" to "/my-canvases".
const HomeRoute = () => {
  let authed = false;
  try {
    authed = !!localStorage.getItem("learnableToken");
  } catch {}
  return authed ? <Navigate to="/my-canvases" replace /> : <Index />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <CookieConsent />
        <Routes>
          <Route path="/" element={<HomeRoute />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/sub" element={<Sub />} />
          <Route path="/subs" element={<SubAlias />} />
          <Route path="/my-canvases" element={<MyCanvases />} />
          <Route path="/my-canvases/:canvasId" element={<Index />} />
          <Route path="/vision" element={<Vision />} />
          <Route path="/admin" element={<Admin />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
