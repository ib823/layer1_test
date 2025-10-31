#!/bin/bash
# Setup Automated Backup Cron Job
# Purpose: Configures automated daily backups at 2 AM UTC

set -e

echo "Setting up automated database backups..."

# Get the absolute path to the backup script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_SCRIPT="$SCRIPT_DIR/backup-database.sh"

# Validate backup script exists
if [ ! -f "$BACKUP_SCRIPT" ]; then
  echo "Error: Backup script not found at $BACKUP_SCRIPT"
  exit 1
fi

# Create cron job entry
# Runs daily at 2 AM UTC
CRON_ENTRY="0 2 * * * $BACKUP_SCRIPT -o /var/backups/sapframework -r 30 >> /var/log/sapframework-backup.log 2>&1"

# Check if cron job already exists
if crontab -l 2>/dev/null | grep -q "$BACKUP_SCRIPT"; then
  echo "Cron job already exists"
  echo "Current crontab:"
  crontab -l | grep "$BACKUP_SCRIPT"
else
  # Add cron job
  (crontab -l 2>/dev/null; echo "$CRON_ENTRY") | crontab -
  echo "✓ Cron job added successfully"
  echo ""
  echo "Schedule: Daily at 2:00 AM UTC"
  echo "Backup directory: /var/backups/sapframework"
  echo "Retention: 30 days"
  echo "Log file: /var/log/sapframework-backup.log"
fi

echo ""
echo "Current crontab:"
crontab -l

echo ""
echo "To manually run backup:"
echo "  $BACKUP_SCRIPT"
echo ""
echo "To remove cron job:"
echo "  crontab -e"
echo "  (then delete the line containing backup-database.sh)"

exit 0
