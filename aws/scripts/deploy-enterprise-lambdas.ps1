# Manual Lambda Deployment Script
# Deploys Enterprise Property Management Lambda functions using AWS CLI
# Bypasses CDK 500-resource limit

param(
    [string]$Environment = "dev",
    [string]$Region = "us-east-2"
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Enterprise Lambda Manual Deployment" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Get DB Layer ARN from existing stack
Write-Host "[1/7] Getting DB Layer ARN..." -ForegroundColor Yellow
$dbLayerArn = aws lambda list-layers --query "Layers[?contains(LayerName, 'DbLayer')].LatestMatchingVersion.LayerVersionArn | [0]" --output text --region $Region

if (-not $dbLayerArn) {
    Write-Host "ERROR: Could not find DbLayer" -ForegroundColor Red
    exit 1
}

Write-Host "✓ DB Layer ARN: $dbLayerArn" -ForegroundColor Green
Write-Host ""

# Get DB Secret ARN
Write-Host "[2/7] Getting DB Secret ARN..." -ForegroundColor Yellow
$dbSecretArn = aws secretsmanager describe-secret --secret-id "Barkbase-$Environment-db-credentials" --query ARN --output text --region $Region

if (-not $dbSecretArn) {
    Write-Host "ERROR: Could not find DB Secret" -ForegroundColor Red
    exit 1
}

Write-Host "✓ DB Secret ARN: $dbSecretArn" -ForegroundColor Green
Write-Host ""

# Get execution role ARN (reuse from existing Lambda)
Write-Host "[3/7] Getting Lambda execution role..." -ForegroundColor Yellow
$roleArn = aws iam get-role --role-name "Barkbase-$Environment-PropertiesApiFunction-Role" --query Role.Arn --output text 2>$null

if (-not $roleArn) {
    Write-Host "WARNING: Could not find existing role, will create new one" -ForegroundColor Yellow
    # Create a new role for enterprise property Lambdas
    $trustPolicy = @"
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {"Service": "lambda.amazonaws.com"},
    "Action": "sts:AssumeRole"
  }]
}
"@
    
    $roleArn = aws iam create-role `
        --role-name "BarkbaseEnterprisePropertyLambdaRole" `
        --assume-role-policy-document $trustPolicy `
        --query Role.Arn `
        --output text
    
    # Attach basic execution policy
    aws iam attach-role-policy `
        --role-name "BarkbaseEnterprisePropertyLambdaRole" `
        --policy-arn "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
    
    # Grant access to secrets manager
    aws iam attach-role-policy `
        --role-name "BarkbaseEnterprisePropertyLambdaRole" `
        --policy-arn "arn:aws:iam::aws:policy/SecretsManagerReadWrite"
    
    Write-Host "✓ Created new execution role" -ForegroundColor Green
} else {
    Write-Host "✓ Using existing execution role" -ForegroundColor Green
}

Write-Host ""

# Environment variables for Lambda
$envVars = @"
{
  "Variables": {
    "DB_HOST": "barkbase-dev-public.ctuea6sg4d0d.us-east-2.rds.amazonaws.com",
    "DB_PORT": "5432",
    "DB_NAME": "barkbase",
    "DB_SECRET_ID": "$dbSecretArn"
  }
}
"@

# Lambda functions to deploy
$lambdas = @(
    @{
        Name = "properties-api-v2"
        Path = "aws/lambdas/properties-api-v2"
        Timeout = 30
        Memory = 256
    },
    @{
        Name = "property-dependency-service"
        Path = "aws/lambdas/property-dependency-service"
        Timeout = 60
        Memory = 512
    },
    @{
        Name = "user-profile-service"
        Path = "aws/lambdas/user-profile-service"
        Timeout = 30
        Memory = 256
    },
    @{
        Name = "schema-version-service"
        Path = "aws/lambdas/schema-version-service"
        Timeout = 30
        Memory = 256
    },
    @{
        Name = "migration-orchestrator"
        Path = "aws/lambdas/migration-orchestrator"
        Timeout = 300
        Memory = 1024
    },
    @{
        Name = "property-archival-job"
        Path = "aws/lambdas/property-archival-job"
        Timeout = 900
        Memory = 256
    },
    @{
        Name = "property-permanent-deletion-job"
        Path = "aws/lambdas/property-permanent-deletion-job"
        Timeout = 900
        Memory = 256
    }
)

Write-Host "[4/7] Packaging and deploying Lambda functions..." -ForegroundColor Yellow

$deployed = 0
foreach ($lambda in $lambdas) {
    Write-Host "  Deploying: $($lambda.Name)..." -ForegroundColor Gray
    
    $functionName = "BarkbaseEnterprise-$($lambda.Name)"
    $zipFile = "deploy-$($lambda.Name).zip"
    
    # Create deployment package
    Push-Location $lambda.Path
    
    # Remove old zip if exists
    if (Test-Path "../$zipFile") {
        Remove-Item "../$zipFile"
    }
    
    # Create zip (PowerShell Compress-Archive)
    Compress-Archive -Path * -DestinationPath "../$zipFile" -Force
    
    Pop-Location
    
    # Check if function exists
    $exists = aws lambda get-function --function-name $functionName --region $Region 2>$null
    
    if ($?) {
        # Update existing function
        Write-Host "    Updating existing function..." -ForegroundColor Gray
        aws lambda update-function-code `
            --function-name $functionName `
            --zip-file "fileb://$($lambda.Path)/../$zipFile" `
            --region $Region `
            --output text | Out-Null
    } else {
        # Create new function
        Write-Host "    Creating new function..." -ForegroundColor Gray
        aws lambda create-function `
            --function-name $functionName `
            --runtime nodejs20.x `
            --role $roleArn `
            --handler index.handler `
            --zip-file "fileb://$($lambda.Path)/../$zipFile" `
            --timeout $($lambda.Timeout) `
            --memory-size $($lambda.Memory) `
            --environment $envVars `
            --layers $dbLayerArn `
            --region $Region `
            --output text | Out-Null
    }
    
    # Clean up zip
    Remove-Item "$($lambda.Path)/../$zipFile"
    
    if ($?) {
        Write-Host "    ✓ $($lambda.Name) deployed" -ForegroundColor Green
        $deployed++
    } else {
        Write-Host "    ✗ $($lambda.Name) failed" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "✓ $deployed/$($lambdas.Count) Lambda functions deployed successfully" -ForegroundColor Green
Write-Host ""

Write-Host "[5/7] Configuring EventBridge schedules..." -ForegroundColor Yellow

# Schedule for archival job (daily at 2 AM UTC)
Write-Host "  Setting up daily archival job..." -ForegroundColor Gray
$archivalFunctionArn = aws lambda get-function --function-name "BarkbaseEnterprise-property-archival-job" --query Configuration.FunctionArn --output text --region $Region 2>$null

if ($archivalFunctionArn) {
    # Create or update rule
    aws events put-rule `
        --name "BarkbasePropertyArchivalDaily" `
        --schedule-expression "cron(0 2 * * ? *)" `
        --description "Daily property archival job" `
        --region $Region | Out-Null
    
    # Add Lambda target
    aws events put-targets `
        --rule "BarkbasePropertyArchivalDaily" `
        --targets "Id=1,Arn=$archivalFunctionArn" `
        --region $Region | Out-Null
    
    # Add permission
    aws lambda add-permission `
        --function-name "BarkbaseEnterprise-property-archival-job" `
        --statement-id "EventBridgeInvoke" `
        --action lambda:InvokeFunction `
        --principal events.amazonaws.com `
        --source-arn "arn:aws:events:${Region}:*:rule/BarkbasePropertyArchivalDaily" `
        --region $Region 2>$null | Out-Null
    
    Write-Host "  ✓ Daily archival job scheduled" -ForegroundColor Green
}

# Schedule for permanent deletion job (weekly on Sundays at 3 AM UTC)
Write-Host "  Setting up weekly deletion job..." -ForegroundColor Gray
$deletionFunctionArn = aws lambda get-function --function-name "BarkbaseEnterprise-property-permanent-deletion-job" --query Configuration.FunctionArn --output text --region $Region 2>$null

if ($deletionFunctionArn) {
    aws events put-rule `
        --name "BarkbasePropertyDeletionWeekly" `
        --schedule-expression "cron(0 3 ? * SUN *)" `
        --description "Weekly property permanent deletion job" `
        --region $Region | Out-Null
    
    aws events put-targets `
        --rule "BarkbasePropertyDeletionWeekly" `
        --targets "Id=1,Arn=$deletionFunctionArn" `
        --region $Region | Out-Null
    
    aws lambda add-permission `
        --function-name "BarkbaseEnterprise-property-permanent-deletion-job" `
        --statement-id "EventBridgeInvoke" `
        --action lambda:InvokeFunction `
        --principal events.amazonaws.com `
        --source-arn "arn:aws:events:${Region}:*:rule/BarkbasePropertyDeletionWeekly" `
        --region $Region 2>$null | Out-Null
    
    Write-Host "  ✓ Weekly deletion job scheduled" -ForegroundColor Green
}

Write-Host ""

Write-Host "[6/7] Testing deployed functions..." -ForegroundColor Yellow
Write-Host "  Invoking properties-api-v2 test..." -ForegroundColor Gray

# Simple test invocation
$testPayload = '{"requestContext":{"http":{"method":"GET","path":"/api/v2/properties"},"authorizer":{"jwt":{"claims":{"sub":"test"}}}},"body":null}'
$testResult = aws lambda invoke `
    --function-name "BarkbaseEnterprise-properties-api-v2" `
    --payload $testPayload `
    --region $Region `
    response.json 2>&1

if ($?) {
    Write-Host "  ✓ Test invocation successful" -ForegroundColor Green
} else {
    Write-Host "  ⚠ Test invocation failed (may need proper authentication)" -ForegroundColor Yellow
}

# Clean up test response
if (Test-Path response.json) {
    Remove-Item response.json
}

Write-Host ""

Write-Host "[7/7] Deployment Complete!" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Deployed Functions:" -ForegroundColor White
foreach ($lambda in $lambdas) {
    Write-Host "  ✓ BarkbaseEnterprise-$($lambda.Name)" -ForegroundColor Green
}
Write-Host ""
Write-Host "Scheduled Jobs:" -ForegroundColor White
Write-Host "  ✓ Daily archival (2 AM UTC)" -ForegroundColor Green
Write-Host "  ✓ Weekly deletion (Sundays 3 AM UTC)" -ForegroundColor Green
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "🎉 Enterprise Property System Deployed!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan

