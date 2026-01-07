#!/bin/bash

# Kubernetes Deployment Script for LobeChat
# Deploy to chat namespace at https://chat.omniverseai.net

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

NAMESPACE="chat"
APP_NAME="lobechat"

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

# Function to check if kubectl is installed
check_kubectl() {
    if ! command -v kubectl &> /dev/null; then
        error "kubectl is not installed. Please install kubectl first."
        exit 1
    fi
    success "kubectl is installed"
}

# Function to check cluster connectivity
check_cluster() {
    info "Checking Kubernetes cluster connectivity..."
    if ! kubectl cluster-info &> /dev/null; then
        error "Cannot connect to Kubernetes cluster. Please check your kubeconfig."
        exit 1
    fi
    success "Connected to Kubernetes cluster"
}

# Function to create namespace
create_namespace() {
    info "Creating namespace: $NAMESPACE"
    if kubectl get namespace $NAMESPACE &> /dev/null; then
        warning "Namespace $NAMESPACE already exists"
    else
        kubectl apply -f k8s/namespace.yaml
        success "Namespace created"
    fi
}

# Function to apply ConfigMap
apply_configmap() {
    info "Applying ConfigMap..."
    kubectl apply -f k8s/configmap.yaml
    success "ConfigMap applied"
}

# Function to apply Secret
apply_secret() {
    info "Applying Secret..."
    if [ ! -f "k8s/secret.yaml" ]; then
        error "Secret file not found. Run './k8s/generate-secret.sh' first."
        exit 1
    fi
    kubectl apply -f k8s/secret.yaml
    success "Secret applied"
}

# Function to apply Deployment
apply_deployment() {
    info "Applying Deployment..."
    kubectl apply -f k8s/deployment.yaml
    success "Deployment applied"
}

# Function to apply Service
apply_service() {
    info "Applying Service..."
    kubectl apply -f k8s/service.yaml
    success "Service applied"
}

# Function to apply Ingress
apply_ingress() {
    info "Applying Ingress..."
    kubectl apply -f k8s/ingress.yaml
    success "Ingress applied"
}

# Function to wait for deployment
wait_for_deployment() {
    info "Waiting for deployment to be ready..."
    kubectl rollout status deployment/$APP_NAME -n $NAMESPACE --timeout=300s
    success "Deployment is ready"
}

# Function to show deployment status
show_status() {
    echo ""
    info "Deployment Status:"
    echo "=================="
    kubectl get pods -n $NAMESPACE -l app=$APP_NAME
    echo ""
    kubectl get svc -n $NAMESPACE
    echo ""
    kubectl get ingress -n $NAMESPACE
}

# Main deployment flow
main() {
    echo -e "${GREEN}╔════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║  LobeChat Kubernetes Deployment Script    ║${NC}"
    echo -e "${GREEN}║  Namespace: chat                           ║${NC}"
    echo -e "${GREEN}║  Domain: https://chat.omniverseai.net      ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════╝${NC}"
    echo ""

    check_kubectl
    check_cluster

    echo ""
    info "Starting deployment..."
    echo ""

    create_namespace
    apply_configmap
    apply_secret
    apply_deployment
    apply_service
    apply_ingress

    echo ""
    wait_for_deployment

    show_status

    echo ""
    success "Deployment completed successfully!"
    echo ""
    info "Access your application at: https://chat.omniverseai.net"
    echo ""
    warning "Make sure:"
    echo "  1. DNS is configured to point to your ingress controller"
    echo "  2. TLS certificate is properly issued by cert-manager"
    echo "  3. PostgreSQL database is accessible"
    echo "  4. MinIO/S3 storage is accessible"
}

# Run main function
main
