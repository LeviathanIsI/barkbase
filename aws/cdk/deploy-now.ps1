#!/usr/bin/env pwsh
# =============================================================================
# BarkBase Instant Deploy Script
# =============================================================================
# This script deploys all BarkBase CDK stacks in one command.
# 
# Usage:
#   .\deploy-now.ps1 -AccessKeyId "AKIAXXXX" -SecretKey "xxxxx"
#
# Or with environment variables already set:
#   $env:AWS_ACCESS_KEY_ID="AKIAXXXX"
#   $env:AWS_SECRET_ACCESS_KEY="xxxxx"
#   .\deploy-now.ps1
# =============================================================================

param(
    [string]$AccessKeyId,
    [string]$SecretKey,
    [string]$Region = "us-east-2"
)

$ErrorActionPreference = "Stop"

Write-Host "`n🚀 BarkBase CDK Deployment Script`n" -ForegroundColor Cyan

# Set credentials if provided
if ($AccessKeyId) {
    $env:AWS_ACCESS_KEY_ID = $AccessKeyId
    Write-Host "✓ Set AWS_ACCESS_KEY_ID" -ForegroundColor Green
}
if ($SecretKey) {
    $env:AWS_SECRET_ACCESS_KEY = $SecretKey
    Write-Host "✓ Set AWS_SECRET_ACCESS_KEY" -ForegroundColor Green
}
$env:AWS_DEFAULT_REGION = $Region
$env:AWS_REGION = $Region
Write-Host "✓ Set AWS_REGION to $Region" -ForegroundColor Green

# Verify credentials
Write-Host "`n📋 Verifying AWS credentials..." -ForegroundColor White
try {
    $identity = aws sts get-caller-identity 2>&1 | ConvertFrom-Json
    Write-Host "✓ Authenticated as: $($identity.Arn)" -ForegroundColor Green
    Write-Host "  Account: $($identity.Account)" -ForegroundColor Gray
} catch {
    Write-Host "`n❌ AWS credentials are invalid or missing!" -ForegroundColor Red
    Write-Host "`nTo get credentials:" -ForegroundColor Yellow
    Write-Host "  1. Go to: https://console.aws.amazon.com/iam" -ForegroundColor Gray
    Write-Host "  2. Navigate to: Users > Your User > Security credentials" -ForegroundColor Gray
    Write-Host "  3. Click 'Create access key'" -ForegroundColor Gray
    Write-Host "`nThen run:" -ForegroundColor Yellow
    Write-Host '  .\deploy-now.ps1 -AccessKeyId "AKIAXXXX" -SecretKey "xxxxx"' -ForegroundColor White
    exit 1
}

# Check if dependencies installed
if (-not (Test-Path "node_modules")) {
    Write-Host "`n📦 Installing CDK dependencies..." -ForegroundColor White
    npm install
}

# Build
Write-Host "`n🔨 Building CDK..." -ForegroundColor White
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed" -ForegroundColor Red
    exit 1
}

# Bootstrap if needed
Write-Host "`n🔍 Checking CDK bootstrap..." -ForegroundColor White
$bootstrapCheck = aws cloudformation describe-stacks --stack-name CDKToolkit 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "📋 Bootstrapping CDK..." -ForegroundColor Yellow
    npx cdk bootstrap "aws://$($identity.Account)/$Region"
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Bootstrap failed" -ForegroundColor Red
        exit 1
    }
}

# Deploy all stacks
Write-Host "`n🚀 Deploying all stacks..." -ForegroundColor Cyan
Write-Host "   This may take 15-30 minutes for initial deployment`n" -ForegroundColor Gray

npx cdk deploy --all -c env=dev --require-approval never --outputs-file outputs-dev.json 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Host "`n❌ Deployment failed!" -ForegroundColor Red
    exit 1
}

Write-Host "`n✅ Deployment successful!" -ForegroundColor Green

# Generate env files
Write-Host "`n📝 Generating environment files..." -ForegroundColor White
npx ts-node scripts/generate-env.ts dev

Write-Host "`n" -NoNewline
Write-Host "═" * 60 -ForegroundColor Green
Write-Host " DEPLOYMENT COMPLETE " -ForegroundColor Green -NoNewline
Write-Host "═" * 40 -ForegroundColor Green
Write-Host "`nNext steps:" -ForegroundColor Yellow
Write-Host "  1. Start frontend: cd ../../frontend && npm run dev" -ForegroundColor White
Write-Host "  2. Open: http://localhost:5173" -ForegroundColor White
Write-Host "`nStack outputs saved to: outputs-dev.json" -ForegroundColor Gray
Write-Host ""

