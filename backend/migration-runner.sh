#!/bin/bash

# APPOINTMENT MIGRATION RUNNER
# Run this to backfill appointment cancellation data
# Usage: npm run migrate:appointments

cd "$(dirname "$0")" || exit 1

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "╔════════════════════════════════════════════════════════╗"
echo "║   APPOINTMENT CANCELLATION DATA MIGRATION              ║"
echo "║   This script will backfill past appointment data      ║"
echo "╚════════════════════════════════════════════════════════╝"
echo -e "${NC}\n"

# Safety check
echo -e "${YELLOW}⚠️  WARNING:${NC}"
echo "   This script will modify production data."
echo "   A backup will be created before any changes."
echo ""
read -p "Continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Migration cancelled."
    exit 0
fi

echo -e "\n${BLUE}Starting migration...${NC}\n"

# Run the migration script
node migrations/backfillAppointmentCancellations.js

if [ $? -eq 0 ]; then
    echo -e "${GREEN}\n✅ Migration completed successfully!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Verify the changes in database"
    echo "2. Check the migration report in _data/migration-report-*.json"
    echo "3. Restart backend server"
    echo ""
else
    echo -e "${RED}\n❌ Migration failed!${NC}"
    echo "Check the error messages above."
    echo "A backup was saved - restore if needed."
    exit 1
fi
