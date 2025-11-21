# PowerShell script to check CloudWatch logs
$logGroup = "/aws/lambda/Barkbase-dev-AnalyticsServiceFunctionA7CDC68A-GNSn54Lh0Tck"
$region = "us-east-2"
$startTime = (Get-Date).AddMinutes(-5).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")

Write-Host "Fetching logs from CloudWatch..." -ForegroundColor Green
aws logs filter-log-events `
    --log-group-name $logGroup `
    --start-time ([DateTimeOffset]::Parse($startTime).ToUnixTimeMilliseconds()) `
    --region $region `
    --query "events[*].message" `
    --output text

Write-Host "`nTo see real-time logs, run:" -ForegroundColor Yellow
Write-Host "aws logs tail '$logGroup' --follow --region $region"