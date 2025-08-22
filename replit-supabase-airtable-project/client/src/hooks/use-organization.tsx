import { createContext, useContext, ReactNode, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "./use-auth";

interface Organization {
  id: string;
  name: string;
  plan: string;
  ownerId: string;
  createdAt: string;
}

interface Subscription {
  plan: string;
  status: string;
  periodEnd: string | null;
  metered: Record<string, any>;
}

interface Stats {
  members: number;
  operations: number;
  tables: number;
  apiKeys: number;
}

interface OrganizationContextType {
  currentOrganization: Organization | null;
  subscription: Subscription | null;
  stats: Stats | null;
  userRole: string | null;
  setCurrentOrganization: (orgId: string) => void;
  isLoading: boolean;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [currentOrgId, setCurrentOrgId] = useState<string | null>(null);

  // Set default organization when user is loaded
  useEffect(() => {
    if (user && user.organizations.length > 0 && !currentOrgId) {
      setCurrentOrgId(user.organizations[0].id);
    }
  }, [user, currentOrgId]);

  const { data: orgData, isLoading } = useQuery({
    queryKey: ["/api/organizations", currentOrgId],
    enabled: !!currentOrgId,
    retry: false,
  });

  const setCurrentOrganization = (orgId: string) => {
    setCurrentOrgId(orgId);
  };

  return (
    <OrganizationContext.Provider
      value={{
        currentOrganization: orgData?.organization || null,
        subscription: orgData?.subscription || null,
        stats: orgData?.stats || null,
        userRole: orgData?.userRole || null,
        setCurrentOrganization,
        isLoading,
      }}
    >
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error("useOrganization must be used within an OrganizationProvider");
  }
  return context;
}
