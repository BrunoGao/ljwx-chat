#!/bin/bash

# Build and Push Docker Image Script for LobeChat

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
IMAGE_NAME="lobechat"
REGISTRY="${DOCKER_REGISTRY:-your-registry.com}"
TAG="${IMAGE_TAG:-latest}"
FULL_IMAGE="${REGISTRY}/${IMAGE_NAME}:${TAG}"

# Function to print colored messages
info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if Docker is installed
check_docker() {
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    success "Docker is installed"
}

# Function to build Docker image
build_image() {
    info "Building Docker image: $FULL_IMAGE"
    echo ""

    docker build \
        --build-arg NEXT_PUBLIC_ENABLE_NEXT_AUTH=1 \
        --build-arg NEXT_PUBLIC_ENABLE_LOCAL_AUTH=1 \
        -t $FULL_IMAGE \
        .

    success "Image built successfully"
}

# Function to push Docker image
push_image() {
    info "Pushing Docker image to registry..."
    docker push $FULL_IMAGE
    success "Image pushed successfully"
}

# Function to update deployment YAML
update_deployment() {
    info "Updating deployment.yaml with new image..."

    # Update the image in deployment.yaml
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s|image:.*|image: $FULL_IMAGE|g" k8s/deployment.yaml
    else
        # Linux
        sed -i "s|image:.*|image: $FULL_IMAGE|g" k8s/deployment.yaml
    fi

    success "Deployment YAML updated"
}

# Main build flow
main() {
    echo -e "${GREEN}╔════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║  LobeChat Docker Build & Push Script      ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════╝${NC}"
    echo ""

    info "Registry: $REGISTRY"
    info "Image: $IMAGE_NAME"
    info "Tag: $TAG"
    info "Full Image: $FULL_IMAGE"
    echo ""

    check_docker

    # Prompt for confirmation
    read -p "Do you want to proceed with the build? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        warning "Build cancelled"
        exit 1
    fi

    build_image

    echo ""
    read -p "Do you want to push the image to registry? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        push_image
        update_deployment
    else
        warning "Image push skipped"
    fi

    echo ""
    success "Build process completed!"
    echo ""
    info "Next steps:"
    echo "  1. Run './k8s/deploy.sh' to deploy to Kubernetes"
    echo "  2. Or manually apply: kubectl apply -k k8s/"
}

# Show usage if help is requested
if [ "$1" == "--help" ] || [ "$1" == "-h" ]; then
    echo "Usage: $0"
    echo ""
    echo "Environment variables:"
    echo "  DOCKER_REGISTRY  - Docker registry URL (default: your-registry.com)"
    echo "  IMAGE_TAG        - Image tag (default: latest)"
    echo ""
    echo "Example:"
    echo "  DOCKER_REGISTRY=registry.example.com IMAGE_TAG=v1.0.0 $0"
    exit 0
fi

# Run main function
main
