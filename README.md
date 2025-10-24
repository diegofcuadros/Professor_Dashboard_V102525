# LIA - Lab Intelligence AI Agent 🧪

**Single Lab Management System for Research Teams**

A comprehensive lab management system designed for research professors to efficiently manage 10-15 graduate students and postdocs. Built with 100% open source technologies for academic use.

## 🎯 What LIA Does

LIA transforms chaotic research team management into a streamlined, AI-powered operation by providing:

- **📅 20-Hour Weekly Schedule Management** - Mandatory schedule submission and approval workflow
- **⏰ Smart Time Tracking** - Check-in/check-out system with compliance monitoring  
- **🤖 AI-Powered Analytics** - Local LLM analysis of student progress and productivity patterns
- **📧 Automated Communications** - Daily professor digests and student reminders
- **📊 Project Management** - Multi-project assignment and progress tracking
- **🎯 Predictive Insights** - Early warning system for struggling students

## 🚀 Quick Start

### Prerequisites
- Docker Desktop installed
- 4GB+ RAM available
- 10GB+ disk space

### One-Command Setup

**Windows:**
```cmd
scripts\setup-lab.bat
```

**Mac/Linux:**
```bash
./scripts/setup-lab.sh
```

This will:
1. Set up all services (database, AI, email, web app)
2. Create sample lab members
3. Initialize with demo projects
4. Pull the local AI model

### Access Your Lab System

- **🌐 Main Dashboard**: http://localhost:5000
- **📧 Email Preview**: http://localhost:1080 
- **🗄️ Database Studio**: `npm run db:studio`

### Default Credentials
- **Professor**: admin@lab.local / admin123
- **Students**: student1@lab.local / student123
- **Postdoc**: postdoc1@lab.local / student123

## 📋 Development Status

### ✅ Phase 1: Foundation (COMPLETE)
- Multi-user system with role-based dashboards
- Project and task management
- Real-time notifications
- PostgreSQL database with complete schema
- React frontend with modern UI components

### 🚧 Phase 2: Schedule Management (NEXT - Week 3-4)
- 20-hour weekly schedule requirement
- Professor approval workflow
- Time tracking check-in/check-out
- Schedule compliance monitoring

### 🎯 Upcoming Phases
- **Phase 3**: Real AI analysis with Llama 3.1
- **Phase 4**: Email automation system  
- **Phase 5**: Advanced dashboard features
- **Phase 6**: External integrations

## 🏗️ Architecture

### Technology Stack
- **Frontend**: React + TypeScript + Shadcn/UI
- **Backend**: Node.js + Express + Drizzle ORM
- **Database**: PostgreSQL 15
- **AI/ML**: Ollama + Llama 3.1 8B + Python scikit-learn
- **Cache**: Redis 7
- **Email**: NodeMailer + MailDev
- **Deployment**: Docker Compose

### Service Overview
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React App     │    │   Express API   │    │   PostgreSQL    │
│   (Frontend)    │◄──►│   (Backend)     │◄──►│   (Database)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
       ┌─────────────────┬─────────────────┬─────────────────┐
       │     Ollama      │      Redis      │    MailDev      │
       │   (Local AI)    │   (Cache/Jobs)  │   (Email Test)  │
       └─────────────────┴─────────────────┴─────────────────┘
```

## 🛠️ Development

### Local Development Setup
```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Start development server
npm run dev

# Or use Docker for full development environment
npm run docker:dev
```

> After copying the environment template, provide values for the new `GOOGLE_API_KEY`, `GEMINI_*`, and `R2_*` variables so the retrieval-augmented generation (RAG) services can connect to Gemini and Cloudflare R2.

### Key Scripts
```bash
npm run dev           # Start development server
npm run db:setup      # Initialize database with sample data
npm run db:studio     # Open database management UI
npm run docker:dev    # Full Docker development environment
npm run docker:prod   # Production Docker deployment
```

### Project Structure
```
lia-lab-system/
├── client/src/           # React frontend
│   ├── components/       # UI components
│   ├── pages/           # Route pages
│   ├── hooks/           # Custom React hooks
│   └── lib/             # Utilities
├── server/              # Express backend
│   ├── routes.ts        # API endpoints
│   ├── auth.ts          # Authentication
│   ├── db.ts            # Database connection
│   ├── storage.ts       # Data access layer
│   ├── ai-engine.ts     # AI analytics
│   └── websocket.ts     # Real-time notifications
├── shared/              # Shared types and schemas
├── scripts/             # Setup and maintenance scripts
└── database/            # Database migrations and seeds
```

## 🎯 Core Features

### For Professors
- **📊 Real-time Lab Dashboard** - See who's working, hours logged, project progress
- **⚠️ Early Warning System** - AI detects struggling students 2-3 weeks early
- **📧 Daily 5-Minute Digest** - Email summary of lab status and alerts
- **📈 Data-Driven Mentoring** - Productivity insights and intervention recommendations
- **📝 Automated Reports** - Grant application and progress reports

### For Students  
- **📅 Structured Schedule** - 20-hour weekly requirement with flexibility
- **📊 Personal Analytics** - Understand your productivity patterns
- **🎯 AI Recommendations** - Personalized suggestions for improvement
- **📈 Progress Transparency** - Clear view of your research advancement
- **🏆 Recognition System** - Acknowledgment of consistent progress

### AI-Powered Features
- **Progress Update Analysis** - Sentiment and blocker detection
- **Productivity Pattern Recognition** - Optimal working times identification
- **Risk Assessment** - Deadline and burnout risk prediction
- **Intervention Recommendations** - Personalized support strategies
- **Comparative Analytics** - Benchmarking and trend analysis

## 📈 Expected Benefits

Based on the LIA specification, you can expect:

- **⏱️ 5-7 hours/week saved** on student management
- **📈 25-30% productivity increase** across lab members
- **🚨 Early intervention** prevents student struggles
- **📊 Complete project visibility** and accountability
- **🤝 Improved communication** between professor and students

## 🔧 Configuration

### Lab Settings
Edit `.env` file to customize:
- Lab name and professor information
- Schedule requirements (default 20 hours/week)
- Email notification timing
- AI model preferences

### Schedule Requirements
```env
MINIMUM_WEEKLY_HOURS=20
SCHEDULE_APPROVAL_REQUIRED=true
CHECK_IN_REMINDER_HOUR=9
DAILY_DIGEST_HOUR=18
```

## 📚 Usage Guide

### Getting Started
1. **Setup Lab Information** - Run setup script with your lab details
2. **Create Lab Members** - Add your actual students and postdocs
3. **Define Projects** - Set up your current research projects
4. **Configure Schedules** - Set weekly hour requirements
5. **Enable Notifications** - Configure email digest preferences

### Daily Workflow
1. **Students**: Submit weekly schedules, check-in/out, update progress
2. **Professor**: Review daily digest, approve schedules, monitor alerts
3. **System**: Analyzes patterns, generates insights, sends notifications

## 🐳 Docker Deployment

### Development
```bash
docker-compose up -d
```

### Production
```bash
# Use production configuration
docker-compose -f docker-compose.prod.yml up -d

# Or use the npm script
npm run docker:prod
```

### Service Management
```bash
# View logs
docker-compose logs -f app

# Restart services
docker-compose restart

# Update system
git pull && docker-compose up -d --build

# Backup database
docker-compose exec postgres pg_dump -U lia_user lia_lab > backup_$(date +%Y%m%d).sql
```

## 🆘 Support & Troubleshooting

### Common Issues

**Services won't start:**
```bash
# Check Docker is running
docker info

# Check port availability
netstat -an | grep :5000

# View detailed logs
docker-compose logs
```

**Database connection errors:**
```bash
# Reset database
docker-compose down -v
docker-compose up -d
npm run db:setup
```

**AI model not working:**
```bash
# Manually pull model
docker-compose exec ollama ollama pull llama3.1:8b

# Check Ollama status
curl http://localhost:11434/api/tags
```

### Getting Help
1. Check the logs: `docker-compose logs -f`
2. Verify services: `docker-compose ps`
3. Test health: `curl http://localhost:5000/api/health`

## 🎯 Roadmap

### Phase 2 (Week 3-4) - Schedule Management
- [ ] 20-hour weekly schedule requirement
- [ ] Professor approval workflow
- [ ] Check-in/check-out system
- [ ] Compliance monitoring dashboard

### Phase 3 (Week 5-6) - AI Intelligence  
- [ ] Real Llama 3.1 integration
- [ ] Progress update analysis
- [ ] Productivity pattern detection
- [ ] Risk assessment algorithms

### Phase 4 (Week 7-8) - Communication
- [ ] Email automation system
- [ ] Daily digest generation
- [ ] Student reminder system
- [ ] Alert escalation logic

### Phase 5 (Week 9-10) - Advanced Features
- [ ] Enhanced dashboards
- [ ] Report generation
- [ ] Mobile optimization
- [ ] Performance analytics

### Phase 6 (Week 11-12) - Integration
- [ ] GitHub/GitLab integration
- [ ] Calendar synchronization
- [ ] Production deployment
- [ ] Documentation & training

## 📄 License

MIT License - Free for academic and research use

## 🤝 Contributing

This is designed as a single-lab system. For feature requests or bug reports, please create an issue describing your lab's specific needs.

---

**🧪 Transform your research lab management with AI-powered intelligence! 🚀**
