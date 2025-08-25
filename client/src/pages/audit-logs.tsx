import { useQuery } from "@tanstack/react-query";
import { useOrganization } from "@/hooks/use-organization";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";

interface AuditLog {
  id: number;
  action: string;
  entity: string;
  entityId: string | null;
  metadata: any;
  createdAt: string;
  actorId: string | null;
}

export default function AuditLogs() {
  const { currentOrganization } = useOrganization();

  const { data: auditLogs, isLoading } = useQuery<AuditLog[]>({
    queryKey: ["/api/organizations", currentOrganization?.id, "audit-logs"],
    enabled: !!currentOrganization,
  });

  const getActionBadgeVariant = (action: string) => {
    switch (action) {
      case 'create':
        return 'secondary';
      case 'update':
        return 'default';
      case 'delete':
        return 'destructive';
      case 'invite':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'create':
        return 'text-green-600';
      case 'update':
        return 'text-blue-600';
      case 'delete':
        return 'text-red-600';
      case 'invite':
        return 'text-purple-600';
      default:
        return 'text-orange-600';
    }
  };

  const formatActivity = (log: AuditLog) => {
    const metadata = log.metadata || {};
    
    switch (log.action) {
      case 'create':
        if (log.entity === 'api_key') {
          return `Created API key "${metadata.name}"`;
        }
        if (log.entity === 'organization') {
          return `Created organization "${metadata.name}"`;
        }
        return `Created ${log.entity}`;
      
      case 'update':
        if (log.entity === 'setting') {
          return `Updated ${metadata.key} settings`;
        }
        return `Updated ${log.entity}`;
      
      case 'delete':
        if (log.entity === 'api_key') {
          return `Deleted API key`;
        }
        return `Deleted ${log.entity}`;
      
      case 'invite':
        return `Invited ${metadata.email} as ${metadata.role}`;
      
      default:
        return log.action;
    }
  };

  const formatTimeAgo = (dateString: string) => {
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

  const formatFullDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900" data-testid="text-page-title">
              Audit Logs
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
                <li>Audit Logs</li>
              </ol>
            </nav>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 p-6 overflow-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="w-5 h-5 mr-2" />
              Activity Log
            </CardTitle>
            <CardDescription>
              Track all actions performed within your organization
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(10)].map((_, i) => (
                  <div key={i} className="animate-pulse flex items-center space-x-4 py-3">
                    <div className="w-16 h-6 bg-slate-200 rounded"></div>
                    <div className="flex-1 h-4 bg-slate-200 rounded"></div>
                    <div className="w-24 h-4 bg-slate-200 rounded"></div>
                  </div>
                ))}
              </div>
            ) : !auditLogs || auditLogs.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="mx-auto h-12 w-12 text-slate-400" />
                <h3 className="mt-2 text-sm font-medium text-slate-900">No audit logs</h3>
                <p className="mt-1 text-sm text-slate-500" data-testid="text-no-logs">
                  Activity logs will appear here as actions are performed.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Action</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Time Ago</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditLogs.map((log) => (
                    <TableRow key={log.id} data-testid={`audit-log-${log.id}`}>
                      <TableCell>
                        <Badge 
                          variant={getActionBadgeVariant(log.action)} 
                          className={`capitalize ${getActionColor(log.action)}`}
                        >
                          {log.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium" data-testid={`log-description-${log.id}`}>
                        {formatActivity(log)}
                      </TableCell>
                      <TableCell>
                        <code className="px-2 py-1 bg-slate-100 text-slate-700 text-xs rounded">
                          {log.entity}
                        </code>
                      </TableCell>
                      <TableCell className="text-slate-500 text-sm" data-testid={`log-date-${log.id}`}>
                        {formatFullDate(log.createdAt)}
                      </TableCell>
                      <TableCell className="text-slate-500 text-sm" data-testid={`log-time-ago-${log.id}`}>
                        {formatTimeAgo(log.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
