# Multi-Tenant SaaS Starter

## Overview

This is a production-ready multi-tenant SaaS application built with a modern tech stack. The application provides comprehensive organization management, role-based access control, subscription billing, and external integrations. It features a React/TypeScript frontend with an Express.js backend, using PostgreSQL for data persistence and integrating with Stripe for payments and Airtable for data synchronization.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript and Vite for fast development
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query for server state management and caching
- **Authentication**: Context-based auth provider with session management

### Backend Architecture
- **Framework**: Express.js with TypeScript for type safety
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Authentication**: Session-based authentication with express-session
- **API Design**: RESTful endpoints with consistent error handling
- **Middleware**: Custom logging, authentication, and organization access control

### Database Design
- **Multi-tenancy**: Organization-based data isolation using foreign keys
- **Core Tables**: Users, organizations, org_members, api_keys, settings, subscriptions, audit_logs
- **Role-Based Access**: Admin, editor, and viewer roles with hierarchical permissions
- **Audit Trail**: Comprehensive logging of all organizational activities

### Authentication & Authorization
- **Session Management**: Server-side sessions with PostgreSQL storage
- **Role-Based Access Control**: Three-tier permission system (admin/editor/viewer)
- **Organization Context**: All operations scoped to current organization
- **API Key Authentication**: Generate and manage API keys for external access

### Subscription & Billing Architecture
- **Plans**: Three-tier system (Free, Pro, Team) with different limits
- **Usage Tracking**: Real-time monitoring of operations, members, and resources
- **Stripe Integration**: Automated subscription management and webhook handling
- **Plan Limits**: Enforced limits on members, operations, and integrations

### Multi-Tenant Data Architecture
- **Organization Isolation**: All domain data scoped by organization ID
- **Resource Limits**: Per-plan restrictions on members, operations, and features
- **Settings System**: Flexible key-value configuration per organization
- **Audit Logging**: Complete activity tracking for compliance and debugging

## External Dependencies

### Payment Processing
- **Stripe**: Subscription billing, checkout sessions, and customer portal
- **Webhooks**: Real-time subscription status updates
- **Plans**: Free ($0), Pro ($29/month), Team ($99/month)

### Database
- **PostgreSQL**: Primary data store with connection pooling
- **Drizzle ORM**: Type-safe database operations and migrations
- **Session Store**: PostgreSQL-based session persistence

### External Integrations
- **Airtable API**: Per-organization base and table configuration
- **API Key Management**: Secure external access with rate limiting
- **Settings Configuration**: Flexible integration parameters per organization

### Development Tools
- **Vite**: Fast development server and build tool
- **TypeScript**: Full type safety across frontend and backend
- **Tailwind CSS**: Utility-first styling with design system
- **TanStack Query**: Server state management and caching

### Deployment & Monitoring
- **Replit**: Hosting platform with scheduled job support
- **Environment Variables**: Secure configuration management
- **Logging**: Structured request/response logging
- **Error Handling**: Centralized error management with proper HTTP status codes