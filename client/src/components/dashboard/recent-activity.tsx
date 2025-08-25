import { useQuery } from "@tanstack/react-query";
import { useOrganization } from "@/hooks/use-organization";
import { Link } from "wouter";

interface AuditLog {
  id: number;
  action: string;
  entity: string;
  entityId: string | null;
  metadata: any;
  createdAt: string;
  actorId: string | null;
}

export default function RecentActivity() {
  const { currentOrganization } = useOrganization();

  const { data: auditLogs, isLoading } = useQuery<AuditLog[]>({
    queryKey: ["/api/organizations", currentOrganization?.id, "audit-logs"],
    enabled: !!currentOrganization,
  });

  const getActivityColor = (action: string) => {
    switch (action) {
      case 'create':
        return 'bg-green-400';
      case 'update':
        return 'bg-blue-400';
      case 'delete':
        return 'bg-red-400';
      case 'invite':
        return 'bg-purple-400';
      default:
        return 'bg-orange-400';
    }
  };

  const formatActivity = (log: AuditLog) => {
    const metadata = log.metadata || {};
    
    switch (log.action) {
      case 'create':
        if (log.entity === 'api_key') {
          return `created a new API key "${metadata.name}"`;
        }
        if (log.entity === 'organization') {
          return `created organization "${metadata.name}"`;
        }
        return `created ${log.entity}`;
      
      case 'update':
        if (log.entity === 'setting') {
          return `updated ${metadata.key} settings`;
        }
        return `updated ${log.entity}`;
      
      case 'delete':
        return `deleted ${log.entity}`;
      
      case 'invite':
        return `invited ${metadata.email} as ${metadata.role}`;
      
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

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="p-6 border-b border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900">Recent Activity</h3>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="animate-pulse flex items-start space-x-3">
                <div className="w-2 h-2 bg-slate-200 rounded-full mt-2"></div>
                <div className="flex-1">
                  <div className="h-4 bg-slate-200 rounded w-3/4 mb-1"></div>
                  <div className="h-3 bg-slate-200 rounded w-1/4"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200">
      <div className="p-6 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">Recent Activity</h3>
          <Link href="/audit-logs">
            <span className="text-sm text-blue-600 hover:text-blue-700 cursor-pointer" data-testid="link-view-all-logs">
              View all
            </span>
          </Link>
        </div>
      </div>
      <div className="p-6">
        {!auditLogs || auditLogs.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-slate-500" data-testid="text-no-activity">
              No recent activity to display
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {auditLogs.slice(0, 4).map((log) => (
              <div key={log.id} className="flex items-start space-x-3" data-testid={`activity-${log.id}`}>
                <div className={`flex-shrink-0 w-2 h-2 rounded-full mt-2 ${getActivityColor(log.action)}`}></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-900">
                    <span className="font-medium">System</span>{" "}
                    {formatActivity(log)}
                  </p>
                  <p className="text-xs text-slate-500" data-testid={`activity-time-${log.id}`}>
                    {formatTimeAgo(log.createdAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
