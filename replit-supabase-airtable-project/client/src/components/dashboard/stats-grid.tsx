import { Users, BarChart3, Database, Key } from "lucide-react";

interface StatsGridProps {
  stats: {
    members: number;
    operations: number;
    tables: number;
    apiKeys: number;
  };
}

export default function StatsGrid({ stats }: StatsGridProps) {
  const statCards = [
    {
      name: "Total Members",
      value: stats.members,
      icon: Users,
      color: "blue",
    },
    {
      name: "API Operations",
      value: stats.operations.toLocaleString(),
      icon: BarChart3,
      color: "green",
    },
    {
      name: "Airtable Tables",
      value: stats.tables,
      icon: Database,
      color: "purple",
    },
    {
      name: "Active API Keys",
      value: stats.apiKeys,
      icon: Key,
      color: "orange",
    },
  ];

  const colorClasses = {
    blue: "bg-blue-100 text-blue-600",
    green: "bg-green-100 text-green-600",
    purple: "bg-purple-100 text-purple-600",
    orange: "bg-orange-100 text-orange-600",
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
      {statCards.map((stat) => (
        <div key={stat.name} className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorClasses[stat.color]}`}>
                <stat.icon className="w-6 h-6" />
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-slate-500">{stat.name}</p>
              <p className="text-2xl font-semibold text-slate-900" data-testid={`stat-${stat.name.toLowerCase().replace(/ /g, '-')}`}>
                {stat.value}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
