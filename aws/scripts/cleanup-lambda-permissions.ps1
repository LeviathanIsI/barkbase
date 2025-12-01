# PowerShell script to remove all API Gateway permissions from Lambda functions
# Run this BEFORE cdk deploy to clean up the bloated permission policies

$lambdas = @(
    "barkbase-dev-auth-api",
    "barkbase-dev-user-profile-service",
    "barkbase-dev-entity-service",
    "barkbase-dev-analytics-service",
    "barkbase-dev-operations-service",
    "barkbase-dev-config-service",
    "barkbase-dev-financial-service"
)

foreach ($lambda in $lambdas) {
    Write-Host "Processing $lambda..." -ForegroundColor Cyan

    try {
        # Get the current policy
        $policyJson = aws lambda get-policy --function-name $lambda --query 'Policy' --output text 2>$null

        if ($policyJson) {
            $policy = $policyJson | ConvertFrom-Json

            foreach ($statement in $policy.Statement) {
                $sid = $statement.Sid
                Write-Host "  Removing permission: $sid" -ForegroundColor Yellow
                aws lambda remove-permission --function-name $lambda --statement-id $sid 2>$null
            }

            Write-Host "  Cleaned $($policy.Statement.Count) permissions" -ForegroundColor Green
        } else {
            Write-Host "  No permissions found" -ForegroundColor Gray
        }
    } catch {
        Write-Host "  No policy or error: $_" -ForegroundColor Gray
    }
}

Write-Host "`nDone! Now run: cd aws/cdk && npx cdk deploy --require-approval never" -ForegroundColor Green
