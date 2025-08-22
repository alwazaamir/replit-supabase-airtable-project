# Multi-Tenant SaaS Starter

A production-ready multi-tenant SaaS application built with Next.js, Supabase, Stripe, and Airtable integration.

## Features

- **Multi-tenant Architecture**: Complete organization and member management
- **Authentication**: Secure email/password authentication via Supabase
- **Role-Based Access Control**: Admin, Editor, and Viewer roles
- **Subscription Billing**: Stripe integration with Free, Pro, and Team plans
- **Airtable Integration**: Connect and sync data with Airtable bases
- **API Key Management**: Generate and manage API keys for external access
- **Audit Logging**: Track all organizational activities
- **Usage Monitoring**: Real-time usage tracking with plan limits

## Tech Stack

### Frontend
- React 18 with TypeScript
- Tailwind CSS + shadcn/ui components
- TanStack Query for data fetching
- Wouter for routing

### Backend
- Express.js with TypeScript
- Drizzle ORM with PostgreSQL
- Session-based authentication
- RESTful API design

### Services
- **Database**: PostgreSQL (via Supabase or direct connection)
- **Payments**: Stripe subscriptions and billing
- **External Data**: Airtable API integration
- **Email**: Postmark or Resend (optional)

## Quick Start

### 1. Clone and Install

```bash
git clone <repository-url>
cd saas-starter
npm install
