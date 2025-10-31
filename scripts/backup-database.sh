#!/bin/bash
# SAP MVP Framework - Automated Database Backup Script
# Purpose: Creates compressed PostgreSQL backups with retention policy
# Usage: ./scripts/backup-database.sh [OPTIONS]
#
# Options:
#   -d, --database    Database URL (default: from DATABASE_URL env var)
#   -o, --output      Backup directory (default: ./backups)
#   -r, --retention   Retention days (default: 30)
#   -h, --help        Show this help message

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default values
BACKUP_DIR="./backups"
RETENTION_DAYS=30
DATABASE_URL="${DATABASE_URL:-}"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    -d|--database)
      DATABASE_URL="$2"
      shift 2
      ;;
    -o|--output)
      BACKUP_DIR="$2"
      shift 2
      ;;
    -r|--retention)
      RETENTION_DAYS="$2"
      shift 2
      ;;
    -h|--help)
      grep "^#" "$0" | tail -n +2 | head -n -1 | cut -c 3-
      exit 0
      ;;
    *)
      echo -e "${RED}Error: Unknown option $1${NC}"
      exit 1
      ;;
  esac
done

# Validate DATABASE_URL
if [ -z "$DATABASE_URL" ]; then
  echo -e "${RED}Error: DATABASE_URL not set${NC}"
  echo "Set DATABASE_URL environment variable or use -d option"
  exit 1
fi

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Generate timestamp-based filename
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
FILENAME="sapframework_${TIMESTAMP}.sql.gz"
FILEPATH="${BACKUP_DIR}/${FILENAME}"

echo -e "${GREEN}Starting database backup...${NC}"
echo "Timestamp: $(date)"
echo "Backup directory: $BACKUP_DIR"
echo "Retention: $RETENTION_DAYS days"
echo ""

# Create backup using pg_dump
echo -e "${YELLOW}Creating backup: ${FILENAME}${NC}"
if pg_dump "$DATABASE_URL" | gzip > "$FILEPATH"; then
  FILESIZE=$(du -h "$FILEPATH" | cut -f1)
  echo -e "${GREEN}✓ Backup created successfully${NC}"
  echo "File: $FILEPATH"
  echo "Size: $FILESIZE"
else
  echo -e "${RED}✗ Backup failed${NC}"
  exit 1
fi

# Delete old backups based on retention policy
echo ""
echo -e "${YELLOW}Cleaning up old backups...${NC}"
DELETED_COUNT=0
while IFS= read -r -d '' old_backup; do
  echo "Deleting: $(basename "$old_backup")"
  rm "$old_backup"
  ((DELETED_COUNT++))
done < <(find "$BACKUP_DIR" -name "sapframework_*.sql.gz" -type f -mtime +$RETENTION_DAYS -print0 2>/dev/null)

if [ $DELETED_COUNT -eq 0 ]; then
  echo "No old backups to delete"
else
  echo -e "${GREEN}✓ Deleted $DELETED_COUNT old backup(s)${NC}"
fi

# Show backup statistics
echo ""
echo -e "${GREEN}Backup Summary${NC}"
echo "================"
TOTAL_BACKUPS=$(find "$BACKUP_DIR" -name "sapframework_*.sql.gz" -type f | wc -l)
TOTAL_SIZE=$(du -sh "$BACKUP_DIR" 2>/dev/null | cut -f1)
echo "Total backups: $TOTAL_BACKUPS"
echo "Total size: $TOTAL_SIZE"
echo "Latest backup: $FILENAME ($FILESIZE)"

# Optional: Upload to cloud storage (uncomment and configure)
# Example for AWS S3:
# if command -v aws &> /dev/null; then
#   echo ""
#   echo -e "${YELLOW}Uploading to S3...${NC}"
#   aws s3 cp "$FILEPATH" "s3://your-bucket/backups/sapframework/"
#   echo -e "${GREEN}✓ Uploaded to S3${NC}"
# fi

# Example for Azure Blob Storage:
# if command -v az &> /dev/null; then
#   echo ""
#   echo -e "${YELLOW}Uploading to Azure Blob Storage...${NC}"
#   az storage blob upload \
#     --account-name your-storage-account \
#     --container-name backups \
#     --name "sapframework/${FILENAME}" \
#     --file "$FILEPATH"
#   echo -e "${GREEN}✓ Uploaded to Azure${NC}"
# fi

echo ""
echo -e "${GREEN}✓ Backup completed successfully${NC}"
echo "$(date)"

exit 0
