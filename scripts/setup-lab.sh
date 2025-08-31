#!/bin/bash

# LIA Lab Management System - One Command Setup Script
# For single research lab deployment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logo and welcome
echo ""
echo "🧪 ============================================="
echo "    LIA - Lab Intelligence AI Agent"  
echo "    Single Lab Management System Setup"
echo "============================================= 🧪"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: Must run from LIA project root directory${NC}"
    exit 1
fi

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${YELLOW}⚠️  Docker not found. Installing Docker...${NC}"
    if [[ "$OSTYPE" == "darwin"* ]]; then
        echo "Please install Docker Desktop from: https://www.docker.com/products/docker-desktop"
        exit 1
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        curl -fsSL https://get.docker.com -o get-docker.sh
        sudo sh get-docker.sh
        sudo usermod -aG docker $USER
        echo -e "${GREEN}✅ Docker installed. Please log out and back in, then run this script again.${NC}"
        exit 0
    else
        echo -e "${RED}❌ Unsupported OS. Please install Docker manually.${NC}"
        exit 1
    fi
fi

# Check if Docker Compose is available
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo -e "${YELLOW}⚠️  Docker Compose not found. Installing...${NC}"
    sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
fi

echo -e "${BLUE}📋 Lab Information Setup${NC}"
echo "Please provide some information about your lab:"

# Get lab information from user
read -p "Lab Name (e.g., 'Digital Health Research Lab'): " LAB_NAME
read -p "Your Email (professor email): " PROFESSOR_EMAIL
read -p "Your Name (e.g., 'Dr. Smith'): " PROFESSOR_NAME

# Create .env file from template
echo -e "${BLUE}🔧 Creating environment configuration...${NC}"
if [ -f ".env" ]; then
    echo -e "${YELLOW}⚠️  .env file exists. Creating backup...${NC}"
    cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
fi

cp .env.example .env

# Update .env with lab information
sed -i.bak "s/Your Research Lab Name/$LAB_NAME/" .env
sed -i.bak "s/professor@university.edu/$PROFESSOR_EMAIL/" .env  
sed -i.bak "s/Dr. Your Name/$PROFESSOR_NAME/" .env

# Generate secure secrets
echo -e "${BLUE}🔐 Generating secure secrets...${NC}"
SESSION_SECRET=$(openssl rand -hex 32)
sed -i.bak "s/your-unique-session-secret-change-this-in-production/$SESSION_SECRET/" .env

# Clean up backup files
rm -f .env.bak

echo -e "${BLUE}🐳 Starting Docker containers...${NC}"
docker-compose down 2>/dev/null || true

echo -e "${BLUE}📦 Building containers (this may take a few minutes)...${NC}"
docker-compose up -d --build

# Wait for services to be ready
echo -e "${BLUE}⏳ Waiting for services to start...${NC}"
sleep 30

# Check if services are healthy
echo -e "${BLUE}🏥 Checking service health...${NC}"
for i in {1..30}; do
    if curl -f http://localhost:5000/api/health >/dev/null 2>&1; then
        echo -e "${GREEN}✅ API server is healthy${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${RED}❌ API server health check failed${NC}"
        echo "Check logs with: docker-compose logs app"
        exit 1
    fi
    sleep 2
done

# Setup database
echo -e "${BLUE}🗄️  Setting up database...${NC}"
docker-compose exec -T app npm run db:setup

# Pull AI model
echo -e "${BLUE}🤖 Setting up AI model (this may take several minutes)...${NC}"
docker-compose exec -T ollama ollama pull llama3.1:8b

# Final status check
echo ""
echo -e "${GREEN}🎉 LIA Lab System Setup Complete! 🎉${NC}"
echo ""
echo -e "${BLUE}📍 Access Information:${NC}"
echo "  🌐 Lab Dashboard: http://localhost:5000"
echo "  📧 Email Preview: http://localhost:1080"  
echo "  🗄️  Database Studio: Run 'npm run db:studio'"
echo ""
echo -e "${BLUE}🔑 Default Login Credentials:${NC}"
echo "  👨‍🏫 Professor: admin@lab.local / admin123"
echo "  👩‍🎓 Student 1: student1@lab.local / student123"
echo "  👨‍🎓 Student 2: student2@lab.local / student123"
echo "  👨‍🔬 Postdoc: postdoc1@lab.local / student123"
echo ""
echo -e "${YELLOW}⚠️  Important Next Steps:${NC}"
echo "  1. Login and change default passwords"
echo "  2. Create your real lab members in the system"
echo "  3. Set up your first research projects"
echo "  4. Configure schedule requirements for your lab"
echo ""
echo -e "${BLUE}📚 Useful Commands:${NC}"
echo "  Start system: docker-compose up -d"
echo "  Stop system: docker-compose down"
echo "  View logs: docker-compose logs -f app"
echo "  Backup database: docker-compose exec postgres pg_dump -U lia_user lia_lab > backup.sql"
echo ""
echo -e "${GREEN}Your LIA Lab Intelligence System is ready! 🚀${NC}"
echo ""