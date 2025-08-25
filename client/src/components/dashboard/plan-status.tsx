import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

interface PlanStatusProps {
  stats: {
    members: number;
    operations: number;
    tables: number;
    apiKeys: number;
  };
  plan: string;
  planLimits: {
    members: number;
    operations: number;
    tableMappings: number;
  };
}

export default function PlanStatus({ stats, plan, planLimits }: PlanStatusProps) {
  const [, setLocation] = useLocation();

  const usageMetrics = [
    {
      name: "API Operations",
      current: stats.operations,
      limit: planLimits.operations,
      color: "blue",
    },
    {
      name: "Team Members",
      current: stats.members,
      limit: planLimits.members,
      color: "green",
    },
    {
      name: "Airtable Tables",
      current: stats.tables,
      limit: planLimits.tableMappings,
      color: "purple",
    },
  ];

  const getProgressBarClass = (percentage: number, color: string) => {
    const baseClass = `h-2 rounded-full`;
    const colorClass = color === "blue" ? "bg-blue-600" : 
                      color === "green" ? "bg-green-600" : 
                      "bg-purple-600";
    return `${baseClass} ${colorClass}`;
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <h3 className="text-lg font-semibold text-slate-900 mb-4">Plan Usage</h3>
      <div className="space-y-4">
        {usageMetrics.map((metric) => {
          const percentage = Math.min((metric.current / metric.limit) * 100, 100);
          
          return (
            <div key={metric.name}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-600">{metric.name}</span>
                <span className="font-medium" data-testid={`usage-${metric.name.toLowerCase().replace(/\s+/g, '-')}`}>
                  {metric.current.toLocaleString()} / {metric.limit.toLocaleString()}
                </span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div 
                  className={getProgressBarClass(percentage, metric.color)}
                  style={{ width: `${percentage}%` }}
                  data-testid={`progress-${metric.name.toLowerCase().replace(/\s+/g, '-')}`}
                ></div>
              </div>
            </div>
          );
        })}

        <div className="pt-3 border-t border-slate-200">
          <Button
            className="w-full bg-blue-600 text-white hover:bg-blue-700"
            onClick={() => setLocation("/billing")}
            data-testid="button-manage-billing"
          >
            Manage Billing
          </Button>
        </div>
      </div>
    </div>
  );
}
