# Check CloudWatch logs for pets-api Lambda function
$functionName = "Barkbase-dev-EntityServiceFunction31C1524D-BpC87mkPAK5i"
$startTime = (Get-Date).AddMinutes(-10)

Write-Host "Checking CloudWatch logs for $functionName..." -ForegroundColor Yellow
Write-Host "From: $($startTime.ToString('yyyy-MM-dd HH:mm:ss'))" -ForegroundColor Cyan

# Get the latest log streams
$logStreams = aws logs describe-log-streams `
    --log-group-name "/aws/lambda/$functionName" `
    --order-by LastEventTime `
    --descending `
    --limit 5 `
    --region us-east-2 2>$null | ConvertFrom-Json

if ($logStreams.logStreams.Count -eq 0) {
    Write-Host "No log streams found. Checking if function exists..." -ForegroundColor Red
    
    # List all Lambda functions to find the correct name
    Write-Host "`nSearching for pets-related Lambda functions:" -ForegroundColor Yellow
    aws lambda list-functions --region us-east-2 --query "Functions[?contains(FunctionName, 'ets')].[FunctionName]" --output table
} else {
    # Get logs from the most recent stream
    $latestStream = $logStreams.logStreams[0].logStreamName
    Write-Host "Reading from log stream: $latestStream" -ForegroundColor Green
    
    $logs = aws logs filter-log-events `
        --log-group-name "/aws/lambda/$functionName" `
        --log-stream-names $latestStream `
        --start-time ([DateTimeOffset]::Now.AddMinutes(-10).ToUnixTimeMilliseconds()) `
        --filter-pattern "PETS API DEBUG" `
        --region us-east-2 2>$null | ConvertFrom-Json
    
    if ($logs.events.Count -eq 0) {
        Write-Host "`nNo debug logs found. Showing recent entries:" -ForegroundColor Yellow
        
        aws logs filter-log-events `
            --log-group-name "/aws/lambda/$functionName" `
            --log-stream-names $latestStream `
            --start-time ([DateTimeOffset]::Now.AddMinutes(-10).ToUnixTimeMilliseconds()) `
            --region us-east-2 `
            --limit 20 `
            --output text
    } else {
        Write-Host "`nFound $($logs.events.Count) debug log entries:" -ForegroundColor Green
        $logs.events | ForEach-Object {
            Write-Host $_.message
        }
    }
}
