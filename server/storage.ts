import { type User, type InsertUser, type Organization, type InsertOrganization, type OrgMember, type InsertOrgMember, type ApiKey, type InsertApiKey, type Setting, type InsertSetting, type AuditLog, type InsertAuditLog, type AuthUser, type UserWithOrganizations, type Subscription, type Pipeline, type InsertPipeline, type Stage, type InsertStage, type Lead, type InsertLead, type LeadComment, type InsertLeadComment } from "@shared/schema";
import { randomUUID } from "crypto";
import bcrypt from "bcrypt";

export interface IStorage {
  // Auth
  createUser(user: InsertUser): Promise<User>;
  getUserById(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  verifyPassword(email: string, password: string): Promise<User | undefined>;
  getUserWithOrganizations(userId: string): Promise<UserWithOrganizations | undefined>;
  
  // Organizations
  createOrganization(org: InsertOrganization, ownerId: string): Promise<Organization>;
  getOrganization(id: string): Promise<Organization | undefined>;
  getOrganizationsByUser(userId: string): Promise<Organization[]>;
  updateOrganization(id: string, updates: Partial<Organization>): Promise<Organization>;
  
  // Organization Members
  addOrgMember(member: InsertOrgMember): Promise<OrgMember>;
  getOrgMembers(orgId: string): Promise<(OrgMember & { user: Pick<User, 'id' | 'name' | 'email'> })[]>;
  getOrgMember(orgId: string, userId: string): Promise<OrgMember | undefined>;
  updateOrgMemberRole(orgId: string, userId: string, role: string): Promise<OrgMember>;
  removeOrgMember(orgId: string, userId: string): Promise<void>;
  
  // API Keys
  createApiKey(apiKey: InsertApiKey & { keyHash: string; keyPreview: string }): Promise<ApiKey>;
  getApiKeys(orgId: string): Promise<ApiKey[]>;
  getApiKeyByHash(keyHash: string): Promise<(ApiKey & { organization: Organization }) | undefined>;
  deleteApiKey(id: string, orgId: string): Promise<void>;
  
  // Settings
  setSetting(setting: InsertSetting): Promise<Setting>;
  getSetting(orgId: string, key: string): Promise<Setting | undefined>;
  getSettings(orgId: string): Promise<Setting[]>;
  
  // Subscriptions
  updateSubscription(orgId: string, subscription: Partial<Subscription>): Promise<Subscription>;
  getSubscription(orgId: string): Promise<Subscription | undefined>;
  
  // Audit Logs
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
  getAuditLogs(orgId: string, limit?: number): Promise<AuditLog[]>;
  
  // Pipelines
  createPipeline(pipeline: InsertPipeline): Promise<Pipeline>;
  getPipelines(orgId: string): Promise<Pipeline[]>;
  getPipeline(id: string, orgId: string): Promise<Pipeline | undefined>;
  updatePipeline(id: string, orgId: string, updates: Partial<Pipeline>): Promise<Pipeline>;
  deletePipeline(id: string, orgId: string): Promise<void>;
  
  // Stages
  createStage(stage: InsertStage): Promise<Stage>;
  getStages(pipelineId: string, orgId: string): Promise<Stage[]>;
  getStage(id: string, orgId: string): Promise<Stage | undefined>;
  updateStage(id: string, orgId: string, updates: Partial<Stage>): Promise<Stage>;
  deleteStage(id: string, orgId: string): Promise<void>;
  reorderStages(pipelineId: string, orgId: string, stageOrders: { id: string; order: number }[]): Promise<void>;
  
  // Leads
  createLead(lead: InsertLead): Promise<Lead>;
  getLeads(stageId: string, orgId: string): Promise<Lead[]>;
  getLeadsByPipeline(pipelineId: string, orgId: string): Promise<(Lead & { stageName: string; stageOrder: number })[]>;
  getLead(id: string, orgId: string): Promise<Lead | undefined>;
  updateLead(id: string, orgId: string, updates: Partial<Lead>): Promise<Lead>;
  deleteLead(id: string, orgId: string): Promise<void>;
  moveLeadToStage(leadId: string, stageId: string, orgId: string): Promise<Lead>;
  
  // Lead Comments
  createLeadComment(comment: InsertLeadComment): Promise<LeadComment>;
  getLeadComments(leadId: string, orgId: string): Promise<(LeadComment & { user: Pick<User, 'id' | 'name'> })[]>;
  deleteLeadComment(id: string, orgId: string): Promise<void>;
  
  // Stats
  getOrganizationStats(orgId: string): Promise<{
    members: number;
    operations: number;
    tables: number;
    apiKeys: number;
    pipelines: number;
    leads: number;
  }>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User> = new Map();
  private organizations: Map<string, Organization> = new Map();
  private orgMembers: Map<string, OrgMember> = new Map();
  private apiKeys: Map<string, ApiKey> = new Map();
  private settings: Map<string, Setting> = new Map();
  private subscriptions: Map<string, Subscription> = new Map();
  private auditLogs: AuditLog[] = [];
  private pipelines: Map<string, Pipeline> = new Map();
  private stages: Map<string, Stage> = new Map();
  private leads: Map<string, Lead> = new Map();
  private leadComments: Map<string, LeadComment> = new Map();

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const passwordHash = await bcrypt.hash(insertUser.passwordHash, 10);
    const user: User = { 
      ...insertUser, 
      id, 
      passwordHash,
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      createdAt: new Date()
    };
    this.users.set(id, user);
    return user;
  }

  async getUserById(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async verifyPassword(email: string, password: string): Promise<User | undefined> {
    const user = await this.getUserByEmail(email);
    if (!user) return undefined;
    
    const isValid = await bcrypt.compare(password, user.passwordHash);
    return isValid ? user : undefined;
  }

  async getUserWithOrganizations(userId: string): Promise<UserWithOrganizations | undefined> {
    const user = await this.getUserById(userId);
    if (!user) return undefined;

    const organizations = await this.getOrganizationsByUser(userId);
    const orgsWithRoles = organizations.map(org => {
      const membership = Array.from(this.orgMembers.values())
        .find(m => m.orgId === org.id && m.userId === userId);
      return { ...org, role: membership?.role || 'owner' };
    });

    return { ...user, organizations: orgsWithRoles };
  }

  async createOrganization(insertOrg: InsertOrganization, ownerId: string): Promise<Organization> {
    const id = randomUUID();
    const org: Organization = {
      ...insertOrg,
      id,
      ownerId,
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      plan: insertOrg.plan || 'free',
      trialEnd: null,
      createdAt: new Date()
    };
    this.organizations.set(id, org);

    // Add owner as admin member
    await this.addOrgMember({
      orgId: id,
      userId: ownerId,
      role: 'admin',
      invitedBy: ownerId,
      acceptedAt: new Date()
    });

    // Create default subscription
    this.subscriptions.set(id, {
      orgId: id,
      plan: 'free',
      status: 'active',
      periodEnd: null,
      metered: {},
      updatedAt: new Date()
    });

    return org;
  }

  async getOrganization(id: string): Promise<Organization | undefined> {
    return this.organizations.get(id);
  }

  async getOrganizationsByUser(userId: string): Promise<Organization[]> {
    const userMemberships = Array.from(this.orgMembers.values())
      .filter(m => m.userId === userId);
    
    return userMemberships
      .map(m => this.organizations.get(m.orgId))
      .filter((org): org is Organization => org !== undefined);
  }

  async updateOrganization(id: string, updates: Partial<Organization>): Promise<Organization> {
    const org = this.organizations.get(id);
    if (!org) throw new Error('Organization not found');
    
    const updated = { ...org, ...updates };
    this.organizations.set(id, updated);
    return updated;
  }

  async addOrgMember(insertMember: InsertOrgMember): Promise<OrgMember> {
    const key = `${insertMember.orgId}-${insertMember.userId}`;
    const member: OrgMember = {
      ...insertMember,
      invitedBy: insertMember.invitedBy || null,
      invitedAt: new Date(),
      acceptedAt: insertMember.acceptedAt || null,
      createdAt: new Date()
    };
    this.orgMembers.set(key, member);
    return member;
  }

  async getOrgMembers(orgId: string): Promise<(OrgMember & { user: Pick<User, 'id' | 'name' | 'email'> })[]> {
    const members = Array.from(this.orgMembers.values())
      .filter(m => m.orgId === orgId);
    
    return members.map(member => {
      const user = this.users.get(member.userId);
      return {
        ...member,
        user: {
          id: user?.id || '',
          name: user?.name || '',
          email: user?.email || ''
        }
      };
    });
  }

  async getOrgMember(orgId: string, userId: string): Promise<OrgMember | undefined> {
    const key = `${orgId}-${userId}`;
    return this.orgMembers.get(key);
  }

  async updateOrgMemberRole(orgId: string, userId: string, role: string): Promise<OrgMember> {
    const key = `${orgId}-${userId}`;
    const member = this.orgMembers.get(key);
    if (!member) throw new Error('Member not found');
    
    const updated = { ...member, role };
    this.orgMembers.set(key, updated);
    return updated;
  }

  async removeOrgMember(orgId: string, userId: string): Promise<void> {
    const key = `${orgId}-${userId}`;
    this.orgMembers.delete(key);
  }

  async createApiKey(apiKey: InsertApiKey & { keyHash: string; keyPreview: string }): Promise<ApiKey> {
    const id = randomUUID();
    const key: ApiKey = {
      ...apiKey,
      id,
      lastUsedAt: null,
      createdAt: new Date()
    };
    this.apiKeys.set(id, key);
    return key;
  }

  async getApiKeys(orgId: string): Promise<ApiKey[]> {
    return Array.from(this.apiKeys.values())
      .filter(key => key.orgId === orgId);
  }

  async getApiKeyByHash(keyHash: string): Promise<(ApiKey & { organization: Organization }) | undefined> {
    const apiKey = Array.from(this.apiKeys.values())
      .find(key => key.keyHash === keyHash);
    
    if (!apiKey) return undefined;
    
    const organization = this.organizations.get(apiKey.orgId);
    if (!organization) return undefined;
    
    return { ...apiKey, organization };
  }

  async deleteApiKey(id: string, orgId: string): Promise<void> {
    const key = this.apiKeys.get(id);
    if (key && key.orgId === orgId) {
      this.apiKeys.delete(id);
    }
  }

  async setSetting(insertSetting: InsertSetting): Promise<Setting> {
    const key = `${insertSetting.orgId}-${insertSetting.key}`;
    const setting: Setting = {
      ...insertSetting,
      updatedAt: new Date()
    };
    this.settings.set(key, setting);
    return setting;
  }

  async getSetting(orgId: string, key: string): Promise<Setting | undefined> {
    const settingKey = `${orgId}-${key}`;
    return this.settings.get(settingKey);
  }

  async getSettings(orgId: string): Promise<Setting[]> {
    return Array.from(this.settings.values())
      .filter(setting => setting.orgId === orgId);
  }

  async updateSubscription(orgId: string, updates: Partial<Subscription>): Promise<Subscription> {
    const existing = this.subscriptions.get(orgId);
    const subscription: Subscription = {
      orgId,
      plan: 'free',
      status: 'active',
      periodEnd: null,
      metered: {},
      updatedAt: new Date(),
      ...existing,
      ...updates
    };
    this.subscriptions.set(orgId, subscription);
    return subscription;
  }

  async getSubscription(orgId: string): Promise<Subscription | undefined> {
    return this.subscriptions.get(orgId);
  }

  async createAuditLog(insertLog: InsertAuditLog): Promise<AuditLog> {
    const log: AuditLog = {
      ...insertLog,
      id: this.auditLogs.length + 1,
      actorId: insertLog.actorId || null,
      entityId: insertLog.entityId || null,
      metadata: insertLog.metadata || {},
      createdAt: new Date()
    };
    this.auditLogs.push(log);
    return log;
  }

  async getAuditLogs(orgId: string, limit: number = 50): Promise<AuditLog[]> {
    return this.auditLogs
      .filter(log => log.orgId === orgId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  // Pipeline Methods
  async createPipeline(insertPipeline: InsertPipeline): Promise<Pipeline> {
    const id = randomUUID();
    const pipeline: Pipeline = {
      ...insertPipeline,
      id,
      createdAt: new Date()
    };
    this.pipelines.set(id, pipeline);
    return pipeline;
  }

  async getPipelines(orgId: string): Promise<Pipeline[]> {
    return Array.from(this.pipelines.values())
      .filter(p => p.orgId === orgId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  async getPipeline(id: string, orgId: string): Promise<Pipeline | undefined> {
    const pipeline = this.pipelines.get(id);
    return pipeline?.orgId === orgId ? pipeline : undefined;
  }

  async updatePipeline(id: string, orgId: string, updates: Partial<Pipeline>): Promise<Pipeline> {
    const pipeline = await this.getPipeline(id, orgId);
    if (!pipeline) throw new Error('Pipeline not found');
    
    const updated = { ...pipeline, ...updates };
    this.pipelines.set(id, updated);
    return updated;
  }

  async deletePipeline(id: string, orgId: string): Promise<void> {
    const pipeline = await this.getPipeline(id, orgId);
    if (!pipeline) return;
    
    // Delete all stages and leads in this pipeline
    const stages = await this.getStages(id, orgId);
    for (const stage of stages) {
      await this.deleteStage(stage.id, orgId);
    }
    
    this.pipelines.delete(id);
  }

  // Stage Methods
  async createStage(insertStage: InsertStage): Promise<Stage> {
    const id = randomUUID();
    const stage: Stage = {
      ...insertStage,
      id,
      createdAt: new Date()
    };
    this.stages.set(id, stage);
    return stage;
  }

  async getStages(pipelineId: string, orgId: string): Promise<Stage[]> {
    return Array.from(this.stages.values())
      .filter(s => s.pipelineId === pipelineId && s.orgId === orgId)
      .sort((a, b) => a.order - b.order);
  }

  async getStage(id: string, orgId: string): Promise<Stage | undefined> {
    const stage = this.stages.get(id);
    return stage?.orgId === orgId ? stage : undefined;
  }

  async updateStage(id: string, orgId: string, updates: Partial<Stage>): Promise<Stage> {
    const stage = await this.getStage(id, orgId);
    if (!stage) throw new Error('Stage not found');
    
    const updated = { ...stage, ...updates };
    this.stages.set(id, updated);
    return updated;
  }

  async deleteStage(id: string, orgId: string): Promise<void> {
    const stage = await this.getStage(id, orgId);
    if (!stage) return;
    
    // Delete all leads in this stage
    const leads = await this.getLeads(id, orgId);
    for (const lead of leads) {
      await this.deleteLead(lead.id, orgId);
    }
    
    this.stages.delete(id);
  }

  async reorderStages(pipelineId: string, orgId: string, stageOrders: { id: string; order: number }[]): Promise<void> {
    for (const { id, order } of stageOrders) {
      await this.updateStage(id, orgId, { order });
    }
  }

  // Lead Methods
  async createLead(insertLead: InsertLead): Promise<Lead> {
    const id = randomUUID();
    const lead: Lead = {
      ...insertLead,
      id,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.leads.set(id, lead);
    return lead;
  }

  async getLeads(stageId: string, orgId: string): Promise<Lead[]> {
    return Array.from(this.leads.values())
      .filter(l => l.stageId === stageId && l.orgId === orgId)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  async getLeadsByPipeline(pipelineId: string, orgId: string): Promise<(Lead & { stageName: string; stageOrder: number })[]> {
    const stages = await this.getStages(pipelineId, orgId);
    const stageMap = new Map(stages.map(s => [s.id, { name: s.name, order: s.order }]));
    
    const leads = Array.from(this.leads.values())
      .filter(l => l.orgId === orgId && stageMap.has(l.stageId))
      .map(lead => {
        const stageInfo = stageMap.get(lead.stageId)!;
        return {
          ...lead,
          stageName: stageInfo.name,
          stageOrder: stageInfo.order
        };
      })
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    
    return leads;
  }

  async getLead(id: string, orgId: string): Promise<Lead | undefined> {
    const lead = this.leads.get(id);
    return lead?.orgId === orgId ? lead : undefined;
  }

  async updateLead(id: string, orgId: string, updates: Partial<Lead>): Promise<Lead> {
    const lead = await this.getLead(id, orgId);
    if (!lead) throw new Error('Lead not found');
    
    const updated = { ...lead, ...updates, updatedAt: new Date() };
    this.leads.set(id, updated);
    return updated;
  }

  async deleteLead(id: string, orgId: string): Promise<void> {
    const lead = await this.getLead(id, orgId);
    if (!lead) return;
    
    // Delete all comments for this lead
    const comments = await this.getLeadComments(id, orgId);
    for (const comment of comments) {
      await this.deleteLeadComment(comment.id, orgId);
    }
    
    this.leads.delete(id);
  }

  async moveLeadToStage(leadId: string, stageId: string, orgId: string): Promise<Lead> {
    return await this.updateLead(leadId, orgId, { stageId });
  }

  // Lead Comment Methods
  async createLeadComment(insertComment: InsertLeadComment): Promise<LeadComment> {
    const id = randomUUID();
    const comment: LeadComment = {
      ...insertComment,
      id,
      createdAt: new Date()
    };
    this.leadComments.set(id, comment);
    return comment;
  }

  async getLeadComments(leadId: string, orgId: string): Promise<(LeadComment & { user: Pick<User, 'id' | 'name'> })[]> {
    const comments = Array.from(this.leadComments.values())
      .filter(c => c.leadId === leadId && c.orgId === orgId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    
    return comments.map(comment => {
      const user = this.users.get(comment.userId);
      return {
        ...comment,
        user: {
          id: user?.id || '',
          name: user?.name || 'Unknown User'
        }
      };
    });
  }

  async deleteLeadComment(id: string, orgId: string): Promise<void> {
    const comment = this.leadComments.get(id);
    if (comment?.orgId === orgId) {
      this.leadComments.delete(id);
    }
  }

  async getOrganizationStats(orgId: string): Promise<{
    members: number;
    operations: number;
    tables: number;
    apiKeys: number;
    pipelines: number;
    leads: number;
  }> {
    const members = Array.from(this.orgMembers.values())
      .filter(m => m.orgId === orgId).length;
    
    const apiKeys = Array.from(this.apiKeys.values())
      .filter(k => k.orgId === orgId).length;
    
    const pipelines = Array.from(this.pipelines.values())
      .filter(p => p.orgId === orgId).length;
    
    const leads = Array.from(this.leads.values())
      .filter(l => l.orgId === orgId).length;
    
    const subscription = this.subscriptions.get(orgId);
    const metered = subscription?.metered as { operations?: number; tables?: number } || {};
    
    return {
      members,
      operations: metered.operations || 0,
      tables: metered.tables || 0,
      apiKeys,
      pipelines,
      leads
    };
  }
}

export const storage = new MemStorage();
