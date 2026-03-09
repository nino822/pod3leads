# Quick Setup Script
# Run this after installing to add your first user

param(
    [Parameter(Mandatory=$true)]
    [string]$Email,
    
    [Parameter(Mandatory=$true)]
    [string]$Name
)

$dbPath = Join-Path $PSScriptRoot "..\prisma\dev.db"

if (-not (Test-Path $dbPath)) {
    Write-Host "Database not found! Run 'npm run db:push' first." -ForegroundColor Red
    exit 1
}

# Use sqlite3 if available, otherwise use Prisma Studio
$sqliteCmd = Get-Command sqlite3 -ErrorAction SilentlyContinue

if ($sqliteCmd) {
    $query = "INSERT INTO Invite (id, email, name, invitedBy, createdAt) VALUES (lower(hex(randomblob(16))), '$Email', '$Name', lower(hex(randomblob(16))), datetime('now'));"
    sqlite3 $dbPath $query
    Write-Host "✓ Invite added for $Email" -ForegroundColor Green
} else {
    Write-Host "SQLite3 not found. Please use Prisma Studio instead:" -ForegroundColor Yellow
    Write-Host "1. Run: npm run db:studio" -ForegroundColor Cyan
    Write-Host "2. Open Prisma Studio in your browser" -ForegroundColor Cyan
    Write-Host "3. Click on 'Invite' model" -ForegroundColor Cyan
    Write-Host "4. Click 'Add record'" -ForegroundColor Cyan
    Write-Host "5. Enter:" -ForegroundColor Cyan
    Write-Host "   - email: $Email" -ForegroundColor White
    Write-Host "   - name: $Name" -ForegroundColor White
    Write-Host "6. Click 'Save 1 change'" -ForegroundColor Cyan
}
