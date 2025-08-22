import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useOrganization } from "@/hooks/use-organization";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Copy, Trash2 } from "lucide-react";
import CreateApiKeyModal from "@/components/modals/create-api-key-modal";

interface ApiKey {
  id: string;
  name: string;
  keyPreview: string;
  lastUsedAt: string | null;
  createdAt: string;
}

export default function ApiKeysSection() {
  const { currentOrganization } = useOrganization();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { data: apiKeys, isLoading } = useQuery<ApiKey[]>({
    queryKey: ["/api/organizations", currentOrganization?.id, "api-keys"],
    enabled: !!currentOrganization,
  });

  const deleteMutation = useMutation({
    mutationFn: async (keyId: string) => {
      await apiRequest("DELETE", `/api/organizations/${currentOrganization?.id}/api-keys/${keyId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/organizations", currentOrganization?.id, "api-keys"] });
      toast({
        title: "API key deleted",
        description: "The API key has been successfully deleted.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete API key",
        variant: "destructive",
      });
    },
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to clipboard",
      description: "The API key has been copied to your clipboard.",
    });
  };

  const formatTimeAgo = (dateString: string | null) => {
    if (!dateString) return 'Never';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    return `${diffDays} days ago`;
  };

  const getStatusColor = (lastUsedAt: string | null) => {
    if (!lastUsedAt) return 'bg-orange-400';
    
    const date = new Date(lastUsedAt);
    const now = new Date();
    const diffHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    return diffHours < 24 ? 'bg-green-400' : 'bg-orange-400';
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">API Keys</h3>
              <p className="text-sm text-slate-500 mt-1">Manage your organization's API access keys</p>
            </div>
            <Button disabled>Create Key</Button>
          </div>
        </div>
        <div className="p-6 space-y-4">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="animate-pulse flex items-center justify-between p-4 border border-slate-200 rounded-lg">
              <div className="flex-1">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-slate-200 rounded-full"></div>
                  <div>
                    <div className="h-4 bg-slate-200 rounded w-32 mb-1"></div>
                    <div className="h-3 bg-slate-200 rounded w-48"></div>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="h-6 bg-slate-200 rounded w-40"></div>
                <div className="w-8 h-6 bg-slate-200 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">API Keys</h3>
              <p className="text-sm text-slate-500 mt-1">Manage your organization's API access keys</p>
            </div>
            <Button
              className="bg-blue-600 text-white hover:bg-blue-700"
              onClick={() => setShowCreateModal(true)}
              data-testid="button-create-api-key"
            >
              Create Key
            </Button>
          </div>
        </div>
        <div className="p-6">
          {!apiKeys || apiKeys.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-slate-500" data-testid="text-no-api-keys">
                No API keys created yet
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setShowCreateModal(true)}
              >
                Create your first API key
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {apiKeys.map((apiKey) => (
                <div
                  key={apiKey.id}
                  className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:border-slate-300"
                  data-testid={`api-key-${apiKey.id}`}
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <div className={`w-2 h-2 rounded-full ${getStatusColor(apiKey.lastUsedAt)}`}></div>
                      <div>
                        <h4 className="text-sm font-medium text-slate-900" data-testid={`api-key-name-${apiKey.id}`}>
                          {apiKey.name}
                        </h4>
                        <p className="text-xs text-slate-500" data-testid={`api-key-created-${apiKey.id}`}>
                          Created {formatTimeAgo(apiKey.createdAt)} • Last used {formatTimeAgo(apiKey.lastUsedAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <code className="px-3 py-1 bg-slate-100 text-slate-700 text-xs font-mono rounded">
                      {apiKey.keyPreview}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-slate-400 hover:text-slate-600 p-1"
                      onClick={() => copyToClipboard(apiKey.keyPreview)}
                      data-testid={`copy-api-key-${apiKey.id}`}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-slate-400 hover:text-red-600 p-1"
                      onClick={() => deleteMutation.mutate(apiKey.id)}
                      disabled={deleteMutation.isPending}
                      data-testid={`delete-api-key-${apiKey.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <CreateApiKeyModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
      />
    </>
  );
}
