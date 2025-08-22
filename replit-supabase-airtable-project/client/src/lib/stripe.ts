export const STRIPE_PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLIC_KEY;

if (!STRIPE_PUBLISHABLE_KEY) {
  console.warn('Missing VITE_STRIPE_PUBLIC_KEY environment variable');
}

export interface CreateCheckoutSessionParams {
  priceId: string;
  successUrl: string;
  cancelUrl: string;
}

export interface CreatePortalSessionParams {
  returnUrl: string;
}

export interface CheckoutSessionResponse {
  url: string;
}

export interface PortalSessionResponse {
  url: string;
}

export class StripeService {
  private baseUrl: string;

  constructor(baseUrl: string = '') {
    this.baseUrl = baseUrl;
  }

  async createCheckoutSession(
    organizationId: string,
    params: CreateCheckoutSessionParams
  ): Promise<CheckoutSessionResponse> {
    const response = await fetch(`${this.baseUrl}/api/organizations/${organizationId}/billing/create-checkout-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || 'Failed to create checkout session');
    }

    return response.json();
  }

  async createPortalSession(
    organizationId: string,
    params: CreatePortalSessionParams
  ): Promise<PortalSessionResponse> {
    const response = await fetch(`${this.baseUrl}/api/organizations/${organizationId}/billing/create-portal-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || 'Failed to create portal session');
    }

    return response.json();
  }
}

export const stripeService = new StripeService();

// Plan configurations
export const STRIPE_PLANS = {
  pro: {
    name: 'Pro',
    priceId: import.meta.env.VITE_STRIPE_PRICE_PRO,
    price: 29,
    billing: 'monthly',
  },
  team: {
    name: 'Team',
    priceId: import.meta.env.VITE_STRIPE_PRICE_TEAM,
    price: 99,
    billing: 'monthly',
  },
} as const;

export type StripePlan = keyof typeof STRIPE_PLANS;

export function getStripePlan(planKey: string): typeof STRIPE_PLANS[StripePlan] | null {
  return STRIPE_PLANS[planKey as StripePlan] || null;
}

export function validateStripeConfig(): boolean {
  return !!(
    STRIPE_PUBLISHABLE_KEY &&
    import.meta.env.VITE_STRIPE_PRICE_PRO &&
    import.meta.env.VITE_STRIPE_PRICE_TEAM
  );
}
