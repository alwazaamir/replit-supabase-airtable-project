import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useOrganization } from "@/hooks/use-organization";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Copy, Key, Trash2 } from "lucide-react";
import CreateApiKeyModal from "@/components/modals/create-api-key-modal";

interface ApiKey {
  id: string;
  name: string;
  keyPreview: string;
  lastUsedAt: string | null;
  createdAt: string;
}

export default function ApiKeys() {
  const { currentOrganization, userRole } = useOrganization();
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
      queryClient.invalidateQueries({ queryKey: ["/api/organizations", currentOrganization?.id] });
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

  const getStatusBadge = (lastUsedAt: string | null) => {
    if (!lastUsedAt) {
      return <Badge variant="secondary" className="bg-orange-100 text-orange-800">Unused</Badge>;
    }
    
    const date = new Date(lastUsedAt);
    const now = new Date();
    const diffHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffHours < 24) {
      return <Badge variant="secondary" className="bg-green-100 text-green-800">Active</Badge>;
    } else {
      return <Badge variant="secondary" className="bg-orange-100 text-orange-800">Inactive</Badge>;
    }
  };

  const canManageKeys = userRole === 'admin' || userRole === 'editor';

  return (
    <>
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900" data-testid="text-page-title">
                API Keys
              </h1>
              <nav className="flex mt-1" aria-label="Breadcrumb">
                <ol className="flex items-center space-x-2 text-sm text-slate-500">
                  <li data-testid="text-breadcrumb-org">
                    {currentOrganization?.name}
                  </li>
                  <li>
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"></path>
                    </svg>
                  </li>
                  <li>API Keys</li>
                </ol>
              </nav>
            </div>
            {canManageKeys && (
              <Button
                className="bg-blue-600 text-white hover:bg-blue-700"
                onClick={() => setShowCreateModal(true)}
                data-testid="button-create-api-key"
              >
                <Key className="w-4 h-4 mr-2" />
                Create Key
              </Button>
            )}
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-6 overflow-auto">
          <div className="bg-white rounded-xl border border-slate-200">
            <div className="p-6 border-b border-slate-200">
              <p className="text-sm text-slate-500">
                API keys are used to authenticate requests to your organization's API endpoints.
                Keep your keys secure and never share them publicly.
              </p>
            </div>

            {isLoading ? (
              <div className="p-6">
                <div className="animate-pulse space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center space-x-4 p-4 border border-slate-200 rounded-lg">
                      <div className="w-2 h-2 bg-slate-200 rounded-full"></div>
                      <div className="flex-1">
                        <div className="h-4 bg-slate-200 rounded w-32 mb-2"></div>
                        <div className="h-3 bg-slate-200 rounded w-48"></div>
                      </div>
                      <div className="w-40 h-6 bg-slate-200 rounded"></div>
                    </div>
                  ))}
                </div>
              </div>
            ) : !apiKeys || apiKeys.length === 0 ? (
              <div className="text-center py-12">
                <Key className="mx-auto h-12 w-12 text-slate-400" />
                <h3 className="mt-2 text-sm font-medium text-slate-900">No API keys</h3>
                <p className="mt-1 text-sm text-slate-500" data-testid="text-no-api-keys">
                  Get started by creating your first API key.
                </p>
                {canManageKeys && (
                  <div className="mt-6">
                    <Button
                      className="bg-blue-600 text-white hover:bg-blue-700"
                      onClick={() => setShowCreateModal(true)}
                    >
                      <Key className="w-4 h-4 mr-2" />
                      Create API Key
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Key</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Used</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {apiKeys.map((apiKey) => (
                    <TableRow key={apiKey.id} data-testid={`api-key-row-${apiKey.id}`}>
                      <TableCell>
                        <div className="font-medium text-slate-900" data-testid={`api-key-name-${apiKey.id}`}>
                          {apiKey.name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <code className="px-2 py-1 bg-slate-100 text-slate-700 text-sm font-mono rounded">
                            {apiKey.keyPreview}
                          </code>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-slate-400 hover:text-slate-600"
                            onClick={() => copyToClipboard(apiKey.keyPreview)}
                            data-testid={`copy-api-key-${apiKey.id}`}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(apiKey.lastUsedAt)}
                      </TableCell>
                      <TableCell className="text-slate-500">
                        {formatTimeAgo(apiKey.lastUsedAt)}
                      </TableCell>
                      <TableCell className="text-slate-500">
                        {formatTimeAgo(apiKey.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        {canManageKeys && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-slate-400 hover:text-red-600"
                                data-testid={`delete-api-key-${apiKey.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete API Key</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{apiKey.name}"? This action cannot be undone
                                  and will immediately revoke access for any applications using this key.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteMutation.mutate(apiKey.id)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Delete Key
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </main>
      </div>

      <CreateApiKeyModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
      />
    </>
  );
}
