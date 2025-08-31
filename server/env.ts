// Environment variable loader for production
// Railway automatically provides environment variables

export function loadEnvironment() {
  // Railway provides PORT automatically
  process.env.PORT = process.env.PORT || '5000';
  
  // Set NODE_ENV if not provided
  process.env.NODE_ENV = process.env.NODE_ENV || 'production';
  
  // Log configuration (for debugging)
  if (process.env.NODE_ENV === 'development') {
    console.log('Environment:', {
      NODE_ENV: process.env.NODE_ENV,
      PORT: process.env.PORT,
      DATABASE_URL: process.env.DATABASE_URL ? '***configured***' : 'missing',
      AI_ANALYSIS_ENABLED: process.env.AI_ANALYSIS_ENABLED,
    });
  }
}