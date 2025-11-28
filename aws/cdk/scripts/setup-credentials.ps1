# =============================================================================
# BarkBase AWS Credentials Setup Script
# =============================================================================
# 
# Run this script to configure valid AWS credentials for deployment.
# 
# You will need:
#   1. AWS Access Key ID (starts with AKIA...)
#   2. AWS Secret Access Key
#
# To create new credentials:
#   1. Go to AWS Console: https://console.aws.amazon.com
#   2. Navigate to: IAM > Users > Your User > Security credentials
#   3. Click "Create access key"
#   4. Copy the Access Key ID and Secret Access Key
#
# =============================================================================

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " BarkBase AWS Credentials Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "This script will configure AWS credentials for CDK deployment." -ForegroundColor White
Write-Host ""
Write-Host "AWS Account: 211125574375" -ForegroundColor Yellow
Write-Host "Region: us-east-2 (Ohio)" -ForegroundColor Yellow
Write-Host ""

# Check if credentials file exists and back it up
$credentialsPath = Join-Path $env:USERPROFILE ".aws\credentials"
$configPath = Join-Path $env:USERPROFILE ".aws\config"

if (Test-Path $credentialsPath) {
    $backupPath = "$credentialsPath.backup.$(Get-Date -Format 'yyyyMMdd-HHmmss')"
    Copy-Item $credentialsPath $backupPath -Force
    Write-Host "Backed up existing credentials to: $backupPath" -ForegroundColor Gray
}

# Prompt for credentials
Write-Host ""
$accessKeyId = Read-Host "Enter AWS Access Key ID (starts with AKIA)"
$secretAccessKey = Read-Host "Enter AWS Secret Access Key" -AsSecureString
$secretAccessKeyPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($secretAccessKey))

# Validate access key format
if (-not $accessKeyId.StartsWith("AKIA")) {
    Write-Host ""
    Write-Host "WARNING: Access Key ID should start with 'AKIA'" -ForegroundColor Yellow
    $continue = Read-Host "Continue anyway? (y/n)"
    if ($continue -ne "y") {
        Write-Host "Aborted." -ForegroundColor Red
        exit 1
    }
}

# Create .aws directory if it doesn't exist
$awsDir = Join-Path $env:USERPROFILE ".aws"
if (-not (Test-Path $awsDir)) {
    New-Item -ItemType Directory -Path $awsDir -Force | Out-Null
    Write-Host "Created ~/.aws directory" -ForegroundColor Green
}

# Write credentials file
$credentialsContent = @"
[default]
aws_access_key_id = $accessKeyId
aws_secret_access_key = $secretAccessKeyPlain

[barkbase-admin]
aws_access_key_id = $accessKeyId
aws_secret_access_key = $secretAccessKeyPlain
"@

Set-Content -Path $credentialsPath -Value $credentialsContent -Force
Write-Host "Created credentials file: $credentialsPath" -ForegroundColor Green

# Write config file
$configContent = @"
[default]
region = us-east-2
output = json

[profile barkbase-admin]
region = us-east-2
output = json
"@

Set-Content -Path $configPath -Value $configContent -Force
Write-Host "Created config file: $configPath" -ForegroundColor Green

# Clear plaintext password from memory
$secretAccessKeyPlain = $null
[GC]::Collect()

# Test credentials
Write-Host ""
Write-Host "Testing credentials..." -ForegroundColor White

try {
    $identity = aws sts get-caller-identity 2>&1 | ConvertFrom-Json
    Write-Host ""
    Write-Host "SUCCESS! Credentials are valid." -ForegroundColor Green
    Write-Host "Account: $($identity.Account)" -ForegroundColor White
    Write-Host "User: $($identity.Arn)" -ForegroundColor White
    Write-Host ""
    Write-Host "You can now run the deployment script:" -ForegroundColor Cyan
    Write-Host "  cd aws/cdk" -ForegroundColor White
    Write-Host "  .\scripts\deploy.ps1 dev" -ForegroundColor White
    Write-Host ""
} catch {
    Write-Host ""
    Write-Host "ERROR: Credentials are invalid!" -ForegroundColor Red
    Write-Host "Please check your Access Key ID and Secret Access Key" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "To create new credentials:" -ForegroundColor White
    Write-Host "  1. Go to: https://console.aws.amazon.com/iam" -ForegroundColor Gray
    Write-Host "  2. Navigate to: Users > Your User > Security credentials" -ForegroundColor Gray
    Write-Host "  3. Click 'Create access key'" -ForegroundColor Gray
    Write-Host ""
}

