#!/bin/bash

# Kubernetes Secret Generator Script
# This script creates a Kubernetes secret from environment variables

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== LobeChat Kubernetes Secret Generator ===${NC}"

# Check if .env.k8s exists
if [ ! -f "k8s/.env.k8s" ]; then
    echo -e "${YELLOW}Warning: k8s/.env.k8s not found${NC}"
    echo "Creating from template..."
    cp k8s/.env.template k8s/.env.k8s
    echo -e "${RED}Please edit k8s/.env.k8s with your actual values${NC}"
    exit 1
fi

# Load environment variables from .env.k8s
source k8s/.env.k8s

# Validate required variables
REQUIRED_VARS=(
    "DATABASE_URL"
    "KEY_VAULTS_SECRET"
    "NEXTAUTH_SECRET"
    "S3_ACCESS_KEY_ID"
    "S3_SECRET_ACCESS_KEY"
)

for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        echo -e "${RED}Error: Required variable $var is not set${NC}"
        exit 1
    fi
done

# Generate secret YAML
echo -e "${GREEN}Generating secret.yaml...${NC}"

cat > k8s/secret.yaml << EOF
apiVersion: v1
kind: Secret
metadata:
  name: lobechat-secrets
  namespace: chat
type: Opaque
stringData:
  # Database Configuration
  DATABASE_URL: "${DATABASE_URL}"
  KEY_VAULTS_SECRET: "${KEY_VAULTS_SECRET}"

  # NextAuth Configuration
  NEXTAUTH_SECRET: "${NEXTAUTH_SECRET}"
  NEXT_AUTH_SECRET: "${NEXT_AUTH_SECRET:-$NEXTAUTH_SECRET}"

  # S3/MinIO Configuration
  S3_ENDPOINT: "${S3_ENDPOINT}"
  S3_PUBLIC_DOMAIN: "${S3_PUBLIC_DOMAIN}"
  S3_ACCESS_KEY_ID: "${S3_ACCESS_KEY_ID}"
  S3_SECRET_ACCESS_KEY: "${S3_SECRET_ACCESS_KEY}"
EOF

# Add optional variables if set
if [ ! -z "${OPENAI_API_KEY}" ]; then
    echo "  OPENAI_API_KEY: \"${OPENAI_API_KEY}\"" >> k8s/secret.yaml
fi

if [ ! -z "${ANTHROPIC_API_KEY}" ]; then
    echo "  ANTHROPIC_API_KEY: \"${ANTHROPIC_API_KEY}\"" >> k8s/secret.yaml
fi

if [ ! -z "${GOOGLE_API_KEY}" ]; then
    echo "  GOOGLE_API_KEY: \"${GOOGLE_API_KEY}\"" >> k8s/secret.yaml
fi

echo -e "${GREEN}✓ Secret generated successfully at k8s/secret.yaml${NC}"
echo -e "${YELLOW}Note: This file contains sensitive data. Do not commit it to git!${NC}"
