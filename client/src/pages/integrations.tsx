import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useOrganization } from "@/hooks/use-organization";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Database, CheckCircle, AlertCircle } from "lucide-react";

interface Settings {
  [key: string]: any;
}

interface AirtableTable {
  id: string;
  name: string;
  fields: string[];
}

export default function Integrations() {
  const { currentOrganization, userRole } = useOrganization();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [airtableApiKey, setAirtableApiKey] = useState("");
  const [airtableBaseId, setAirtableBaseId] = useState("");
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [testResults, setTestResults] = useState<{ tables: AirtableTable[] } | null>(null);

  const { data: settings, isLoading } = useQuery<Settings>({
    queryKey: ["/api/organizations", currentOrganization?.id, "settings"],
    enabled: !!currentOrganization,
    onSuccess: (data) => {
      setAirtableBaseId(data?.['airtable.baseId'] || '');
    },
  });

  const updateSettingMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: any }) => {
      await apiRequest("PUT", `/api/organizations/${currentOrganization?.id}/settings/${key}`, { value });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/organizations", currentOrganization?.id, "settings"] });
      toast({
        title: "Settings updated",
        description: "Integration settings have been saved successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update settings",
        variant: "destructive",
      });
    },
  });

  const testAirtableConnection = async () => {
    if (!airtableApiKey || !airtableBaseId) {
      toast({
        title: "Missing information",
        description: "Please provide both API key and Base ID",
        variant: "destructive",
      });
      return;
    }

    setIsTestingConnection(true);
    try {
      const res = await apiRequest("POST", `/api/organizations/${currentOrganization?.id}/airtable/test`, {
        apiKey: airtableApiKey,
        baseId: airtableBaseId,
      });
      const data = await res.json();
      setTestResults(data);
      
      toast({
        title: "Connection successful",
        description: `Found ${data.tables.length} tables in your Airtable base.`,
      });
    } catch (error: any) {
      toast({
        title: "Connection failed",
        description: error.message || "Failed to connect to Airtable",
        variant: "destructive",
      });
      setTestResults(null);
    } finally {
      setIsTestingConnection(false);
    }
  };

  const saveAirtableSettings = () => {
    if (airtableBaseId) {
      updateSettingMutation.mutate({ key: 'airtable.baseId', value: airtableBaseId });
    }
    if (airtableApiKey) {
      updateSettingMutation.mutate({ key: 'airtable.apiKey', value: airtableApiKey });
    }
  };

  const isConnected = settings?.['airtable.baseId'];
  const canManageSettings = userRole === 'admin';

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col">
        <header className="bg-white border-b border-slate-200 px-6 py-4">
          <div className="animate-pulse">
            <div className="h-8 bg-slate-200 rounded w-48 mb-2"></div>
            <div className="h-4 bg-slate-200 rounded w-64"></div>
          </div>
        </header>
        <main className="flex-1 p-6">
          <div className="animate-pulse space-y-6">
            <div className="h-48 bg-slate-200 rounded-xl"></div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900" data-testid="text-page-title">
              Integrations
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
                <li>Integrations</li>
              </ol>
            </nav>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 p-6 overflow-auto">
        <div className="max-w-4xl space-y-6">
          {/* Airtable Integration */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                    <Database className="w-6 h-6 text-orange-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Airtable</CardTitle>
                    <CardDescription>
                      Connect your Airtable base to sync data with your organization
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {isConnected ? (
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Connected
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="bg-slate-100 text-slate-800">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      Not Connected
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {canManageSettings ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="airtable-api-key">API Key</Label>
                      <Input
                        id="airtable-api-key"
                        type="password"
                        value={airtableApiKey}
                        onChange={(e) => setAirtableApiKey(e.target.value)}
                        placeholder="patXXXXXXXXXXXXXX.XXXXXXXXXXXXXX"
                        data-testid="input-airtable-api-key"
                      />
                      <p className="text-xs text-slate-500">
                        Get your API key from{" "}
                        <a 
                          href="https://airtable.com/developers/web/api/introduction" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-700"
                        >
                          Airtable Developer Hub
                        </a>
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="airtable-base-id">Base ID</Label>
                      <Input
                        id="airtable-base-id"
                        value={airtableBaseId}
                        onChange={(e) => setAirtableBaseId(e.target.value)}
                        placeholder="appXXXXXXXXXXXXXX"
                        data-testid="input-airtable-base-id"
                      />
                      <p className="text-xs text-slate-500">
                        Find your Base ID in the Airtable API documentation for your base
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <Button
                      onClick={testAirtableConnection}
                      disabled={isTestingConnection || !airtableApiKey || !airtableBaseId}
                      variant="outline"
                      data-testid="button-test-connection"
                    >
                      {isTestingConnection ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Testing...
                        </>
                      ) : (
                        "Test Connection"
                      )}
                    </Button>

                    <Button
                      onClick={saveAirtableSettings}
                      disabled={updateSettingMutation.isPending || !airtableBaseId}
                      className="bg-blue-600 text-white hover:bg-blue-700"
                      data-testid="button-save-settings"
                    >
                      {updateSettingMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        "Save Settings"
                      )}
                    </Button>
                  </div>

                  {testResults && (
                    <div className="border border-green-200 bg-green-50 rounded-lg p-4" data-testid="test-results">
                      <h4 className="font-medium text-green-900 mb-2">Connection Successful!</h4>
                      <p className="text-sm text-green-700 mb-3">
                        Found {testResults.tables.length} tables in your Airtable base:
                      </p>
                      <div className="space-y-2">
                        {testResults.tables.map((table) => (
                          <div 
                            key={table.id} 
                            className="bg-white rounded border border-green-200 p-3"
                            data-testid={`table-${table.id}`}
                          >
                            <h5 className="font-medium text-slate-900">{table.name}</h5>
                            <p className="text-sm text-slate-500">
                              Fields: {table.fields.join(', ')}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-8">
                  <AlertCircle className="mx-auto h-12 w-12 text-slate-400" />
                  <h3 className="mt-2 text-sm font-medium text-slate-900">Admin Access Required</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Only organization administrators can manage integrations.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Additional Integrations Placeholder */}
          <Card className="opacity-50">
            <CardHeader>
              <CardTitle className="text-lg">More Integrations Coming Soon</CardTitle>
              <CardDescription>
                We're working on additional integrations to help you connect your favorite tools.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {["Stripe", "Slack", "Google Sheets"].map((service) => (
                  <div 
                    key={service} 
                    className="border border-slate-200 rounded-lg p-4 text-center"
                  >
                    <div className="w-8 h-8 bg-slate-100 rounded-lg mx-auto mb-2"></div>
                    <h4 className="font-medium text-slate-600">{service}</h4>
                    <p className="text-sm text-slate-400">Coming Soon</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
