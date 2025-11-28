#!/bin/bash
# =============================================================================
# BarkBase CDK Deployment Script for Unix/Linux/MacOS
# =============================================================================
# 
# This script deploys all BarkBase CDK stacks to AWS.
# 
# Prerequisites:
#   - AWS CLI configured with valid credentials
#   - Node.js 20.x or later
#   - CDK dependencies installed (npm install)
#   - Layer dependencies installed
#
# Usage:
#   ./scripts/deploy.sh dev    # Deploy development environment
#   ./scripts/deploy.sh prod   # Deploy production environment
#
# =============================================================================

set -e

ENV=${1:-dev}

if [[ "$ENV" != "dev" && "$ENV" != "prod" ]]; then
    echo "Usage: $0 [dev|prod]"
    exit 1
fi

echo ""
echo "========================================"
echo " BarkBase CDK Deployment"
echo "========================================"
echo ""
echo "Environment: $ENV"
echo ""

# Change to CDK directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CDK_DIR="$(dirname "$SCRIPT_DIR")"
cd "$CDK_DIR"

# Verify AWS credentials
echo "Checking AWS credentials..."
if ! aws sts get-caller-identity > /dev/null 2>&1; then
    echo "ERROR: AWS credentials not configured or invalid"
    echo "Run 'aws configure' to set up credentials"
    exit 1
fi
echo "AWS Account: $(aws sts get-caller-identity --query Account --output text)"
echo ""

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing CDK dependencies..."
    npm install
fi

# Install layer dependencies
if [ ! -d "../layers/db-layer/nodejs/node_modules" ]; then
    echo "Installing db-layer dependencies..."
    (cd ../layers/db-layer/nodejs && npm install)
fi

if [ ! -d "../layers/shared-layer/nodejs/node_modules" ]; then
    echo "Installing shared-layer dependencies..."
    (cd ../layers/shared-layer/nodejs && npm install)
fi

# Build TypeScript
echo "Building CDK..."
npm run build

# Bootstrap CDK (if needed)
echo "Checking CDK bootstrap status..."
if ! aws cloudformation describe-stacks --stack-name CDKToolkit > /dev/null 2>&1; then
    echo "Bootstrapping CDK..."
    npx cdk bootstrap
fi

# Deploy all stacks
echo ""
echo "Deploying stacks..."
echo ""

npx cdk deploy --all -c env=$ENV --require-approval never --outputs-file outputs-$ENV.json

echo ""
echo "========================================"
echo " Deployment Successful!"
echo "========================================"
echo ""

# Generate environment files
echo "Generating environment files..."
npx ts-node scripts/generate-env.ts $ENV

echo ""
echo "Next steps:"
echo "  1. Copy frontend/.env.$ENV to frontend/.env.local"
echo "  2. Copy backend/.env.$ENV to backend/.env"
echo "  3. Run 'npm run dev' in frontend directory"
echo ""

