import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Key, Settings } from "lucide-react";
import InviteMemberModal from "@/components/modals/invite-member-modal";
import CreateApiKeyModal from "@/components/modals/create-api-key-modal";
import { useLocation } from "wouter";

export default function QuickActions() {
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [, setLocation] = useLocation();

  const actions = [
    {
      name: "Invite Team Member",
      icon: Plus,
      color: "blue",
      onClick: () => setShowInviteModal(true),
      testId: "quick-action-invite"
    },
    {
      name: "Generate API Key",
      icon: Key,
      color: "green",
      onClick: () => setShowApiKeyModal(true),
      testId: "quick-action-api-key"
    },
    {
      name: "Setup Integrations",
      icon: Settings,
      color: "purple",
      onClick: () => setLocation("/integrations"),
      testId: "quick-action-integrations"
    },
  ];

  const colorClasses = {
    blue: "hover:border-blue-200 hover:bg-blue-50 text-blue-600",
    green: "hover:border-green-200 hover:bg-green-50 text-green-600",
    purple: "hover:border-purple-200 hover:bg-purple-50 text-purple-600",
  };

  return (
    <>
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Quick Actions</h3>
        <div className="space-y-3">
          {actions.map((action) => (
            <Button
              key={action.name}
              variant="outline"
              className={`w-full justify-start p-3 border-slate-200 transition-colors ${colorClasses[action.color]}`}
              onClick={action.onClick}
              data-testid={action.testId}
            >
              <action.icon className="w-5 h-5 mr-3" />
              <span className="text-sm font-medium text-slate-900">{action.name}</span>
            </Button>
          ))}
        </div>
      </div>

      <InviteMemberModal
        open={showInviteModal}
        onOpenChange={setShowInviteModal}
      />

      <CreateApiKeyModal
        open={showApiKeyModal}
        onOpenChange={setShowApiKeyModal}
      />
    </>
  );
}
