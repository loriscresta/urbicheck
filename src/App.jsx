import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import ErrorBoundary from '@/components/ErrorBoundary';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import LandingPage from '@/pages/LandingPage';
import Dashboard from '@/pages/Dashboard';
import SearchPage from '@/pages/SearchPage';
import ReportPage from '@/pages/ReportPage';
import HistoryPage from '@/pages/HistoryPage';
import CreditsPage from '@/pages/CreditsPage';
import AppLayout from '@/components/layout/AppLayout';
import WaitlistPage from '@/pages/WaitlistPage';
import DevPanel from '@/pages/DevPanel';
import AdminPage from '@/pages/AdminPage';
import BatchResultsPage from '@/pages/BatchResultsPage.jsx';
import PeriziaPage from '@/pages/PeriziaPage.jsx';
import PrivacyPolicy from '@/pages/PrivacyPolicy';
import TerminiCondizioni from '@/pages/TerminiCondizioni';
import LegalPrivacy from '@/pages/LegalPrivacy';
import LegalTermini from '@/pages/LegalTermini';
import LegalCookie from '@/pages/LegalCookie';
import CookiePolicyPage from '@/pages/CookiePolicyPage';
import CookieBanner from '@/components/CookieBanner';

const LegalRoutes = (
  <>
    <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/termini-e-condizioni" element={<TerminiCondizioni />} />
          <Route path="/privacy" element={<LegalPrivacy />} />
          <Route path="/termini" element={<LegalTermini />} />
          <Route path="/cookie" element={<LegalCookie />} />
          <Route path="/cookie-policy" element={<CookiePolicyPage />} />
  </>
);

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, isAuthenticated, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-border border-t-primary rounded-full animate-spin"></div>
          <p className="text-sm text-muted-foreground">Caricamento...</p>
        </div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      return (
        <>
          <CookieBanner />
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/waitlist" element={<WaitlistPage />} />
            {LegalRoutes}
            <Route path="*" element={<LandingPage />} />
          </Routes>
        </>
      );
    }
  }

  if (!isAuthenticated) {
    return (
      <>
        <CookieBanner />
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/waitlist" element={<WaitlistPage />} />
          {LegalRoutes}
          <Route path="*" element={<LandingPage />} />
        </Routes>
      </>
    );
  }

  return (
    <>
      <CookieBanner />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/waitlist" element={<WaitlistPage />} />
        {LegalRoutes}
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<ErrorBoundary><Dashboard /></ErrorBoundary>} />
          <Route path="/search" element={<ErrorBoundary><SearchPage /></ErrorBoundary>} />
          <Route path="/report/:id" element={<ErrorBoundary><ReportPage /></ErrorBoundary>} />
          <Route path="/history" element={<ErrorBoundary><HistoryPage /></ErrorBoundary>} />
          <Route path="/credits" element={<ErrorBoundary><CreditsPage /></ErrorBoundary>} />
          <Route path="/dev" element={<ErrorBoundary><DevPanel /></ErrorBoundary>} />
          <Route path="/batch/:id" element={<ErrorBoundary><BatchResultsPage /></ErrorBoundary>} />
          <Route path="/perizia" element={<ErrorBoundary><PeriziaPage /></ErrorBoundary>} />
          <Route path="/admin" element={<ErrorBoundary><AdminPage /></ErrorBoundary>} />
        </Route>
        <Route path="*" element={<PageNotFound />} />
      </Routes>
    </>
  );
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <QueryClientProvider client={queryClientInstance}>
          <AuthenticatedApp />
          <Toaster />
        </QueryClientProvider>
      </AuthProvider>
    </Router>
  )
}

export default App