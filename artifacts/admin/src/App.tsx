import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { setBaseUrl } from "@workspace/api-client-react";
import NotFound from "@/pages/not-found";
import { AppLayout } from "./components/layout";
import Dashboard from "./pages/dashboard";
import Alerts from "./pages/alerts";
import AlertDetail from "./pages/alert-detail";
import Users from "./pages/users";
import UserDetail from "./pages/user-detail";

// Set base URL for API client
setBaseUrl("");

const queryClient = new QueryClient({
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

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
