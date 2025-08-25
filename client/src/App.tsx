import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import { OrganizationProvider } from "@/hooks/use-organization";
import Login from "@/pages/login";
import Signup from "@/pages/signup";
import Dashboard from "@/pages/dashboard";
import Members from "@/pages/members";
import ApiKeys from "@/pages/api-keys";
import Integrations from "@/pages/integrations";
import Billing from "@/pages/billing";
import AuditLogs from "@/pages/audit-logs";
import Pipelines from "@/pages/pipelines";
import PipelineDetail from "@/pages/pipeline-detail";
import LeadDetail from "@/pages/lead-detail";
import NotFound from "@/pages/not-found";
import AppShell from "@/components/layout/app-shell";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Login} />
      <Route path="/login" component={Login} />
      <Route path="/signup" component={Signup} />
      <Route path="/dashboard" component={() => (
        <AppShell>
          <Dashboard />
        </AppShell>
      )} />
      <Route path="/members" component={() => (
        <AppShell>
          <Members />
        </AppShell>
      )} />
      <Route path="/api-keys" component={() => (
        <AppShell>
          <ApiKeys />
        </AppShell>
      )} />
      <Route path="/integrations" component={() => (
        <AppShell>
          <Integrations />
        </AppShell>
      )} />
      <Route path="/billing" component={() => (
        <AppShell>
          <Billing />
        </AppShell>
      )} />
      <Route path="/audit-logs" component={() => (
        <AppShell>
          <AuditLogs />
        </AppShell>
      )} />
      <Route path="/pipelines" component={() => (
        <AppShell>
          <Pipelines />
        </AppShell>
      )} />
      <Route path="/pipelines/:id" component={() => (
        <AppShell>
          <PipelineDetail />
        </AppShell>
      )} />
      <Route path="/leads/:id" component={() => (
        <AppShell>
          <LeadDetail />
        </AppShell>
      )} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <OrganizationProvider>
            <Toaster />
            <Router />
          </OrganizationProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
