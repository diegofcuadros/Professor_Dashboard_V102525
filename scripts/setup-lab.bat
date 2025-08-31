@echo off
setlocal enabledelayedexpansion

REM LIA Lab Management System - Windows Setup Script
REM For single research lab deployment

echo.
echo 🧪 =============================================
echo     LIA - Lab Intelligence AI Agent
echo     Single Lab Management System Setup
echo ============================================= 🧪
echo.

REM Check if we're in the right directory
if not exist "package.json" (
    echo ❌ Error: Must run from LIA project root directory
    pause
    exit /b 1
)

REM Check if Docker is installed
docker --version >nul 2>&1
if errorlevel 1 (
    echo ⚠️  Docker not found. Please install Docker Desktop from:
    echo https://www.docker.com/products/docker-desktop
    pause
    exit /b 1
)

REM Check if Docker Compose is available
docker-compose --version >nul 2>&1
if errorlevel 1 (
    docker compose version >nul 2>&1
    if errorlevel 1 (
        echo ❌ Docker Compose not found. Please ensure Docker Desktop is properly installed.
        pause
        exit /b 1
    )
)

echo 📋 Lab Information Setup
echo Please provide some information about your lab:
echo.

REM Get lab information from user
set /p LAB_NAME="Lab Name (e.g., 'Digital Health Research Lab'): "
set /p PROFESSOR_EMAIL="Your Email (professor email): "
set /p PROFESSOR_NAME="Your Name (e.g., 'Dr. Smith'): "

REM Create .env file from template
echo 🔧 Creating environment configuration...
if exist ".env" (
    echo ⚠️  .env file exists. Creating backup...
    for /f "tokens=2-4 delims=/ " %%a in ('date /t') do (set mydate=%%c%%a%%b)
    for /f "tokens=1-2 delims=/:" %%a in ("%TIME%") do (set mytime=%%a%%b)
    copy ".env" ".env.backup.!mydate!_!mytime!"
)

copy ".env.example" ".env"

REM Update .env with lab information (simplified for Windows)
powershell -Command "(gc .env) -replace 'Your Research Lab Name', '%LAB_NAME%' | Out-File -encoding ASCII .env"
powershell -Command "(gc .env) -replace 'professor@university.edu', '%PROFESSOR_EMAIL%' | Out-File -encoding ASCII .env"
powershell -Command "(gc .env) -replace 'Dr. Your Name', '%PROFESSOR_NAME%' | Out-File -encoding ASCII .env"

echo 🔐 Generating secure secrets...
REM Simple session secret generation for Windows
set SESSION_SECRET=%RANDOM%%RANDOM%%RANDOM%%RANDOM%
powershell -Command "(gc .env) -replace 'your-unique-session-secret-change-this-in-production', '%SESSION_SECRET%' | Out-File -encoding ASCII .env"

echo 🐳 Starting Docker containers...
docker-compose down 2>nul

echo 📦 Building containers (this may take a few minutes)...
docker-compose up -d --build

REM Wait for services to be ready
echo ⏳ Waiting for services to start...
timeout /t 30 /nobreak >nul

REM Check if services are healthy
echo 🏥 Checking service health...
for /l %%i in (1,1,30) do (
    curl -f http://localhost:5000/api/health >nul 2>&1
    if !errorlevel! equ 0 (
        echo ✅ API server is healthy
        goto :health_ok
    )
    timeout /t 2 /nobreak >nul
)
echo ❌ API server health check failed
echo Check logs with: docker-compose logs app
pause
exit /b 1

:health_ok

REM Setup database
echo 🗄️  Setting up database...
docker-compose exec -T app npm run db:setup

REM Pull AI model
echo 🤖 Setting up AI model (this may take several minutes)...
docker-compose exec -T ollama ollama pull llama3.1:8b

REM Final status
echo.
echo 🎉 LIA Lab System Setup Complete! 🎉
echo.
echo 📍 Access Information:
echo   🌐 Lab Dashboard: http://localhost:5000
echo   📧 Email Preview: http://localhost:1080
echo   🗄️  Database Studio: Run 'npm run db:studio'
echo.
echo 🔑 Default Login Credentials:
echo   👨‍🏫 Professor: admin@lab.local / admin123
echo   👩‍🎓 Student 1: student1@lab.local / student123
echo   👨‍🎓 Student 2: student2@lab.local / student123
echo   👨‍🔬 Postdoc: postdoc1@lab.local / student123
echo.
echo ⚠️  Important Next Steps:
echo   1. Login and change default passwords
echo   2. Create your real lab members in the system
echo   3. Set up your first research projects
echo   4. Configure schedule requirements for your lab
echo.
echo 📚 Useful Commands:
echo   Start system: docker-compose up -d
echo   Stop system: docker-compose down
echo   View logs: docker-compose logs -f app
echo.
echo Your LIA Lab Intelligence System is ready! 🚀
echo.
pause