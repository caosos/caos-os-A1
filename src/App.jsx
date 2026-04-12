import { QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from "@/components/ui/toaster"
import { queryClientInstance } from '@/lib/query-client'
import NavigationTracker from '@/lib/NavigationTracker'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import Chat from './pages/Chat';
import Welcome from './pages/Welcome';
import Admin from './pages/Admin';
import SystemBlueprint from './pages/SystemBlueprint';
import TSBLog1 from './pages/TSBLog';
import TSBLog2 from './pages/TSBLog2';
import Console from './pages/Console';
import MemoryIsolation from './pages/MemoryIsolation';
// Note: Individual TSB-041, TSB-042, TSB-043, TSB-044 pages removed from routing.
// All TSBs consolidated into TSBLog1 (TSB-001–042) and TSBLog2 (TSB-043–048)

const LayoutWrapper = ({ children }) => <>{children}</>;
const mainPage = 'Chat';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route path="/" element={<Navigate to={`/${mainPage}`} replace />} />
      <Route path="/Chat" element={<LayoutWrapper><Chat /></LayoutWrapper>} />
      <Route path="/Welcome" element={<LayoutWrapper><Welcome /></LayoutWrapper>} />
      <Route path="/Admin" element={<LayoutWrapper><Admin /></LayoutWrapper>} />
      <Route path="/SystemBlueprint" element={<LayoutWrapper><SystemBlueprint /></LayoutWrapper>} />
      <Route path="/TSBLog" element={<LayoutWrapper><TSBLog1 /></LayoutWrapper>} />
      <Route path="/TSBLog2" element={<LayoutWrapper><TSBLog2 /></LayoutWrapper>} />
      <Route path="/Console" element={<LayoutWrapper><Console /></LayoutWrapper>} />
      <Route path="/MemoryIsolation" element={<LayoutWrapper><MemoryIsolation /></LayoutWrapper>} />
      {/* Individual TSB pages removed — all content in TSBLog1 + TSBLog2 */}
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <NavigationTracker />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App