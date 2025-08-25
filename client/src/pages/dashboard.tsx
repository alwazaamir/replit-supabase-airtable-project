import { useOrganization } from "@/hooks/use-organization";
import StatsGrid from "@/components/dashboard/stats-grid";
import RecentActivity from "@/components/dashboard/recent-activity";
import QuickActions from "@/components/dashboard/quick-actions";
import PlanStatus from "@/components/dashboard/plan-status";
import TeamMembersSection from "@/components/team/team-members-section";
import ApiKeysSection from "@/components/api-keys/api-keys-section";
import { PLAN_LIMITS } from "@shared/schema";

export default function Dashboard() {
  const { currentOrganization, subscription, stats } = useOrganization();
  console.log("🚀 ~ Dashboard ~ stats:", stats)
  console.log("🚀 ~ Dashboard ~ currentOrganization:", currentOrganization)

  if (!currentOrganization || !stats) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-slate-200 rounded w-48"></div>
          <div className="grid grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-slate-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const planLimits = PLAN_LIMITS[currentOrganization.plan as keyof typeof PLAN_LIMITS];
  const isNearLimit = stats.operations > planLimits.operations * 0.9;

  return (
    <div className="flex-1 flex flex-col">
      {/* Top Bar */}
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900" data-testid="text-page-title">
              Dashboard
            </h1>
            <nav className="flex mt-1" aria-label="Breadcrumb">
              <ol className="flex items-center space-x-2 text-sm text-slate-500">
                <li data-testid="text-breadcrumb-org">
                  {currentOrganization.name}
                </li>
                <li>
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"></path>
                  </svg>
                </li>
                <li>Dashboard</li>
              </ol>
            </nav>
          </div>
        </div>
      </header>

      {/* Plan Usage Banner */}
      {isNearLimit && (
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-3" data-testid="banner-plan-warning">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-amber-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
              </svg>
              <span className="text-sm text-amber-800">
                You're approaching your {currentOrganization.plan} plan limits:{" "}
                <strong data-testid="text-operations-used">{stats.operations.toLocaleString()}</strong> /{" "}
                {planLimits.operations.toLocaleString()} monthly operations used
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Main Dashboard Content */}
      <main className="flex-1 p-6 overflow-auto">
        {/* Stats Cards */}
        <StatsGrid stats={stats} />

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mt-8">
          {/* Recent Activity */}
          <div className="xl:col-span-2">
            <RecentActivity />
          </div>

          {/* Quick Actions & Plan Status */}
          <div className="space-y-6">
            <QuickActions />
            <PlanStatus 
              stats={stats}
              plan={currentOrganization.plan}
              planLimits={planLimits}
            />
          </div>
        </div>

        {/* Team Members Section */}
        <div className="mt-8">
          <TeamMembersSection />
        </div>

        {/* API Keys Section */}
        <div className="mt-8">
          <ApiKeysSection />
        </div>
      </main>
    </div>
  );
}
