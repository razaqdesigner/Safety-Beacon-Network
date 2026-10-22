import { Switch, Route, Router as WouterRouter } from "wouter";
import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getGetAdminMeQueryKey, setBaseUrl, useGetAdminMe } from "@workspace/api-client-react";
import NotFound from "@/pages/not-found";
import { AppLayout } from "./components/layout";
import Dashboard from "./pages/dashboard";
import Alerts from "./pages/alerts";
import AlertDetail from "./pages/alert-detail";
import Users from "./pages/users";
import UserDetail from "./pages/user-detail";
import Login from "./pages/login";

// Set base URL for API client
setBaseUrl("");

// Any 401 means the dispatcher session has ended: re-check it, which sends
// the dashboard back to the sign-in screen.
function onAuthError(err: unknown, queryKey?: readonly unknown[]) {
  const status = (err as { status?: unknown } | null)?.status;
  const meKey = getGetAdminMeQueryKey();
  if (status !== 401 || queryKey?.[0] === meKey[0]) return;
  void queryClient.resetQueries({ queryKey: meKey });
}

const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError: (err, query) => onAuthError(err, query.queryKey) }),
  mutationCache: new MutationCache({ onError: (err) => onAuthError(err) }),
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function Router() {
  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/alerts" component={Alerts} />
        <Route path="/alerts/:id" component={AlertDetail} />
        <Route path="/users" component={Users} />
        <Route path="/users/:id" component={UserDetail} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function AuthGate() {
  const { data: admin, isLoading } = useGetAdminMe({
    query: { queryKey: getGetAdminMeQueryKey(), retry: false, staleTime: Infinity },
  });

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!admin) return <Login />;
  return <Router />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AuthGate />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
