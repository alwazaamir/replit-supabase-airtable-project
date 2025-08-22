import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useOrganization } from "@/hooks/use-organization";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { PLAN_LIMITS } from "@shared/schema";
import { Check, CreditCard, ExternalLink, Loader2 } from "lucide-react";

const PLAN_FEATURES = {
  free: {
    name: "Free",
    price: "$0",
    billing: "Forever",
    features: [
      "1 organization",
      "3 team members",
      "1,000 monthly operations",
      "1 Airtable table mapping",
      "Basic support"
    ]
  },
  pro: {
    name: "Pro",
    price: "$29",
    billing: "per month",
    features: [
      "5 organizations",
      "15 team members", 
      "100,000 monthly operations",
      "10 Airtable table mappings",
      "Priority support",
      "Advanced analytics"
    ]
  },
  team: {
    name: "Team",
    price: "$99",
    billing: "per month",
    features: [
      "20 organizations",
      "50 team members",
      "1M monthly operations", 
      "30 Airtable table mappings",
      "Premium support",
      "Advanced analytics",
      "Custom integrations"
    ]
  }
};

export default function Billing() {
  const { currentOrganization, subscription, stats, userRole } = useOrganization();
  const { toast } = useToast();
  const [isCreatingCheckout, setIsCreatingCheckout] = useState<string | null>(null);
  const [isCreatingPortal, setIsCreatingPortal] = useState(false);

  const createCheckoutMutation = useMutation({
    mutationFn: async (plan: string) => {
      const priceId = plan === 'pro' ? process.env.VITE_STRIPE_PRICE_PRO : process.env.VITE_STRIPE_PRICE_TEAM;
      const res = await apiRequest("POST", `/api/billing/create-checkout-session`, {
        priceId,
        successUrl: `${window.location.origin}/billing?success=true`,
        cancelUrl: `${window.location.origin}/billing?canceled=true`
      });
      return res.json();
    },
    onSuccess: (data) => {
      window.location.href = data.url;
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create checkout session",
        variant: "destructive",
      });
      setIsCreatingCheckout(null);
    },
  });

  const createPortalMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/billing/create-portal-session`, {
        returnUrl: window.location.href
      });
      return res.json();
    },
    onSuccess: (data) => {
      window.location.href = data.url;
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create portal session",
        variant: "destructive",
      });
      setIsCreatingPortal(false);
    },
  });

  const handleUpgrade = (plan: string) => {
    setIsCreatingCheckout(plan);
    createCheckoutMutation.mutate(plan);
  };

  const handleManageBilling = () => {
    setIsCreatingPortal(true);
    createPortalMutation.mutate();
  };

  const canManageBilling = userRole === 'admin';
  const currentPlan = currentOrganization?.plan || 'free';
  const planLimits = PLAN_LIMITS[currentPlan as keyof typeof PLAN_LIMITS];

  if (!currentOrganization || !stats) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
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
              Billing & Usage
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
                <li>Billing</li>
              </ol>
            </nav>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 p-6 overflow-auto">
        <div className="max-w-6xl space-y-6">
          {/* Current Plan */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Current Plan</CardTitle>
                  <CardDescription>
                    You are currently on the {PLAN_FEATURES[currentPlan as keyof typeof PLAN_FEATURES].name} plan
                  </CardDescription>
                </div>
                <Badge variant="secondary" className="capitalize text-lg px-3 py-1" data-testid="badge-current-plan">
                  {currentPlan}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Usage Stats */}
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-slate-600">API Operations</span>
                      <span className="font-medium" data-testid="usage-operations">
                        {stats.operations.toLocaleString()} / {planLimits.operations.toLocaleString()}
                      </span>
                    </div>
                    <Progress value={(stats.operations / planLimits.operations) * 100} className="h-2" />
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-slate-600">Team Members</span>
                      <span className="font-medium" data-testid="usage-members">
                        {stats.members} / {planLimits.members}
                      </span>
                    </div>
                    <Progress value={(stats.members / planLimits.members) * 100} className="h-2" />
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-slate-600">Table Mappings</span>
                      <span className="font-medium" data-testid="usage-tables">
                        {stats.tables} / {planLimits.tableMappings}
                      </span>
                    </div>
                    <Progress value={(stats.tables / planLimits.tableMappings) * 100} className="h-2" />
                  </div>
                </div>

                {/* Billing Info */}
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-slate-900 mb-2">Billing Information</h4>
                    <div className="text-sm text-slate-600 space-y-1">
                      <p>Plan: {PLAN_FEATURES[currentPlan as keyof typeof PLAN_FEATURES].name}</p>
                      <p>Status: {subscription?.status || 'Active'}</p>
                      {subscription?.periodEnd && (
                        <p>Next billing: {new Date(subscription.periodEnd).toLocaleDateString()}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-3">
                  {canManageBilling && currentPlan !== 'free' && (
                    <Button
                      onClick={handleManageBilling}
                      disabled={isCreatingPortal}
                      variant="outline"
                      className="w-full"
                      data-testid="button-manage-billing"
                    >
                      {isCreatingPortal ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        <>
                          <CreditCard className="w-4 h-4 mr-2" />
                          Manage Billing
                        </>
                      )}
                    </Button>
                  )}
                  
                  {!canManageBilling && (
                    <div className="text-center py-4">
                      <p className="text-sm text-slate-500">
                        Only administrators can manage billing
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Available Plans */}
          {canManageBilling && (
            <div>
              <h2 className="text-xl font-semibold text-slate-900 mb-4">Available Plans</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {Object.entries(PLAN_FEATURES).map(([planKey, plan]) => (
                  <Card 
                    key={planKey} 
                    className={`relative ${currentPlan === planKey ? 'border-blue-500 shadow-md' : ''}`}
                  >
                    {currentPlan === planKey && (
                      <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                        <Badge className="bg-blue-600 text-white">Current Plan</Badge>
                      </div>
                    )}
                    <CardHeader className="text-center">
                      <CardTitle className="text-xl">{plan.name}</CardTitle>
                      <div className="text-3xl font-bold text-slate-900">
                        {plan.price}
                        <span className="text-sm font-normal text-slate-500">/{plan.billing}</span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-3 mb-6">
                        {plan.features.map((feature, index) => (
                          <li key={index} className="flex items-center text-sm">
                            <Check className="w-4 h-4 text-green-600 mr-2 flex-shrink-0" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                      
                      {planKey !== currentPlan && planKey !== 'free' && (
                        <Button
                          onClick={() => handleUpgrade(planKey)}
                          disabled={isCreatingCheckout === planKey}
                          className="w-full bg-blue-600 text-white hover:bg-blue-700"
                          data-testid={`button-upgrade-${planKey}`}
                        >
                          {isCreatingCheckout === planKey ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Loading...
                            </>
                          ) : (
                            `Upgrade to ${plan.name}`
                          )}
                        </Button>
                      )}
                      
                      {planKey === 'free' && currentPlan !== 'free' && (
                        <Button variant="outline" className="w-full" disabled>
                          Downgrade to Free
                        </Button>
                      )}
                      
                      {planKey === currentPlan && (
                        <Button variant="outline" className="w-full" disabled>
                          Current Plan
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
