import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'wouter';
import { Plus, Network, Users, Calendar, MoreVertical, Trash2, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useOrganization } from '@/hooks/use-organization';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiRequest } from '@/lib/queryClient';

const createPipelineSchema = z.object({
  name: z.string().min(1, 'Pipeline name is required').max(100, 'Name too long'),
});

type CreatePipelineData = z.infer<typeof createPipelineSchema>;

export default function PipelinesPage() {
  const { currentOrganization, subscription } = useOrganization();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const { data: pipelines, isLoading } = useQuery({
    queryKey: ['/api/organizations', currentOrganization?.id, 'pipelines'],
    enabled: !!currentOrganization,
  });

  const { data: stats } = useQuery({
    queryKey: ['/api/organizations', currentOrganization?.id],
    enabled: !!currentOrganization,
  });

  const createPipeline = useMutation({
    mutationFn: (data: CreatePipelineData) =>
      apiRequest('POST', `/api/organizations/${currentOrganization?.id}/pipelines`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/organizations', currentOrganization?.id, 'pipelines'] });
      queryClient.invalidateQueries({ queryKey: ['/api/organizations', currentOrganization?.id] });
      setShowCreateDialog(false);
      toast({ title: 'Pipeline created successfully' });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to create pipeline',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deletePipeline = useMutation({
    mutationFn: (pipelineId: string) =>
      apiRequest('DELETE', `/api/organizations/${currentOrganization?.id}/pipelines/${pipelineId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/organizations', currentOrganization?.id, 'pipelines'] });
      queryClient.invalidateQueries({ queryKey: ['/api/organizations', currentOrganization?.id] });
      toast({ title: 'Pipeline deleted successfully' });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to delete pipeline',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const form = useForm<CreatePipelineData>({
    resolver: zodResolver(createPipelineSchema),
    defaultValues: { name: '' },
  });

  const onSubmit = (data: CreatePipelineData) => {
    createPipeline.mutate(data);
  };

  if (!currentOrganization) {
    return <div className="p-6">Please select an organization</div>;
  }

  const canCreatePipeline = () => {
    if (!stats || !subscription) return false;
    const orgStats = (stats as any)?.stats;
    if (!orgStats) return false;
    const planLimits = {
      free: { pipelines: 1 },
      pro: { pipelines: 5 },
      team: { pipelines: 20 }
    };
    const limit = (planLimits as any)[subscription.plan]?.pipelines || 1;
    return orgStats.pipelines < limit;
  };

  const getPlanLimitText = () => {
    const planLimits = {
      free: { pipelines: 1 },
      pro: { pipelines: 5 },
      team: { pipelines: 20 }
    };
    const limit = (planLimits as any)[subscription?.plan || 'free']?.pipelines || 1;
    const orgStats = (stats as any)?.stats;
    return `${orgStats?.pipelines || 0}/${limit}`;
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Pipeline Management</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage your sales pipelines and track leads through stages
          </p>
        </div>

        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button 
              data-testid="button-create-pipeline"
              disabled={!canCreatePipeline()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Pipeline
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Pipeline</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pipeline Name</FormLabel>
                      <FormControl>
                        <Input 
                          {...field}
                          data-testid="input-pipeline-name"
                          placeholder="e.g., Sales Pipeline, Lead Qualification"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowCreateDialog(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createPipeline.isPending}
                    data-testid="button-submit-pipeline"
                  >
                    Create Pipeline
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Plan Limits Info */}
      <div className="mb-6">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Network className="h-5 w-5 text-blue-500" />
                <span className="font-medium">Pipelines Used</span>
                <Badge variant="outline" data-testid="text-pipeline-limit">
                  {getPlanLimitText()}
                </Badge>
              </div>
              {!canCreatePipeline() && (
                <div className="text-sm text-amber-600">
                  <Link href="/billing">
                    <Button variant="outline" size="sm">
                      Upgrade Plan
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pipelines Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-4">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : !pipelines || (Array.isArray(pipelines) && pipelines.length === 0) ? (
        <Card>
          <CardContent className="text-center py-12">
            <Network className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              No pipelines yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Create your first pipeline to start tracking leads through your sales process.
            </p>
            {canCreatePipeline() && (
              <Button onClick={() => setShowCreateDialog(true)} data-testid="button-create-first-pipeline">
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Pipeline
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pipelines && Array.isArray(pipelines) && pipelines.map((pipeline: any) => (
            <Card key={pipeline.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg" data-testid={`text-pipeline-name-${pipeline.id}`}>
                    {pipeline.name}
                  </CardTitle>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem asChild>
                        <Link href={`/pipelines/${pipeline.id}`}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Pipeline
                        </Link>
                      </DropdownMenuItem>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <DropdownMenuItem 
                            onSelect={(e) => e.preventDefault()}
                            className="text-red-600 focus:text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Pipeline
                          </DropdownMenuItem>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Pipeline</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{pipeline.name}"? This will also delete all stages and leads in this pipeline. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deletePipeline.mutate(pipeline.id)}
                              className="bg-red-600 hover:bg-red-700"
                              data-testid={`button-delete-pipeline-${pipeline.id}`}
                            >
                              Delete Pipeline
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                    <Calendar className="h-4 w-4 mr-2" />
                    Created {new Date(pipeline.createdAt).toLocaleDateString()}
                  </div>
                  
                  <Link href={`/pipelines/${pipeline.id}`}>
                    <Button 
                      className="w-full" 
                      variant="outline"
                      data-testid={`button-view-pipeline-${pipeline.id}`}
                    >
                      <Network className="h-4 w-4 mr-2" />
                      View Pipeline
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}