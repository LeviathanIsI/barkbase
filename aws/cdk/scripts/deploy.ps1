# =============================================================================
# BarkBase CDK Deployment Script for Windows PowerShell
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
#   .\scripts\deploy.ps1 dev    # Deploy development environment
#   .\scripts\deploy.ps1 prod   # Deploy production environment
#
# =============================================================================

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("dev", "prod")]
    [string]$Environment = "dev"
)

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " BarkBase CDK Deployment" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Environment: $Environment" -ForegroundColor Yellow
Write-Host ""

# Change to CDK directory
$cdkDir = Split-Path -Parent $PSScriptRoot
Push-Location $cdkDir

try {
    # Verify AWS credentials
    Write-Host "Checking AWS credentials..." -ForegroundColor White
    $identity = aws sts get-caller-identity 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: AWS credentials not configured or invalid" -ForegroundColor Red
        Write-Host "Run 'aws configure' to set up credentials" -ForegroundColor Yellow
        exit 1
    }
    Write-Host "AWS Account: $(($identity | ConvertFrom-Json).Account)" -ForegroundColor Green
    Write-Host ""

    # Install dependencies if needed
    if (-not (Test-Path "node_modules")) {
        Write-Host "Installing CDK dependencies..." -ForegroundColor White
        npm install
    }

    # Install layer dependencies
    $dbLayerPath = "../layers/db-layer/nodejs"
    if (-not (Test-Path "$dbLayerPath/node_modules")) {
        Write-Host "Installing db-layer dependencies..." -ForegroundColor White
        Push-Location $dbLayerPath
        npm install
        Pop-Location
    }

    $sharedLayerPath = "../layers/shared-layer/nodejs"
    if (-not (Test-Path "$sharedLayerPath/node_modules")) {
        Write-Host "Installing shared-layer dependencies..." -ForegroundColor White
        Push-Location $sharedLayerPath
        npm install
        Pop-Location
    }

    # Build TypeScript
    Write-Host "Building CDK..." -ForegroundColor White
    npm run build
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: CDK build failed" -ForegroundColor Red
        exit 1
    }

    # Bootstrap CDK (if needed)
    Write-Host "Checking CDK bootstrap status..." -ForegroundColor White
    $bootstrapStackName = "CDKToolkit"
    $bootstrapCheck = aws cloudformation describe-stacks --stack-name $bootstrapStackName 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Bootstrapping CDK..." -ForegroundColor Yellow
        npx cdk bootstrap
        if ($LASTEXITCODE -ne 0) {
            Write-Host "ERROR: CDK bootstrap failed" -ForegroundColor Red
            exit 1
        }
    } else {
        Write-Host "CDK already bootstrapped" -ForegroundColor Green
    }

    # Deploy all stacks
    Write-Host ""
    Write-Host "Deploying stacks..." -ForegroundColor Cyan
    Write-Host ""

    npx cdk deploy --all -c env=$Environment --require-approval never --outputs-file outputs-$Environment.json

    if ($LASTEXITCODE -ne 0) {
        Write-Host ""
        Write-Host "ERROR: Deployment failed" -ForegroundColor Red
        exit 1
    }

    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host " Deployment Successful!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""

    # Generate environment files
    Write-Host "Generating environment files..." -ForegroundColor White
    npx ts-node scripts/generate-env.ts $Environment

    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "  1. Copy frontend/.env.$Environment to frontend/.env.local" -ForegroundColor White
    Write-Host "  2. Copy backend/.env.$Environment to backend/.env" -ForegroundColor White
    Write-Host "  3. Run 'npm run dev' in frontend directory" -ForegroundColor White
    Write-Host ""

} finally {
    Pop-Location
}

