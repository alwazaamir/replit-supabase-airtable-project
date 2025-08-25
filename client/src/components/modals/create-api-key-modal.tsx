import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useOrganization } from "@/hooks/use-organization";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy } from "lucide-react";

interface CreateApiKeyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CreateApiKeyModal({ open, onOpenChange }: CreateApiKeyModalProps) {
  const { currentOrganization } = useOrganization();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [createdKey, setCreatedKey] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: async (data: { name: string }) => {
      const res = await apiRequest("POST", `/api/organizations/${currentOrganization?.id}/api-keys`, data);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/organizations", currentOrganization?.id, "api-keys"] });
      queryClient.invalidateQueries({ queryKey: ["/api/organizations", currentOrganization?.id] });
      setCreatedKey(data.keyValue);
      toast({
        title: "API key created",
        description: "Your new API key has been generated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create API key",
        description: error.message || "An error occurred while creating the API key",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({ name });
  };

  const handleClose = () => {
    onOpenChange(false);
    setName("");
    setCreatedKey(null);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to clipboard",
      description: "The API key has been copied to your clipboard.",
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle data-testid="modal-title-api-key">
            {createdKey ? "API Key Created" : "Create API Key"}
          </DialogTitle>
          <DialogDescription>
            {createdKey
              ? "Copy this API key now. You won't be able to see it again."
              : "Generate a new API key for your organization"}
          </DialogDescription>
        </DialogHeader>

        {createdKey ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Your new API key</Label>
              <div className="flex items-center space-x-2">
                <code className="flex-1 px-3 py-2 bg-slate-100 text-slate-700 text-sm font-mono rounded border">
                  {createdKey}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(createdKey)}
                  data-testid="button-copy-new-key"
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-amber-600">
                ⚠️ This key will only be shown once. Make sure to copy it now.
              </p>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleClose} data-testid="button-close-api-key-modal">
                Done
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="api-key-name">API Key Name</Label>
              <Input
                id="api-key-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Production API, Development API, etc."
                required
                data-testid="input-api-key-name"
              />
            </div>
            <div className="flex justify-end space-x-3">
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleClose}
                data-testid="button-cancel-api-key"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-blue-600 text-white hover:bg-blue-700"
                disabled={createMutation.isPending}
                data-testid="button-create-api-key-submit"
              >
                {createMutation.isPending ? "Creating..." : "Create API Key"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
