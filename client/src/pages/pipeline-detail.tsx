import { useState } from 'react';
import { useRoute } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { Plus, MoreVertical, Edit, Trash2, MessageSquare, Mail, Calendar, User, ArrowLeft } from 'lucide-react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useOrganization } from '@/hooks/use-organization';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiRequest } from '@/lib/queryClient';

const createStageSchema = z.object({
  name: z.string().min(1, 'Stage name is required').max(100, 'Name too long'),
  order: z.number().min(0),
});

const createLeadSchema = z.object({
  name: z.string().min(1, 'Lead name is required').max(100, 'Name too long'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  source: z.string().max(100, 'Source too long').optional(),
  notes: z.string().max(1000, 'Notes too long').optional(),
});

type CreateStageData = z.infer<typeof createStageSchema>;
type CreateLeadData = z.infer<typeof createLeadSchema>;

export default function PipelineDetailPage() {
  const [match, params] = useRoute('/pipelines/:id');
  const pipelineId = params?.id;
  const { currentOrganization } = useOrganization();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [showCreateStageDialog, setShowCreateStageDialog] = useState(false);
  const [showCreateLeadDialog, setShowCreateLeadDialog] = useState(false);
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);

  const { data: pipelineData, isLoading } = useQuery({
    queryKey: ['/api/organizations', currentOrganization?.id, 'pipelines', pipelineId],
    enabled: !!currentOrganization && !!pipelineId,
  });

  const createStage = useMutation({
    mutationFn: (data: CreateStageData & { pipelineId: string }) =>
      apiRequest('POST', `/api/organizations/${currentOrganization?.id}/stages`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['/api/organizations', currentOrganization?.id, 'pipelines', pipelineId] 
      });
      setShowCreateStageDialog(false);
      toast({ title: 'Stage created successfully' });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to create stage',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const createLead = useMutation({
    mutationFn: (data: CreateLeadData & { stageId: string }) =>
      apiRequest('POST', `/api/organizations/${currentOrganization?.id}/leads`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['/api/organizations', currentOrganization?.id, 'pipelines', pipelineId] 
      });
      setShowCreateLeadDialog(false);
      setSelectedStageId(null);
      toast({ title: 'Lead created successfully' });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to create lead',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const moveLeadMutation = useMutation({
    mutationFn: ({ leadId, stageId }: { leadId: string; stageId: string }) =>
      apiRequest('POST', `/api/organizations/${currentOrganization?.id}/leads/${leadId}/move`, { stageId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['/api/organizations', currentOrganization?.id, 'pipelines', pipelineId] 
      });
      toast({ title: 'Lead moved successfully' });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to move lead',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const stageForm = useForm<CreateStageData>({
    resolver: zodResolver(createStageSchema),
    defaultValues: { name: '', order: 0 },
  });

  const leadForm = useForm<CreateLeadData>({
    resolver: zodResolver(createLeadSchema),
    defaultValues: { name: '', email: '', source: '', notes: '' },
  });

  const onCreateStage = (data: CreateStageData) => {
    if (!pipelineId) return;
    
    const stages = pipelineData?.stages || [];
    const maxOrder = stages.length 
      ? Math.max(...stages.map((s: any) => s.order))
      : -1;
    
    createStage.mutate({
      ...data,
      pipelineId,
      order: maxOrder + 1,
    });
  };

  const onCreateLead = (data: CreateLeadData) => {
    if (!selectedStageId) return;
    
    createLead.mutate({
      ...data,
      stageId: selectedStageId,
      email: data.email || undefined,
      source: data.source || undefined,
      notes: data.notes || undefined,
    });
  };

  const onDragEnd = (result: any) => {
    if (!result.destination) return;

    const { draggableId, destination } = result;
    const newStageId = destination.droppableId;
    
    moveLeadMutation.mutate({
      leadId: draggableId,
      stageId: newStageId,
    });
  };

  if (!match || !currentOrganization) {
    return <div className="p-6">Pipeline not found</div>;
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-96 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!pipelineData) {
    return <div className="p-6">Pipeline not found</div>;
  }

  const { pipeline, stages = [], leads = [] } = pipelineData || {};

  // Group leads by stage
  const leadsByStage = leads.reduce((acc: any, lead: any) => {
    if (!acc[lead.stageId]) {
      acc[lead.stageId] = [];
    }
    acc[lead.stageId].push(lead);
    return acc;
  }, {});

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <Link href="/pipelines">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Pipelines
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100" data-testid="text-pipeline-name">
              {pipeline.name}
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Manage stages and leads in this pipeline
            </p>
          </div>
        </div>

        <Dialog open={showCreateStageDialog} onOpenChange={setShowCreateStageDialog}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-stage">
              <Plus className="h-4 w-4 mr-2" />
              Add Stage
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Stage</DialogTitle>
            </DialogHeader>
            <Form {...stageForm}>
              <form onSubmit={stageForm.handleSubmit(onCreateStage)} className="space-y-4">
                <FormField
                  control={stageForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Stage Name</FormLabel>
                      <FormControl>
                        <Input 
                          {...field}
                          data-testid="input-stage-name"
                          placeholder="e.g., Prospecting, Qualified, Negotiation"
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
                    onClick={() => setShowCreateStageDialog(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createStage.isPending}
                    data-testid="button-submit-stage"
                  >
                    Create Stage
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Lead Creation Dialog */}
      <Dialog 
        open={showCreateLeadDialog} 
        onOpenChange={(open) => {
          setShowCreateLeadDialog(open);
          if (!open) setSelectedStageId(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Lead</DialogTitle>
          </DialogHeader>
          <Form {...leadForm}>
            <form onSubmit={leadForm.handleSubmit(onCreateLead)} className="space-y-4">
              <FormField
                control={leadForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lead Name</FormLabel>
                    <FormControl>
                      <Input 
                        {...field}
                        data-testid="input-lead-name"
                        placeholder="e.g., John Smith, ABC Company"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={leadForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email (Optional)</FormLabel>
                    <FormControl>
                      <Input 
                        {...field}
                        data-testid="input-lead-email"
                        placeholder="contact@example.com"
                        type="email"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={leadForm.control}
                name="source"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Source (Optional)</FormLabel>
                    <FormControl>
                      <Input 
                        {...field}
                        data-testid="input-lead-source"
                        placeholder="e.g., Website, Referral, Cold Call"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={leadForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (Optional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field}
                        data-testid="input-lead-notes"
                        placeholder="Any additional information about this lead"
                        rows={3}
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
                  onClick={() => setShowCreateLeadDialog(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createLead.isPending}
                  data-testid="button-submit-lead"
                >
                  Create Lead
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Pipeline Board */}
      {stages.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              No stages yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Create your first stage to start organizing leads in this pipeline.
            </p>
            <Button onClick={() => setShowCreateStageDialog(true)} data-testid="button-create-first-stage">
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Stage
            </Button>
          </CardContent>
        </Card>
      ) : (
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {stages
              .sort((a: any, b: any) => a.order - b.order)
              .map((stage: any) => (
                <div key={stage.id} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                  {/* Stage Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <h3 className="font-medium text-gray-900 dark:text-gray-100" data-testid={`text-stage-name-${stage.id}`}>
                        {stage.name}
                      </h3>
                      <Badge variant="outline" data-testid={`text-lead-count-${stage.id}`}>
                        {leadsByStage[stage.id]?.length || 0}
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedStageId(stage.id);
                        setShowCreateLeadDialog(true);
                      }}
                      data-testid={`button-add-lead-${stage.id}`}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Leads */}
                  <Droppable droppableId={stage.id}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`min-h-[200px] space-y-3 ${
                          snapshot.isDraggingOver ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                        }`}
                      >
                        {leadsByStage[stage.id]?.map((lead: any, index: number) => (
                          <Draggable key={lead.id} draggableId={lead.id} index={index}>
                            {(provided, snapshot) => (
                              <Card
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={`cursor-move ${
                                  snapshot.isDragging ? 'shadow-lg' : ''
                                }`}
                                data-testid={`card-lead-${lead.id}`}
                              >
                                <CardContent className="p-4">
                                  <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                      <h4 className="font-medium text-sm text-gray-900 dark:text-gray-100" data-testid={`text-lead-name-${lead.id}`}>
                                        {lead.name}
                                      </h4>
                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                          <Button variant="ghost" size="sm">
                                            <MoreVertical className="h-3 w-3" />
                                          </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent>
                                          <DropdownMenuItem asChild>
                                            <Link href={`/leads/${lead.id}`}>
                                              <User className="h-4 w-4 mr-2" />
                                              View Details
                                            </Link>
                                          </DropdownMenuItem>
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                    </div>
                                    
                                    {lead.email && (
                                      <div className="flex items-center text-xs text-gray-600 dark:text-gray-400">
                                        <Mail className="h-3 w-3 mr-1" />
                                        <span data-testid={`text-lead-email-${lead.id}`}>{lead.email}</span>
                                      </div>
                                    )}
                                    
                                    {lead.source && (
                                      <div className="flex items-center text-xs text-gray-600 dark:text-gray-400">
                                        <span className="w-3 h-3 mr-1">🏷️</span>
                                        <span data-testid={`text-lead-source-${lead.id}`}>{lead.source}</span>
                                      </div>
                                    )}
                                    
                                    <div className="flex items-center text-xs text-gray-500 dark:text-gray-500">
                                      <Calendar className="h-3 w-3 mr-1" />
                                      {new Date(lead.updatedAt).toLocaleDateString()}
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>
              ))}
          </div>
        </DragDropContext>
      )}
    </div>
  );
}