# Database Query Guide for Assignment Records

This document provides SQL queries to manually check assignment records in the `project_assignments` table.

## Database Connection

Based on the `.env` file, the database connection details are:
- **Database Type**: PostgreSQL
- **Connection String**: `postgresql://lia_user:lia_password@localhost:5432/lia_lab`

## Useful SQL Queries

### 1. Check All Assignment Records

```sql
-- Get all project assignments with user and project details
SELECT 
    pa.id as assignment_id,
    pa.user_id,
    pa.project_id,
    pa.role as assignment_role,
    pa.is_active,
    pa.created_at as assigned_at,
    u.first_name,
    u.last_name,
    u.email,
    u.role as user_role,
    p.name as project_name,
    p.description as project_description,
    p.status as project_status,
    p.project_type
FROM project_assignments pa
JOIN users u ON pa.user_id = u.id
JOIN projects p ON pa.project_id = p.id
ORDER BY pa.created_at DESC;
```

### 2. Count Assignments by User Role

```sql
-- Count how many assignments each user role has
SELECT 
    u.role,
    COUNT(pa.id) as assignment_count,
    COUNT(CASE WHEN pa.is_active = true THEN 1 END) as active_assignments
FROM users u
LEFT JOIN project_assignments pa ON u.id = pa.user_id
GROUP BY u.role
ORDER BY assignment_count DESC;
```

### 3. Recent Assignments (Last 7 Days)

```sql
-- Show assignments created in the last 7 days
SELECT 
    pa.created_at,
    u.first_name || ' ' || u.last_name as student_name,
    u.email,
    p.name as project_name,
    pa.role as assignment_role
FROM project_assignments pa
JOIN users u ON pa.user_id = u.id
JOIN projects p ON pa.project_id = p.id
WHERE pa.created_at >= NOW() - INTERVAL '7 days'
ORDER BY pa.created_at DESC;
```

### 4. Students Without Project Assignments

```sql
-- Find students who don't have any project assignments
SELECT 
    u.id,
    u.first_name,
    u.last_name,
    u.email,
    u.created_at
FROM users u
LEFT JOIN project_assignments pa ON u.id = pa.user_id
WHERE u.role = 'student' 
    AND pa.id IS NULL
ORDER BY u.created_at DESC;
```

### 5. Projects Without Assignments

```sql
-- Find projects that haven't been assigned to anyone
SELECT 
    p.id,
    p.name,
    p.description,
    p.status,
    p.created_at
FROM projects p
LEFT JOIN project_assignments pa ON p.id = pa.project_id
WHERE pa.id IS NULL
ORDER BY p.created_at DESC;
```

### 6. Detailed Assignment Overview

```sql
-- Comprehensive view of all assignments with statistics
SELECT 
    p.name as project_name,
    p.status as project_status,
    COUNT(pa.id) as total_assigned_students,
    COUNT(CASE WHEN pa.is_active = true THEN 1 END) as active_assignments,
    STRING_AGG(u.first_name || ' ' || u.last_name, ', ') as assigned_students
FROM projects p
LEFT JOIN project_assignments pa ON p.id = pa.project_id AND pa.is_active = true
LEFT JOIN users u ON pa.user_id = u.id
GROUP BY p.id, p.name, p.status
ORDER BY total_assigned_students DESC;
```

### 7. Assignment Creation Timeline

```sql
-- Show assignment creation timeline
SELECT 
    DATE(pa.created_at) as assignment_date,
    COUNT(*) as assignments_created
FROM project_assignments pa
GROUP BY DATE(pa.created_at)
ORDER BY assignment_date DESC
LIMIT 30;
```

## Database Schema Verification

### Check Table Structure

```sql
-- Verify project_assignments table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'project_assignments'
ORDER BY ordinal_position;
```

### Check Foreign Key Relationships

```sql
-- Verify foreign key constraints
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name = 'project_assignments';
```

## Database Management Tools

You can access the PostgreSQL database using:

### 1. psql Command Line
```bash
psql "postgresql://lia_user:lia_password@localhost:5432/lia_lab"
```

### 2. Drizzle Studio (Recommended)
```bash
npm run db:studio
```
This will open a web interface at `http://localhost:4983` to browse and query the database visually.

### 3. Other GUI Tools
- pgAdmin
- DBeaver
- DataGrip
- Postico (Mac)

## Troubleshooting

### Common Issues

1. **Connection Refused**: PostgreSQL service not running
   ```bash
   # Start PostgreSQL (depends on your setup)
   sudo systemctl start postgresql  # Linux
   brew services start postgresql@14  # macOS with Homebrew
   ```

2. **Authentication Failed**: Check credentials in `.env`
   - Verify `DATABASE_URL` is correct
   - Ensure user `lia_user` exists and has permissions

3. **Table Does Not Exist**: Run migrations
   ```bash
   npm run db:push
   ```

4. **No Data**: Database needs seeding
   ```bash
   npm run db:setup
   ```

## Testing Assignment Creation

To test if assignment creation is working:

1. **Create Test Data** (if needed):
   ```bash
   npx tsx scripts/seed-database.js
   ```

2. **Login as Admin/Professor**:
   - Email: `admin@lab.local`
   - Password: `admin123`

3. **Create Assignment**:
   - Go to Project Management
   - Click "Assign" on a project
   - Select a student
   - Submit

4. **Verify in Database**:
   ```bash
   node scripts/check-assignments.js
   ```
   
   Or use SQL:
   ```sql
   SELECT * FROM project_assignments ORDER BY created_at DESC LIMIT 5;
   ```