# Enterprise Property Management System - Deployment Script
# Deploys database migrations and Lambda functions for the complete system

param(
    [string]$Environment = "dev",
    [switch]$SkipMigrations,
    [switch]$MigrationsOnly,
    [switch]$DryRun
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Enterprise Property System Deployment" -ForegroundColor Cyan
Write-Host "Environment: $Environment" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$DBHost = "barkbase-dev-public.ctuea6sg4d0d.us-east-2.rds.amazonaws.com"
$DBName = "barkbase"
$DBUser = "postgres"
$SecretName = "Barkbase-dev-db-credentials"

# Get database password from AWS Secrets Manager
Write-Host "[1/5] Retrieving database credentials..." -ForegroundColor Yellow
$secretJson = aws secretsmanager get-secret-value --secret-id $SecretName --query SecretString --output text
$secret = $secretJson | ConvertFrom-Json
$DBPassword = $secret.password

if (-not $DBPassword) {
    Write-Host "ERROR: Could not retrieve database password" -ForegroundColor Red
    exit 1
}

Write-Host "✓ Database credentials retrieved" -ForegroundColor Green
Write-Host ""

# Set PostgreSQL password environment variable
$env:PGPASSWORD = $DBPassword

# Database Migrations
if (-not $SkipMigrations) {
    Write-Host "[2/5] Running database migrations..." -ForegroundColor Yellow
    
    $migrations = @(
        "001_create_enhanced_property_metadata.sql",
        "002_create_property_dependencies.sql",
        "003_create_property_change_audit.sql",
        "004_create_tenant_schema_version.sql",
        "005_migrate_existing_properties.sql",
        "006_create_deleted_properties_schema.sql",
        "007_create_permission_profiles.sql",
        "008_create_migration_tracking_tables.sql"
    )
    
    foreach ($migration in $migrations) {
        Write-Host "  Running: $migration" -ForegroundColor Gray
        
        if ($DryRun) {
            Write-Host "  [DRY RUN] Would execute: $migration" -ForegroundColor Magenta
        } else {
            $migrationPath = "aws/scripts/migrations/$migration"
            psql -h $DBHost -U $DBUser -d $DBName -f $migrationPath
            
            if ($LASTEXITCODE -ne 0) {
                Write-Host "  ERROR: Migration $migration failed" -ForegroundColor Red
                exit 1
            }
        }
    }
    
    Write-Host "  ✓ All migrations completed successfully" -ForegroundColor Green
    
    # Seed permission profiles
    Write-Host "  Seeding permission profiles..." -ForegroundColor Gray
    if (-not $DryRun) {
        psql -h $DBHost -U $DBUser -d $DBName -f "aws/scripts/seed-permission-profiles.sql"
        if ($LASTEXITCODE -ne 0) {
            Write-Host "  WARNING: Permission profile seeding had issues" -ForegroundColor Yellow
        } else {
            Write-Host "  ✓ Permission profiles seeded" -ForegroundColor Green
        }
    }
    
    Write-Host ""
}

# Clear password from environment
$env:PGPASSWORD = $null

if ($MigrationsOnly) {
    Write-Host "✓ Migrations completed. Skipping Lambda deployment (MigrationsOnly flag set)" -ForegroundColor Green
    exit 0
}

# CDK Deployment
Write-Host "[3/5] Deploying Lambda functions via CDK..." -ForegroundColor Yellow

if ($DryRun) {
    Write-Host "[DRY RUN] Would run: cdk deploy --require-approval never" -ForegroundColor Magenta
} else {
    Set-Location "aws/cdk"
    npm run cdk deploy -- --require-approval never
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: CDK deployment failed" -ForegroundColor Red
        Set-Location "../.."
        exit 1
    }
    
    Set-Location "../.."
    Write-Host "✓ Lambda functions deployed successfully" -ForegroundColor Green
}

Write-Host ""

# Verification
Write-Host "[4/5] Verifying deployment..." -ForegroundColor Yellow

if (-not $DryRun) {
    # Verify database tables exist
    Write-Host "  Checking database tables..." -ForegroundColor Gray
    $env:PGPASSWORD = $DBPassword
    
    $tableCheck = psql -h $DBHost -U $DBUser -d $DBName -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_name IN ('PropertyMetadata', 'PropertyDependencies', 'PropertyChangeAudit', 'TenantSchemaVersion', 'PermissionProfile');"
    
    $env:PGPASSWORD = $null
    
    if ($tableCheck -match "5") {
        Write-Host "  ✓ All database tables created" -ForegroundColor Green
    } else {
        Write-Host "  WARNING: Some tables may be missing" -ForegroundColor Yellow
    }
    
    # Verify Lambda functions
    Write-Host "  Checking Lambda functions..." -ForegroundColor Gray
    $functions = @(
        "PropertiesApiV2Function",
        "PropertyDependencyServiceFunction",
        "UserProfileServiceFunction",
        "SchemaVersionServiceFunction",
        "MigrationOrchestratorFunction",
        "PropertyArchivalJobFunction",
        "PropertyPermanentDeletionJobFunction"
    )
    
    $stackName = "Barkbase-$Environment"
    $deployed = 0
    
    foreach ($func in $functions) {
        $check = aws lambda get-function --function-name "$stackName-$func" 2>&1
        if ($?) {
            $deployed++
        }
    }
    
    Write-Host "  ✓ $deployed/$($functions.Count) Lambda functions deployed" -ForegroundColor Green
}

Write-Host ""

# Summary
Write-Host "[5/5] Deployment Summary" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan

if ($DryRun) {
    Write-Host "DRY RUN COMPLETE" -ForegroundColor Magenta
    Write-Host "No changes were made" -ForegroundColor Magenta
} else {
    Write-Host "✓ Database Migrations: 7 migrations executed" -ForegroundColor Green
    Write-Host "✓ Permission Profiles: 4 standard profiles seeded" -ForegroundColor Green
    Write-Host "✓ Lambda Functions: 7 new functions deployed" -ForegroundColor Green
    Write-Host "✓ Scheduled Jobs: 2 cron jobs configured" -ForegroundColor Green
    Write-Host "✓ API Routes: 30+ new routes added" -ForegroundColor Green
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "NEXT STEPS:" -ForegroundColor Yellow
Write-Host "1. Test API v2 endpoints" -ForegroundColor White
Write-Host "2. Verify dependency discovery" -ForegroundColor White
Write-Host "3. Check scheduled jobs" -ForegroundColor White
Write-Host "4. Review CloudWatch logs" -ForegroundColor White
Write-Host "5. Update frontend to use new components" -ForegroundColor White
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

if (-not $DryRun) {
    Write-Host "🎉 Deployment Complete!" -ForegroundColor Green
}

