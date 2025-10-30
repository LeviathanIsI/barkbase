# Retry Failed Lambda Deployments
# Fixes IAM role propagation issues

$Region = "us-east-2"
$roleArn = "arn:aws:iam::211125574375:role/BarkbaseEnterprisePropertyLambdaRole"
$dbLayerArn = "arn:aws:lambda:us-east-2:211125574375:layer:DbLayer195115F8:13"
$dbSecretArn = "arn:aws:secretsmanager:us-east-2:211125574375:secret:Barkbase-dev-db-credentials-VybGGM"

Write-Host "Waiting for IAM role propagation..." -ForegroundColor Yellow
Start-Sleep -Seconds 15
Write-Host "✓ Proceeding with deployment" -ForegroundColor Green
Write-Host ""

# Failed functions to retry
$functions = @(
    @{Name="properties-api-v2"; Path="aws/lambdas/properties-api-v2"; Timeout=30; Memory=256},
    @{Name="property-dependency-service"; Path="aws/lambdas/property-dependency-service"; Timeout=60; Memory=512},
    @{Name="user-profile-service"; Path="aws/lambdas/user-profile-service"; Timeout=30; Memory=256}
)

foreach ($func in $functions) {
    Write-Host "Deploying: $($func.Name)..." -ForegroundColor Cyan
    
    # Package
    Push-Location $func.Path
    $zipFile = "../$($func.Name).zip"
    if (Test-Path $zipFile) { Remove-Item $zipFile }
    Compress-Archive -Path * -DestinationPath $zipFile -Force
    Pop-Location
    
    # Deploy
    $result = aws lambda create-function `
        --function-name "BarkbaseEnterprise-$($func.Name)" `
        --runtime nodejs20.x `
        --role $roleArn `
        --handler index.handler `
        --zip-file "fileb://$($func.Path).zip" `
        --timeout $func.Timeout `
        --memory-size $func.Memory `
        --environment "Variables={DB_HOST=barkbase-dev-public.ctuea6sg4d0d.us-east-2.rds.amazonaws.com,DB_PORT=5432,DB_NAME=barkbase,DB_SECRET_ID=$dbSecretArn}" `
        --layers $dbLayerArn `
        --region $Region `
        2>&1
    
    # Clean up
    Remove-Item "$($func.Path).zip"
    
    if ($?) {
        Write-Host "  ✓ $($func.Name) deployed successfully" -ForegroundColor Green
    } else {
        if ($result -like "*ResourceConflictException*") {
            Write-Host "  ℹ $($func.Name) already exists" -ForegroundColor Yellow
        } else {
            Write-Host "  ✗ $($func.Name) failed: $result" -ForegroundColor Red
        }
    }
}

Write-Host ""
Write-Host "✓ Deployment complete!" -ForegroundColor Green

