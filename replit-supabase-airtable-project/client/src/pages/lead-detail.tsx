import { useState } from 'react';
import { useRoute, Link } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Edit, Mail, Calendar, MessageSquare, Send, User, AtSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useOrganization } from '@/hooks/use-organization';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiRequest } from '@/lib/queryClient';

const updateLeadSchema = z.object({
  name: z.string().min(1, 'Lead name is required').max(100, 'Name too long'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  source: z.string().max(100, 'Source too long').optional(),
  notes: z.string().max(1000, 'Notes too long').optional(),
});

const commentSchema = z.object({
  body: z.string().min(1, 'Comment cannot be empty').max(1000, 'Comment too long'),
});

type UpdateLeadData = z.infer<typeof updateLeadSchema>;
type CommentData = z.infer<typeof commentSchema>;

export default function LeadDetailPage() {
  const [match, params] = useRoute('/leads/:id');
  const leadId = params?.id;
  const { currentOrganization } = useOrganization();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [newComment, setNewComment] = useState('');

  const { data: leadData, isLoading } = useQuery({
    queryKey: ['/api/organizations', currentOrganization?.id, 'leads', leadId],
    enabled: !!currentOrganization && !!leadId,
  });

  const { data: members } = useQuery({
    queryKey: ['/api/organizations', currentOrganization?.id, 'members'],
    enabled: !!currentOrganization,
  });

  const updateLead = useMutation({
    mutationFn: (data: UpdateLeadData) =>
      apiRequest('PUT', `/api/organizations/${currentOrganization?.id}/leads/${leadId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['/api/organizations', currentOrganization?.id, 'leads', leadId] 
      });
      setShowEditDialog(false);
      toast({ title: 'Lead updated successfully' });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to update lead',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const createComment = useMutation({
    mutationFn: (data: CommentData) =>
      apiRequest('POST', `/api/organizations/${currentOrganization?.id}/leads/${leadId}/comments`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['/api/organizations', currentOrganization?.id, 'leads', leadId] 
      });
      setNewComment('');
      toast({ title: 'Comment added successfully' });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to add comment',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const form = useForm<UpdateLeadData>({
    resolver: zodResolver(updateLeadSchema),
    defaultValues: { 
      name: leadData?.lead?.name || '', 
      email: leadData?.lead?.email || '', 
      source: leadData?.lead?.source || '', 
      notes: leadData?.lead?.notes || '' 
    },
  });

  // Update form when data loads
  if (leadData?.lead && !form.formState.isDirty) {
    form.reset({
      name: leadData.lead.name,
      email: leadData.lead.email || '',
      source: leadData.lead.source || '',
      notes: leadData.lead.notes || '',
    });
  }

  const onSubmit = (data: UpdateLeadData) => {
    updateLead.mutate({
      ...data,
      email: data.email || undefined,
      source: data.source || undefined,
      notes: data.notes || undefined,
    });
  };

  const handleCommentSubmit = () => {
    if (!newComment.trim()) return;
    
    createComment.mutate({ body: newComment });
  };

  const handleAtMention = (username: string) => {
    setNewComment(prev => prev + `@${username} `);
  };

  if (!match || !currentOrganization) {
    return <div className="p-6">Lead not found</div>;
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
          <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (!leadData) {
    return <div className="p-6">Lead not found</div>;
  }

  const { lead, comments = [] } = leadData;

  return (
    <div className="p-6 max-w-4xl mx-auto">
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
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100" data-testid="text-lead-name">
              {lead.name}
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Lead details and activity
            </p>
          </div>
        </div>

        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogTrigger asChild>
            <Button data-testid="button-edit-lead">
              <Edit className="h-4 w-4 mr-2" />
              Edit Lead
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Lead</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lead Name</FormLabel>
                      <FormControl>
                        <Input 
                          {...field}
                          data-testid="input-edit-lead-name"
                          placeholder="e.g., John Smith, ABC Company"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email (Optional)</FormLabel>
                      <FormControl>
                        <Input 
                          {...field}
                          data-testid="input-edit-lead-email"
                          placeholder="contact@example.com"
                          type="email"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="source"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Source (Optional)</FormLabel>
                      <FormControl>
                        <Input 
                          {...field}
                          data-testid="input-edit-lead-source"
                          placeholder="e.g., Website, Referral, Cold Call"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes (Optional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field}
                          data-testid="input-edit-lead-notes"
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
                    onClick={() => setShowEditDialog(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={updateLead.isPending}
                    data-testid="button-submit-lead-edit"
                  >
                    Save Changes
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lead Information */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="h-5 w-5 mr-2" />
                Lead Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {lead.email && (
                <div className="flex items-center space-x-2">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <span className="text-sm" data-testid="text-lead-email">{lead.email}</span>
                </div>
              )}
              
              {lead.source && (
                <div className="flex items-center space-x-2">
                  <span className="text-gray-400">🏷️</span>
                  <span className="text-sm" data-testid="text-lead-source">{lead.source}</span>
                </div>
              )}
              
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-gray-400" />
                <span className="text-sm">
                  Created {new Date(lead.createdAt).toLocaleDateString()}
                </span>
              </div>
              
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-gray-400" />
                <span className="text-sm">
                  Updated {new Date(lead.updatedAt).toLocaleDateString()}
                </span>
              </div>

              {lead.notes && (
                <div className="pt-4 border-t">
                  <h4 className="font-medium mb-2">Notes</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400" data-testid="text-lead-notes">
                    {lead.notes}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Comments Section */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <MessageSquare className="h-5 w-5 mr-2" />
                Comments & Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add Comment */}
              <div className="border rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <Avatar>
                    <AvatarFallback>ME</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-2">
                    <Textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Add a comment... Use @username to mention team members"
                      rows={3}
                      data-testid="input-new-comment"
                    />
                    
                    {/* @Mention suggestions */}
                    {newComment.includes('@') && members && (
                      <div className="flex flex-wrap gap-1">
                        <span className="text-xs text-gray-500">Quick mentions:</span>
                        {members.slice(0, 5).map((member: any) => (
                          <Button
                            key={member.userId}
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs"
                            onClick={() => handleAtMention(member.user.name.replace(/\s+/g, '').toLowerCase())}
                            data-testid={`button-mention-${member.userId}`}
                          >
                            <AtSign className="h-3 w-3 mr-1" />
                            {member.user.name}
                          </Button>
                        ))}
                      </div>
                    )}
                    
                    <div className="flex justify-end">
                      <Button
                        onClick={handleCommentSubmit}
                        disabled={!newComment.trim() || createComment.isPending}
                        size="sm"
                        data-testid="button-submit-comment"
                      >
                        <Send className="h-4 w-4 mr-2" />
                        Add Comment
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Comments List */}
              <div className="space-y-4">
                {comments.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <MessageSquare className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                    <p>No comments yet. Start the conversation!</p>
                  </div>
                ) : (
                  comments.map((comment: any) => (
                    <div key={comment.id} className="flex space-x-3" data-testid={`comment-${comment.id}`}>
                      <Avatar>
                        <AvatarFallback>
                          {comment.user.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="font-medium text-sm" data-testid={`text-comment-author-${comment.id}`}>
                            {comment.user.name}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(comment.createdAt).toLocaleDateString()}
                          </span>
                          {comment.mentionedUserIds && comment.mentionedUserIds.length > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              <AtSign className="h-3 w-3 mr-1" />
                              Mentions
                            </Badge>
                          )}
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                          <p className="text-sm" data-testid={`text-comment-body-${comment.id}`}>
                            {comment.body}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}