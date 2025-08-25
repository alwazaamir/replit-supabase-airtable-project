import { useAuth } from "@/hooks/use-auth";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  organizations: Array<{
    id: string;
    name: string;
    plan: string;
    role: string;
  }>;
}

export function useCurrentUser(): AuthUser | null {
  const { user } = useAuth();
  return user;
}

export function requireAuth() {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return { user: null, isLoading: true, isAuthenticated: false };
  }
  
  return {
    user,
    isLoading: false,
    isAuthenticated: !!user,
  };
}

export function hasPermission(requiredRole: 'admin' | 'editor' | 'viewer', userRole?: string): boolean {
  if (!userRole) return false;
  
  const roleHierarchy = {
    'admin': 3,
    'editor': 2, 
    'viewer': 1,
  };
  
  return roleHierarchy[userRole as keyof typeof roleHierarchy] >= roleHierarchy[requiredRole];
}

export function canManageOrganization(userRole?: string): boolean {
  return hasPermission('admin', userRole);
}

export function canEditContent(userRole?: string): boolean {
  return hasPermission('editor', userRole);
}

export function canViewContent(userRole?: string): boolean {
  return hasPermission('viewer', userRole);
}
