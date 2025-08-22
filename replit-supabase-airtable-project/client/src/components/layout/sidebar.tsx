import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useOrganization } from "@/hooks/use-organization";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ChevronDown, LayoutDashboard, Users, Key, Settings, CreditCard, FileText, LogOut, Plus, Network } from "lucide-react";
import CreateOrganizationModal from "@/components/modals/create-organization-modal";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Pipelines", href: "/pipelines", icon: Network },
  { name: "Members", href: "/members", icon: Users },
  { name: "API Keys", href: "/api-keys", icon: Key },
  { name: "Integrations", href: "/integrations", icon: Settings },
  { name: "Billing", href: "/billing", icon: CreditCard },
  { name: "Audit Logs", href: "/audit-logs", icon: FileText },
];

export default function Sidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const { currentOrganization, setCurrentOrganization } = useOrganization();
  const [showOrgSwitcher, setShowOrgSwitcher] = useState(false);
  const [showCreateOrgModal, setShowCreateOrgModal] = useState(false);

  if (!user || !currentOrganization) return null;

  const handleOrgSwitch = (orgId: string) => {
    setCurrentOrganization(orgId);
    setShowOrgSwitcher(false);
  };

  const getUserInitials = (name: string) => {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <>
      <div className="w-64 bg-white border-r border-slate-200 flex flex-col">
        {/* Organization Switcher */}
        <div className="p-4 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-semibold text-slate-900 truncate" data-testid="text-org-name">
                {currentOrganization.name}
              </h2>
              <p className="text-xs text-slate-500 capitalize" data-testid="text-org-plan">
                {currentOrganization.plan} Plan
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-slate-400 hover:text-slate-600 p-1"
              onClick={() => setShowOrgSwitcher(!showOrgSwitcher)}
              data-testid="button-org-switcher"
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
          </div>
          
          {showOrgSwitcher && (
            <div className="mt-2 bg-slate-50 rounded-lg p-2 border border-slate-200">
              <div className="text-xs text-slate-500 mb-2">Switch Organization</div>
              <div className="space-y-1">
                {user.organizations.map((org) => (
                  <div
                    key={org.id}
                    className={`flex items-center justify-between py-1 px-2 rounded cursor-pointer hover:bg-white ${
                      org.id === currentOrganization.id ? 'bg-white' : ''
                    }`}
                    onClick={() => handleOrgSwitch(org.id)}
                    data-testid={`org-option-${org.id}`}
                  >
                    <span className="text-sm font-medium">{org.name}</span>
                    <span className="text-xs text-slate-400 capitalize">{org.plan}</span>
                  </div>
                ))}
              </div>
              <Separator className="my-2" />
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-blue-600 hover:text-blue-700 text-sm p-2"
                onClick={() => {
                  setShowCreateOrgModal(true);
                  setShowOrgSwitcher(false);
                }}
                data-testid="button-create-org"
              >
                <Plus className="h-4 w-4 mr-1" />
                New Organization
              </Button>
            </div>
          )}
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {navigation.map((item) => {
              const isActive = location === item.href;
              return (
                <li key={item.name}>
                  <Link href={item.href}>
                    <div
                      className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg cursor-pointer ${
                        isActive
                          ? 'text-slate-900 bg-slate-100'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                      data-testid={`nav-${item.href.replace('/', '')}`}
                    >
                      <item.icon className="h-5 w-5 mr-3" />
                      {item.name}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User Menu */}
        <div className="p-4 border-t border-slate-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium" data-testid="text-user-initials">
                  {getUserInitials(user.name)}
                </span>
              </div>
            </div>
            <div className="ml-3 flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate" data-testid="text-user-name">
                {user.name}
              </p>
              <p className="text-xs text-slate-500 truncate" data-testid="text-user-email">
                {user.email}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="ml-2 text-slate-400 hover:text-slate-600 p-1"
              onClick={logout}
              data-testid="button-logout"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <CreateOrganizationModal
        open={showCreateOrgModal}
        onOpenChange={setShowCreateOrgModal}
      />
    </>
  );
}
