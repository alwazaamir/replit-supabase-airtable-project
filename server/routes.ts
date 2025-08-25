import type { Express } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import { storage } from "./storage";
import {
  insertUserSchema,
  insertOrganizationSchema,
  insertOrgMemberSchema,
  insertApiKeySchema,
  insertSettingSchema,
  insertPipelineSchema,
  insertStageSchema,
  insertLeadSchema,
  insertLeadCommentSchema,
  PLAN_LIMITS,
} from "@shared/schema";
import { randomBytes, createHash } from "crypto";
import Stripe from "stripe";

// Session configuration
declare module "express-session" {
  interface SessionData {
    userId?: string;
    organizationId?: string;
  }
}

// Initialize Stripe if available
let stripe: Stripe | null = null;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Session middleware
  app.use(
    session({
      secret: "dev-secret-change-in-production",
      resave: false,
      saveUninitialized: false,
      cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }, // 24 hours
    })
  );

  // Middleware to check authentication
  const requireAuth = (req: any, res: any, next: any) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Authentication required" });
    }
    next();
  };

  // Middleware to check organization access
  const requireOrgAccess = async (req: any, res: any, next: any) => {
    const { organizationId } = req.params;
    const userId = req.session.userId;

    if (!organizationId || !userId) {
      return res.status(401).json({ error: "Organization access required" });
    }

    const member = await storage.getOrgMember(organizationId, userId);
    if (!member) {
      return res.status(403).json({ error: "Access denied to organization" });
    }

    req.orgMember = member;
    next();
  };

  // Auth routes
  app.post("/api/auth/signup", async (req, res) => {
    try {
      console.log("🚀 ~ registerRoutes ~ req.body:", req.body);

      const { email, passwordHash, name } = insertUserSchema
        .extend({
          name: insertUserSchema.shape.name,
        })
        .parse({ ...req.body, passwordHash: req.body.password });

      console.log(`🚀 ~ registerRoutes ~ { email, password, name }:`, {
        email,
        passwordHash,
        name,
      });

      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: "User already exists" });
      }

      const user = await storage.createUser({
        email,
        passwordHash: passwordHash,
        name,
      });

      req.session.userId = user.id;

      try {
        const defaultOrgPayload = {
          name: `${name}'s Organization`,
        };
        // const orgData = insertOrganizationSchema.parse(req.body);
        const orgData = insertOrganizationSchema.parse(defaultOrgPayload);
        const organization = await storage.createOrganization(
          orgData,
          user.id!
        );

        await storage.createAuditLog({
          orgId: organization.id,
          actorId: user.id!,
          action: "create",
          entity: "organization",
          entityId: organization.id,
          metadata: { name: organization.name },
        });

        console.log("🚀 ~ registerRoutes ~ organization:", organization)
      } catch (error: any) {
        console.log("🚀 ~ registerRoutes ~ error.message:", error.message);
      }

      res.json({
        user: { id: user.id, email: user.email, name: user.name },
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;

      const user = await storage.verifyPassword(email, password);
      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      req.session.userId = user.id;

      res.json({
        user: { id: user.id, email: user.email, name: user.name },
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy(() => {
      res.json({ success: true });
    });
  });

  app.get("/api/auth/me", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUserWithOrganizations(req.session.userId!);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          organizations: user.organizations,
        },
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Organization routes
  app.post("/api/organizations", requireAuth, async (req, res) => {
    try {
      const orgData = insertOrganizationSchema.parse(req.body);
      const organization = await storage.createOrganization(
        orgData,
        req.session.userId!
      );

      await storage.createAuditLog({
        orgId: organization.id,
        actorId: req.session.userId!,
        action: "create",
        entity: "organization",
        entityId: organization.id,
        metadata: { name: organization.name },
      });

      res.json(organization);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get(
    "/api/organizations/:organizationId",
    requireAuth,
    requireOrgAccess,
    async (req, res) => {
      try {
        const { organizationId } = req.params;
        const organization = await storage.getOrganization(organizationId);

        if (!organization) {
          return res.status(404).json({ error: "Organization not found" });
        }

        const subscription = await storage.getSubscription(organizationId);
        const stats = await storage.getOrganizationStats(organizationId);

        res.json({
          organization,
          subscription,
          stats,
          userRole: req.orgMember.role,
        });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  // Organization members
  app.get(
    "/api/organizations/:organizationId/members",
    requireAuth,
    requireOrgAccess,
    async (req, res) => {
      try {
        const { organizationId } = req.params;
        const members = await storage.getOrgMembers(organizationId);
        res.json(members);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  app.post(
    "/api/organizations/:organizationId/members",
    requireAuth,
    requireOrgAccess,
    async (req, res) => {
      try {
        const { organizationId } = req.params;
        const { email, role } = req.body;

        if (!["admin", "editor"].includes(req.orgMember.role)) {
          return res.status(403).json({ error: "Insufficient permissions" });
        }

        // Check if user exists
        const invitedUser = await storage.getUserByEmail(email);
        if (!invitedUser) {
          return res.status(404).json({ error: "User not found" });
        }

        // Check if already a member
        const existing = await storage.getOrgMember(
          organizationId,
          invitedUser.id
        );
        if (existing) {
          return res.status(400).json({ error: "User is already a member" });
        }

        const member = await storage.addOrgMember({
          orgId: organizationId,
          userId: invitedUser.id,
          role,
          invitedBy: req.session.userId!,
          acceptedAt: new Date(),
        });

        await storage.createAuditLog({
          orgId: organizationId,
          actorId: req.session.userId!,
          action: "invite",
          entity: "member",
          entityId: invitedUser.id,
          metadata: { email, role },
        });

        res.json(member);
      } catch (error: any) {
        res.status(400).json({ error: error.message });
      }
    }
  );

  // API Keys
  app.get(
    "/api/organizations/:organizationId/api-keys",
    requireAuth,
    requireOrgAccess,
    async (req, res) => {
      try {
        const { organizationId } = req.params;
        const apiKeys = await storage.getApiKeys(organizationId);
        res.json(apiKeys);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  app.post(
    "/api/organizations/:organizationId/api-keys",
    requireAuth,
    requireOrgAccess,
    async (req, res) => {
      try {
        const { organizationId } = req.params;
        const { name } = insertApiKeySchema.parse(req.body);

        if (!["admin", "editor"].includes(req.orgMember.role)) {
          return res.status(403).json({ error: "Insufficient permissions" });
        }

        // Generate API key
        const keyValue = `sk_${randomBytes(24).toString("hex")}`;
        const keyHash = createHash("sha256").update(keyValue).digest("hex");
        const keyPreview = `${keyValue.substring(0, 12)}${"*".repeat(20)}`;

        const apiKey = await storage.createApiKey({
          orgId: organizationId,
          name,
          keyHash,
          keyPreview,
          createdBy: req.session.userId!,
        });

        await storage.createAuditLog({
          orgId: organizationId,
          actorId: req.session.userId!,
          action: "create",
          entity: "api_key",
          entityId: apiKey.id,
          metadata: { name },
        });

        // Return the actual key only once
        res.json({ ...apiKey, keyValue });
      } catch (error: any) {
        res.status(400).json({ error: error.message });
      }
    }
  );

  app.delete(
    "/api/organizations/:organizationId/api-keys/:keyId",
    requireAuth,
    requireOrgAccess,
    async (req, res) => {
      try {
        const { organizationId, keyId } = req.params;

        if (!["admin", "editor"].includes(req.orgMember.role)) {
          return res.status(403).json({ error: "Insufficient permissions" });
        }

        await storage.deleteApiKey(keyId, organizationId);

        await storage.createAuditLog({
          orgId: organizationId,
          actorId: req.session.userId!,
          action: "delete",
          entity: "api_key",
          entityId: keyId,
          metadata: {},
        });

        res.json({ success: true });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  // Settings
  app.get(
    "/api/organizations/:organizationId/settings",
    requireAuth,
    requireOrgAccess,
    async (req, res) => {
      try {
        const { organizationId } = req.params;
        const settings = await storage.getSettings(organizationId);

        const settingsMap = settings.reduce((acc, setting) => {
          acc[setting.key] = setting.value;
          return acc;
        }, {} as Record<string, any>);

        res.json(settingsMap);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  app.put(
    "/api/organizations/:organizationId/settings/:key",
    requireAuth,
    requireOrgAccess,
    async (req, res) => {
      try {
        const { organizationId, key } = req.params;
        const { value } = req.body;

        if (req.orgMember.role !== "admin") {
          return res.status(403).json({ error: "Admin access required" });
        }

        const setting = await storage.setSetting({
          orgId: organizationId,
          key,
          value,
          updatedBy: req.session.userId!,
        });

        await storage.createAuditLog({
          orgId: organizationId,
          actorId: req.session.userId!,
          action: "update",
          entity: "setting",
          entityId: key,
          metadata: { key, value },
        });

        res.json(setting);
      } catch (error: any) {
        res.status(400).json({ error: error.message });
      }
    }
  );

  // Audit Logs
  app.get(
    "/api/organizations/:organizationId/audit-logs",
    requireAuth,
    requireOrgAccess,
    async (req, res) => {
      try {
        const { organizationId } = req.params;
        const limit = parseInt(req.query.limit as string) || 50;
        const logs = await storage.getAuditLogs(organizationId, limit);
        res.json(logs);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  // Stripe billing routes
  if (stripe) {
    app.post(
      "/api/billing/create-checkout-session",
      requireAuth,
      requireOrgAccess,
      async (req, res) => {
        try {
          const { organizationId } = req.params;
          const { priceId, successUrl, cancelUrl } = req.body;

          if (req.orgMember.role !== "admin") {
            return res.status(403).json({ error: "Admin access required" });
          }

          const organization = await storage.getOrganization(organizationId);
          if (!organization) {
            return res.status(404).json({ error: "Organization not found" });
          }

          let customerId = organization.stripeCustomerId;

          if (!customerId) {
            const customer = await stripe!.customers.create({
              metadata: { organizationId },
            });
            customerId = customer.id;
            await storage.updateOrganization(organizationId, {
              stripeCustomerId: customerId,
            });
          }

          const session = await stripe!.checkout.sessions.create({
            customer: customerId,
            payment_method_types: ["card"],
            line_items: [{ price: priceId, quantity: 1 }],
            mode: "subscription",
            success_url: successUrl,
            cancel_url: cancelUrl,
            metadata: { organizationId },
          });

          res.json({ url: session.url });
        } catch (error: any) {
          res.status(500).json({ error: error.message });
        }
      }
    );

    app.post(
      "/api/billing/create-portal-session",
      requireAuth,
      requireOrgAccess,
      async (req, res) => {
        try {
          const { organizationId } = req.params;
          const { returnUrl } = req.body;

          if (req.orgMember.role !== "admin") {
            return res.status(403).json({ error: "Admin access required" });
          }

          const organization = await storage.getOrganization(organizationId);
          if (!organization?.stripeCustomerId) {
            return res.status(400).json({ error: "No billing account found" });
          }

          const session = await stripe!.billingPortal.sessions.create({
            customer: organization.stripeCustomerId,
            return_url: returnUrl,
          });

          res.json({ url: session.url });
        } catch (error: any) {
          res.status(500).json({ error: error.message });
        }
      }
    );
  }

  // Pipeline Management Routes

  // Pipelines
  app.get(
    "/api/organizations/:organizationId/pipelines",
    requireAuth,
    requireOrgAccess,
    async (req, res) => {
      try {
        const { organizationId } = req.params;
        const pipelines = await storage.getPipelines(organizationId);
        res.json(pipelines);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  app.post(
    "/api/organizations/:organizationId/pipelines",
    requireAuth,
    requireOrgAccess,
    async (req, res) => {
      try {
        const { organizationId } = req.params;
        const pipelineData = insertPipelineSchema.parse({
          ...req.body,
          orgId: organizationId,
        });

        if (!["admin", "editor"].includes(req.orgMember.role)) {
          return res.status(403).json({ error: "Insufficient permissions" });
        }

        // Check plan limits
        const subscription = await storage.getSubscription(organizationId);
        const plan = subscription?.plan || "free";
        const existingPipelines = await storage.getPipelines(organizationId);

        if (existingPipelines.length >= (PLAN_LIMITS as any)[plan].pipelines) {
          return res.status(400).json({
            error: `Pipeline limit reached for ${plan} plan. Upgrade to create more pipelines.`,
          });
        }

        const pipeline = await storage.createPipeline(pipelineData);

        await storage.createAuditLog({
          orgId: organizationId,
          actorId: req.session.userId!,
          action: "create",
          entity: "pipeline",
          entityId: pipeline.id,
          metadata: { name: pipeline.name },
        });

        res.json(pipeline);
      } catch (error: any) {
        res.status(400).json({ error: error.message });
      }
    }
  );

  app.get(
    "/api/organizations/:organizationId/pipelines/:pipelineId",
    requireAuth,
    requireOrgAccess,
    async (req, res) => {
      try {
        const { organizationId, pipelineId } = req.params;

        const pipeline = await storage.getPipeline(pipelineId, organizationId);
        if (!pipeline) {
          return res.status(404).json({ error: "Pipeline not found" });
        }

        const stages = await storage.getStages(pipelineId, organizationId);
        const leads = await storage.getLeadsByPipeline(
          pipelineId,
          organizationId
        );

        res.json({ pipeline, stages, leads });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  app.put(
    "/api/organizations/:organizationId/pipelines/:pipelineId",
    requireAuth,
    requireOrgAccess,
    async (req, res) => {
      try {
        const { organizationId, pipelineId } = req.params;
        const updates = req.body;

        if (!["admin", "editor"].includes(req.orgMember.role)) {
          return res.status(403).json({ error: "Insufficient permissions" });
        }

        const pipeline = await storage.updatePipeline(
          pipelineId,
          organizationId,
          updates
        );

        await storage.createAuditLog({
          orgId: organizationId,
          actorId: req.session.userId!,
          action: "update",
          entity: "pipeline",
          entityId: pipeline.id,
          metadata: { updates },
        });

        res.json(pipeline);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  app.delete(
    "/api/organizations/:organizationId/pipelines/:pipelineId",
    requireAuth,
    requireOrgAccess,
    async (req, res) => {
      try {
        const { organizationId, pipelineId } = req.params;

        if (!["admin", "editor"].includes(req.orgMember.role)) {
          return res.status(403).json({ error: "Insufficient permissions" });
        }

        await storage.deletePipeline(pipelineId, organizationId);

        await storage.createAuditLog({
          orgId: organizationId,
          actorId: req.session.userId!,
          action: "delete",
          entity: "pipeline",
          entityId: pipelineId,
          metadata: {},
        });

        res.json({ success: true });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  // Stages
  app.post(
    "/api/organizations/:organizationId/stages",
    requireAuth,
    requireOrgAccess,
    async (req, res) => {
      try {
        const { organizationId } = req.params;
        const stageData = insertStageSchema.parse({
          ...req.body,
          orgId: organizationId,
        });

        if (!["admin", "editor"].includes(req.orgMember.role)) {
          return res.status(403).json({ error: "Insufficient permissions" });
        }

        // Verify pipeline access
        const pipeline = await storage.getPipeline(
          stageData.pipelineId,
          organizationId
        );
        if (!pipeline) {
          return res.status(404).json({ error: "Pipeline not found" });
        }

        const stage = await storage.createStage(stageData);

        await storage.createAuditLog({
          orgId: organizationId,
          actorId: req.session.userId!,
          action: "create",
          entity: "stage",
          entityId: stage.id,
          metadata: { name: stage.name, pipelineId: stage.pipelineId },
        });

        res.json(stage);
      } catch (error: any) {
        res.status(400).json({ error: error.message });
      }
    }
  );

  app.put(
    "/api/organizations/:organizationId/stages/:stageId",
    requireAuth,
    requireOrgAccess,
    async (req, res) => {
      try {
        const { organizationId, stageId } = req.params;
        const updates = req.body;

        if (!["admin", "editor"].includes(req.orgMember.role)) {
          return res.status(403).json({ error: "Insufficient permissions" });
        }

        const stage = await storage.updateStage(
          stageId,
          organizationId,
          updates
        );

        await storage.createAuditLog({
          orgId: organizationId,
          actorId: req.session.userId!,
          action: "update",
          entity: "stage",
          entityId: stage.id,
          metadata: { updates },
        });

        res.json(stage);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  app.delete(
    "/api/organizations/:organizationId/stages/:stageId",
    requireAuth,
    requireOrgAccess,
    async (req, res) => {
      try {
        const { organizationId, stageId } = req.params;

        if (!["admin", "editor"].includes(req.orgMember.role)) {
          return res.status(403).json({ error: "Insufficient permissions" });
        }

        await storage.deleteStage(stageId, organizationId);

        await storage.createAuditLog({
          orgId: organizationId,
          actorId: req.session.userId!,
          action: "delete",
          entity: "stage",
          entityId: stageId,
          metadata: {},
        });

        res.json({ success: true });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  app.post(
    "/api/organizations/:organizationId/stages/reorder",
    requireAuth,
    requireOrgAccess,
    async (req, res) => {
      try {
        const { organizationId } = req.params;
        const { pipelineId, stageOrders } = req.body;

        if (!["admin", "editor"].includes(req.orgMember.role)) {
          return res.status(403).json({ error: "Insufficient permissions" });
        }

        await storage.reorderStages(pipelineId, organizationId, stageOrders);

        await storage.createAuditLog({
          orgId: organizationId,
          actorId: req.session.userId!,
          action: "reorder",
          entity: "stage",
          entityId: pipelineId,
          metadata: { stageOrders },
        });

        res.json({ success: true });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  // Leads
  app.post(
    "/api/organizations/:organizationId/leads",
    requireAuth,
    requireOrgAccess,
    async (req, res) => {
      try {
        const { organizationId } = req.params;
        const leadData = insertLeadSchema.parse({
          ...req.body,
          orgId: organizationId,
        });

        if (!["admin", "editor"].includes(req.orgMember.role)) {
          return res.status(403).json({ error: "Insufficient permissions" });
        }

        // Verify stage access
        const stage = await storage.getStage(leadData.stageId, organizationId);
        if (!stage) {
          return res.status(404).json({ error: "Stage not found" });
        }

        const lead = await storage.createLead(leadData);

        await storage.createAuditLog({
          orgId: organizationId,
          actorId: req.session.userId!,
          action: "create",
          entity: "lead",
          entityId: lead.id,
          metadata: {
            name: lead.name,
            email: lead.email,
            stageId: lead.stageId,
          },
        });

        res.json(lead);
      } catch (error: any) {
        res.status(400).json({ error: error.message });
      }
    }
  );

  app.get(
    "/api/organizations/:organizationId/leads/:leadId",
    requireAuth,
    requireOrgAccess,
    async (req, res) => {
      try {
        const { organizationId, leadId } = req.params;

        const lead = await storage.getLead(leadId, organizationId);
        if (!lead) {
          return res.status(404).json({ error: "Lead not found" });
        }

        const comments = await storage.getLeadComments(leadId, organizationId);

        res.json({ lead, comments });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  app.put(
    "/api/organizations/:organizationId/leads/:leadId",
    requireAuth,
    requireOrgAccess,
    async (req, res) => {
      try {
        const { organizationId, leadId } = req.params;
        const updates = req.body;

        if (!["admin", "editor"].includes(req.orgMember.role)) {
          return res.status(403).json({ error: "Insufficient permissions" });
        }

        const lead = await storage.updateLead(leadId, organizationId, updates);

        await storage.createAuditLog({
          orgId: organizationId,
          actorId: req.session.userId!,
          action: "update",
          entity: "lead",
          entityId: lead.id,
          metadata: { updates },
        });

        res.json(lead);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  app.delete(
    "/api/organizations/:organizationId/leads/:leadId",
    requireAuth,
    requireOrgAccess,
    async (req, res) => {
      try {
        const { organizationId, leadId } = req.params;

        if (!["admin", "editor"].includes(req.orgMember.role)) {
          return res.status(403).json({ error: "Insufficient permissions" });
        }

        await storage.deleteLead(leadId, organizationId);

        await storage.createAuditLog({
          orgId: organizationId,
          actorId: req.session.userId!,
          action: "delete",
          entity: "lead",
          entityId: leadId,
          metadata: {},
        });

        res.json({ success: true });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  app.post(
    "/api/organizations/:organizationId/leads/:leadId/move",
    requireAuth,
    requireOrgAccess,
    async (req, res) => {
      try {
        const { organizationId, leadId } = req.params;
        const { stageId } = req.body;

        if (!["admin", "editor"].includes(req.orgMember.role)) {
          return res.status(403).json({ error: "Insufficient permissions" });
        }

        // Verify stage access
        const stage = await storage.getStage(stageId, organizationId);
        if (!stage) {
          return res.status(404).json({ error: "Stage not found" });
        }

        const lead = await storage.moveLeadToStage(
          leadId,
          stageId,
          organizationId
        );

        await storage.createAuditLog({
          orgId: organizationId,
          actorId: req.session.userId!,
          action: "move",
          entity: "lead",
          entityId: lead.id,
          metadata: { newStageId: stageId, stageName: stage.name },
        });

        res.json(lead);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  // Lead Comments
  app.post(
    "/api/organizations/:organizationId/leads/:leadId/comments",
    requireAuth,
    requireOrgAccess,
    async (req, res) => {
      try {
        const { organizationId, leadId } = req.params;
        const { body } = req.body;

        // Extract @username mentions
        const mentionRegex = /@(\w+)/g;
        const mentions = [];
        let match;
        while ((match = mentionRegex.exec(body)) !== null) {
          mentions.push(match[1]);
        }

        // Find mentioned users in organization
        const mentionedUserIds = [];
        if (mentions.length > 0) {
          const orgMembers = await storage.getOrgMembers(organizationId);
          const membersByUsername = new Map(
            orgMembers.map((m) => [
              m.user.name.toLowerCase().replace(/\s+/g, ""),
              m.user.id,
            ])
          );

          for (const mention of mentions) {
            const userId = membersByUsername.get(mention.toLowerCase());
            if (userId && userId !== req.session.userId) {
              mentionedUserIds.push(userId);
            }
          }
        }

        const commentData = insertLeadCommentSchema.parse({
          orgId: organizationId,
          leadId,
          body,
          userId: req.session.userId!,
          mentionedUserIds:
            mentionedUserIds.length > 0 ? mentionedUserIds : null,
        });

        const comment = await storage.createLeadComment(commentData);

        // Send email notifications for mentions (webhook simulation)
        if (mentionedUserIds.length > 0) {
          const lead = await storage.getLead(leadId, organizationId);
          const user = await storage.getUserById(req.session.userId!);

          for (const mentionedUserId of mentionedUserIds) {
            const mentionedUser = await storage.getUserById(mentionedUserId);
            if (mentionedUser) {
              // In a real implementation, this would send an actual email
              console.log(
                `Email notification: ${user?.name} mentioned ${mentionedUser.name} in lead "${lead?.name}"`
              );

              await storage.createAuditLog({
                orgId: organizationId,
                actorId: req.session.userId!,
                action: "mention",
                entity: "user",
                entityId: mentionedUserId,
                metadata: {
                  leadId,
                  leadName: lead?.name,
                  commentBody: body,
                  mentionedUserEmail: mentionedUser.email,
                },
              });
            }
          }
        }

        await storage.createAuditLog({
          orgId: organizationId,
          actorId: req.session.userId!,
          action: "create",
          entity: "comment",
          entityId: comment.id,
          metadata: { leadId, body: body.substring(0, 100) },
        });

        res.json(comment);
      } catch (error: any) {
        res.status(400).json({ error: error.message });
      }
    }
  );

  app.delete(
    "/api/organizations/:organizationId/leads/:leadId/comments/:commentId",
    requireAuth,
    requireOrgAccess,
    async (req, res) => {
      try {
        const { organizationId, leadId, commentId } = req.params;

        // Only allow comment author or admin to delete
        const comments = await storage.getLeadComments(leadId, organizationId);
        const comment = comments.find((c) => c.id === commentId);

        if (!comment) {
          return res.status(404).json({ error: "Comment not found" });
        }

        if (
          comment.userId !== req.session.userId &&
          req.orgMember.role !== "admin"
        ) {
          return res
            .status(403)
            .json({ error: "Can only delete your own comments" });
        }

        await storage.deleteLeadComment(commentId, organizationId);

        await storage.createAuditLog({
          orgId: organizationId,
          actorId: req.session.userId!,
          action: "delete",
          entity: "comment",
          entityId: commentId,
          metadata: { leadId },
        });

        res.json({ success: true });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  // Airtable Integration for Pipelines
  app.post(
    "/api/organizations/:organizationId/airtable/sync",
    requireAuth,
    requireOrgAccess,
    async (req, res) => {
      try {
        const { organizationId } = req.params;
        const { direction = "both" } = req.body; // 'push', 'pull', or 'both'

        if (req.orgMember.role !== "admin") {
          return res.status(403).json({ error: "Admin access required" });
        }

        // Get Airtable settings
        const baseIdSetting = await storage.getSetting(
          organizationId,
          "airtable.baseId"
        );
        const apiKeySetting = await storage.getSetting(
          organizationId,
          "airtable.apiKey"
        );

        if (!baseIdSetting || !apiKeySetting) {
          return res
            .status(400)
            .json({ error: "Airtable configuration incomplete" });
        }

        // Mock sync operation - in reality this would interact with Airtable API
        const leads = await storage.getLeadsByPipeline("", organizationId); // Get all leads
        const stages = await storage.getPipelines(organizationId);

        let syncedLeads = 0;
        let syncedStages = 0;

        if (direction === "push" || direction === "both") {
          // Mock push to Airtable
          syncedLeads = leads.length;
          syncedStages = stages.length;
        }

        if (direction === "pull" || direction === "both") {
          // Mock pull from Airtable - would create/update leads and stages
          // For now, just simulate some updates
        }

        await storage.createAuditLog({
          orgId: organizationId,
          actorId: req.session.userId!,
          action: "sync",
          entity: "airtable",
          entityId: null,
          metadata: { direction, syncedLeads, syncedStages },
        });

        res.json({
          success: true,
          syncedLeads,
          syncedStages,
          direction,
          timestamp: new Date().toISOString(),
        });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  // Test Airtable integration
  app.post(
    "/api/organizations/:organizationId/airtable/test",
    requireAuth,
    requireOrgAccess,
    async (req, res) => {
      try {
        const { organizationId } = req.params;
        const airtableKey = req.body.apiKey || process.env.AIRTABLE_API_KEY;
        const baseId = req.body.baseId;

        if (!airtableKey || !baseId) {
          return res
            .status(400)
            .json({ error: "API key and base ID required" });
        }

        // Test connection (mock for now)
        await new Promise((resolve) => setTimeout(resolve, 1000));

        const tables = [
          {
            id: "tblLeads1",
            name: "Leads",
            fields: ["Name", "Email", "Status", "Stage"],
          },
          {
            id: "tblStages1",
            name: "Stages",
            fields: ["Name", "Order", "Pipeline"],
          },
        ];

        await storage.setSetting({
          orgId: organizationId,
          key: "airtable.baseId",
          value: baseId,
          updatedBy: req.session.userId!,
        });

        if (req.body.apiKey) {
          await storage.setSetting({
            orgId: organizationId,
            key: "airtable.apiKey",
            value: airtableKey,
            updatedBy: req.session.userId!,
          });
        }

        res.json({ tables });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  const httpServer = createServer(app);
  return httpServer;
}
