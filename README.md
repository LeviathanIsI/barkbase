# BarkBase

Modern kennel management software for pet care professionals.

---

## What is BarkBase

BarkBase is a B2B SaaS platform designed for kennels, veterinary clinics, and pet care facilities. It provides comprehensive tools for managing bookings, pets, customers, staff, and finances in a multi-tenant environment with enterprise-grade security.

---

## Features

- **Pet and Owner Management** - Complete pet profiles with vaccination tracking, owner records, and pet-owner relationships
- **Booking and Reservations** - Calendar views, conflict detection, capacity tracking, check-in/check-out workflows
- **Kennel and Facility Management** - Room/run configuration, occupancy monitoring, real-time availability
- **Invoicing and Payments** - Invoice generation, payment processing, prepaid package management
- **Staff Management** - Role-based access control (RBAC), scheduling, task assignments
- **Automated Communications** - Email and SMS reminders for appointments and vaccinations
- **Customer Portal** - Online booking for pet owners with self-service account management
- **Reporting and Analytics** - Revenue reports, occupancy analytics, vaccination compliance
- **Multi-Tenant Architecture** - Complete data isolation with subscription tiers (Free/Pro/Enterprise)
- **White-Label Theming** - Custom branding, colors, and terminology per tenant

---

## Tech Stack

### Frontend
- React 19 with Vite
- Tailwind CSS
- TanStack Query (React Query)
- Zustand for state management
- React Router v7

### Backend
- AWS Lambda (Node.js)
- Amazon API Gateway with JWT authorization
- Amazon Cognito for authentication
- PostgreSQL on Amazon RDS

### Infrastructure
- AWS CDK (TypeScript)
- Amazon S3 for file storage
- Amazon CloudFront for CDN
- Amazon SES for email delivery

---

## Getting Started

### Prerequisites

- Node.js 18+
- AWS CLI configured with appropriate credentials
- PostgreSQL (local instance or RDS connection)
- AWS CDK CLI: `npm install -g aws-cdk`

### Local Development Setup

1. **Clone the repository**

```bash
git clone https://github.com/your-org/barkbase.git
cd barkbase
```

2. **Set up the frontend**

```bash
cd frontend
npm install
cp .env.example .env
# Configure environment variables (see Environment Variables section)
npm run dev
```

3. **Deploy backend infrastructure**

```bash
cd aws/cdk
npm install
cp .env.example .env
# Configure environment variables
cdk bootstrap  # First time only
cdk deploy
```

The frontend development server runs at `http://localhost:5173`.

---

## Project Structure

```
barkbase/
├── frontend/                # React application
│   ├── src/
│   │   ├── app/            # Router and providers
│   │   ├── components/     # Shared UI components
│   │   ├── features/       # Feature modules
│   │   ├── hooks/          # Custom hooks
│   │   ├── lib/            # API client, utilities
│   │   ├── stores/         # Zustand stores
│   │   └── styles/         # Global styles
│   └── package.json
├── aws/                     # Backend infrastructure
│   ├── cdk/                # AWS CDK stack
│   └── lambdas/            # Lambda functions
│       ├── auth-api/
│       ├── entity-service/
│       ├── operations-service/
│       ├── financial-service/
│       ├── analytics-service/
│       ├── config-service/
│       └── user-profile-service/
└── docs/                    # Documentation
```

---

## Environment Variables

### Frontend (`frontend/.env`)

```
VITE_API_URL=
VITE_AWS_REGION=
VITE_USER_POOL_ID=
VITE_CLIENT_ID=
VITE_COGNITO_DOMAIN=
VITE_REDIRECT_URI=
VITE_LOGOUT_URI=
```

### Backend (`aws/cdk/.env`)

```
STAGE=
JWT_SECRET=
DB_NAME=
DB_USER=
DB_HOST=
DB_PORT=
MONITORING_EMAIL=
```

---

## Deployment

### Deploy to AWS

```bash
cd aws/cdk

# Development
export STAGE=dev
cdk deploy

# Production
export STAGE=prod
cdk deploy
```

### Frontend Build

```bash
cd frontend
npm run build
```

The production build outputs to `frontend/dist/` and can be deployed to S3/CloudFront or any static hosting provider.

---

## License

Proprietary. All rights reserved.
