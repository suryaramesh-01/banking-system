#!/usr/bin/env bash
set -euo pipefail

# Simple deploy script for EC2: pull latest and restart docker-compose
# Usage: sudo -u ubuntu /bin/bash scripts/deploy.sh  (or run as the deploy user)

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
echo "Deploying from ${REPO_DIR}"

cd "${REPO_DIR}"

# ensure we have the latest code
if [ -d .git ]; then
  git fetch --all --prune
  git reset --hard origin/main
fi

# copy example env if missing
if [ -f backend/.env.example ] && [ ! -f backend/.env ]; then
  cp backend/.env.example backend/.env
  echo "Copied backend/.env from example — edit backend/.env with secrets."
fi

# Bring down then up
docker compose down || true
docker compose pull || true
docker compose up -d --remove-orphans --build

echo "Deployment finished."
