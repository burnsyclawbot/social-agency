#!/bin/bash
set -e

echo "Building locally..."
cd "$(dirname "$0")"
npm run build

echo "Syncing dist to EC2..."
rsync -avz --delete dist/ crypto-pulse:/home/ubuntu/apps/social-agency/dist/

echo "Syncing package files..."
rsync -avz package.json package-lock.json crypto-pulse:/home/ubuntu/apps/social-agency/

echo "Installing production deps on EC2..."
ssh crypto-pulse "cd /home/ubuntu/apps/social-agency && npm install --legacy-peer-deps --production 2>&1 | tail -3"

echo "Restarting PM2 on EC2..."
ssh crypto-pulse "/home/ubuntu/.nvm/versions/node/v22.22.0/bin/pm2 restart social-agency"

echo "Deployed at $(date)"
