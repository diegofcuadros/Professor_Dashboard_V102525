# Lab Intelligence AI Agent (LIA) - Research Team Management System

## Overview

Lab Intelligence AI Agent (LIA) is a comprehensive research team management system designed for academic data science laboratories working with health data projects. The system provides AI-powered insights for managing multiple concurrent research projects, team members, and productivity analytics. LIA transforms traditional chaotic lab management into a streamlined, data-driven operation by automating routine supervisory tasks and providing intelligent recommendations.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Full-Stack Architecture
The application follows a modern full-stack architecture with clear separation of concerns:

**Frontend Layer**
- React 18 with TypeScript for type-safe development
- Component-based architecture using shadcn/ui design system
- TanStack React Query for efficient server state management
- Wouter for lightweight client-side routing
- Tailwind CSS for styling with custom design tokens

**Backend Layer**
- Express.js server with TypeScript
- RESTful API design with structured route handlers
- Modular service-based architecture separating concerns
- Custom storage abstraction layer for database operations

**Database Layer**
- PostgreSQL as primary database using Drizzle ORM
- Type-safe database schema definitions shared between client and server
- Session management integrated with authentication system

### Authentication & Authorization
- Replit Auth integration for secure user authentication
- Role-based access control (Admin/Professor, Student, Postdoc)
- Session-based authentication with PostgreSQL session storage
- Protected routes with middleware validation

### Project Structure
The codebase uses a monorepo structure with clear boundaries:
- `/client` - React frontend application
- `/server` - Express backend with API routes
- `/shared` - Common types, schemas, and utilities
- Component co-location with related logic and styles

### State Management
- Client-side state managed through React Query for server state
- Local component state for UI interactions
- Form state handled through react-hook-form with validation

### UI/UX Architecture
- Design system built on Radix UI primitives
- Responsive design with mobile-first approach
- Consistent theming through CSS custom properties
- Role-specific dashboards (Admin, Student, Postdoc views)
- Data visualization for progress tracking and analytics

### Development Workflow
- TypeScript for type safety across the entire stack
- Vite for fast development and building
- ESM modules throughout the application
- Hot module replacement for efficient development

## External Dependencies

### Database & Storage
- **Neon Database**: Serverless PostgreSQL hosting
- **Drizzle ORM**: Type-safe database toolkit with migration support
- **connect-pg-simple**: PostgreSQL session store for Express

### Authentication
- **Replit Auth**: OpenID Connect authentication system
- **Passport.js**: Authentication middleware strategy

### Frontend Libraries
- **Radix UI**: Unstyled, accessible UI components
- **TanStack React Query**: Server state management
- **React Hook Form**: Form handling and validation
- **Tailwind CSS**: Utility-first CSS framework
- **Lucide React**: Icon library
- **date-fns**: Date manipulation utilities

### Development Tools
- **Vite**: Build tool and development server
- **TypeScript**: Type checking and development experience
- **ESBuild**: Fast JavaScript bundler for production builds

### Validation & Types
- **Zod**: Runtime type validation
- **drizzle-zod**: Integration between Drizzle and Zod for schema validation

The system is designed to be scalable, maintainable, and provide a smooth development experience while delivering powerful research team management capabilities.