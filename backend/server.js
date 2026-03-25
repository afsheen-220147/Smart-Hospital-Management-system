const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');
const appointmentAutoUpdateService = require('./services/appointmentAutoUpdateService');
const cron = require('node-cron');
const doctorStatusService = require('./utils/doctorStatusService');

// Load env vars
dotenv.config();

// Route files
const authRoutes = require('./routes/authRoutes');
const patientRoutes = require('./routes/patientRoutes');
const doctorRoutes = require('./routes/doctorRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');
const visitRoutes = require('./routes/visitRoutes');
const adminDoctorRoutes = require('./routes/adminDoctorRoutes');
const schedulingRoutes = require('./routes/schedulingRoutes');
const aiRoutes = require('./routes/aiRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const adminRoutes = require('./routes/adminRoutes');
const consentRoutes = require('./routes/consentRoutes');
const adminApprovalRoutes = require('./routes/adminApprovalRoutes');

const app = express();

// Security middleware - Helmet with custom config for dev
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginOpenerPolicy: false // Allow Google OAuth postMessage
}));
app.use((req, res, next) => {
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
  next();
});

// Rate limiting - higher limit for development, stricter for production
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 1000,
  message: {
    success: false,
    message: 'Too many requests, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Apply rate limiting to API routes
app.use('/api/', limiter);

// Body parser
app.use(express.json({ limit: '10mb' }));

// Cookie parser
app.use(cookieParser());

// Enable CORS with configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// ==========================================
// FIX #3: Prevent aggressive caching
// ==========================================
app.use((req, res, next) => {
  // Disable caching for all API responses
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  next();
});

// Mount routers
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/patients', patientRoutes);
app.use('/api/v1/doctor', doctorRoutes); // Standardize to /doctor to match frontend calls
app.use('/api/v1/doctors', doctorRoutes); // Keep /doctors for backward compatibility
app.use('/api/v1/appointments', appointmentRoutes);
app.use('/api/v1/visits', visitRoutes);
app.use('/api/v1/admin-doctors', adminDoctorRoutes);
app.use('/api/v1/scheduling', schedulingRoutes);
app.use('/api/v1/ai', aiRoutes);
app.use('/api/v1/uploads', uploadRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/admin-approval', adminApprovalRoutes);
app.use('/api/v1/consent', consentRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Minimal Public Stats Endpoint
app.get('/api/v1/public/stats', async (req, res) => {
  try {
    const User = require('./models/User');
    const Doctor = require('./models/Doctor');
    const Appointment = require('./models/Appointment');
    
    // Fallback counts using estimatedDocumentCount for speed and safety
    const patientsCount = await User.estimatedDocumentCount() || 0;
    const doctorsCount = await Doctor.estimatedDocumentCount() || 0;
    const apptsCount = await Appointment.estimatedDocumentCount() || 0;
    
    res.json({
      success: true,
      data: { patients: patientsCount, doctors: doctorsCount, appointments: apptsCount, departments: 12 }
    });
  } catch (error) {
    res.status(500).json({ success: false, data: { patients: 50, doctors: 20, appointments: 120, departments: 12 }});
  }
});

// Error Handler Middleware
app.use((err, req, res, next) => {
    const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
    res.status(statusCode).json({
        success: false,
        message: err.message,
        stack: process.env.NODE_ENV === 'production' ? null : err.stack,
    });
});

const PORT = process.env.PORT || 5000;

// Initialize server and start services
const initializeServer = async () => {
  try {
    // Connect to database first
    await connectDB();
    console.log('✅ Connected to MongoDB');

    // Start the appointment auto-update job
    appointmentAutoUpdateService.startAppointmentAutoUpdateJob();

    // Start the doctor status update cron job (runs every 5 minutes)
    cron.schedule('*/5 * * * *', async () => {
      try {
        await doctorStatusService.updateAllDoctorsStatus();
      } catch (error) {
        console.error('❌ Error in doctor status update cron job:', error.message);
      }
    });
    console.log('✅ Doctor status update cron job started (every 5 minutes)');

    // Add MongoDB connection event handlers
    const mongoose = require('mongoose');
    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️  MongoDB disconnected');
    });
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err.message);
    });
  } catch (error) {
    console.error('❌ Failed to initialize server:', error.message);
    process.exit(1);
  }
};

// Start server
const server = app.listen(PORT, async () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
  await initializeServer();
});

// Handle port already in use
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`\n⚠️  Port ${PORT} is already in use. Attempting to free it...`);
    const { execSync } = require('child_process');
    const isWin = process.platform === 'win32';
    
    try {
      if (isWin) {
        // Find PID manually on Windows
        const output = execSync(`netstat -ano | findstr :${PORT}`).toString();
        const lines = output.split('\n');
        const listeningLine = lines.find(line => line.includes('LISTENING'));
        if (listeningLine) {
          const parts = listeningLine.trim().split(/\s+/);
          const pid = parts[parts.length - 1];
          if (pid && pid !== '0') {
            console.log(`Found process ${pid} using port ${PORT}. Killing...`);
            execSync(`taskkill /F /PID ${pid}`);
          }
        }
      } else {
        execSync(`fuser -k ${PORT}/tcp`, { stdio: 'ignore' });
      }
      
      console.log(`✅ Port ${PORT} freed. Restarting...\n`);
      setTimeout(() => {
        server.listen(PORT);
      }, 1500);
    } catch (e) {
      console.error(`❌ Could not free port ${PORT}. Please manually kill the process.`);
      process.exit(1);
    }
  } else {
    throw err;
  }
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.log(`Error: ${err.message}`);
  appointmentAutoUpdateService.stopAppointmentAutoUpdateJob();
  // Close server & exit process
  server.close(() => process.exit(1));
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  appointmentAutoUpdateService.stopAppointmentAutoUpdateJob();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
