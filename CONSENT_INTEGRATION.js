// Add this to your backend/server.js file

const consentRoutes = require('./routes/consentRoutes');

// Mount the consent routes (add to your app.use() section)
app.use('/api', consentRoutes);

// Example placement in server.js:
// app.use('/api/auth', authRoutes);
// app.use('/api/appointments', appointmentRoutes);
// app.use('/api', consentRoutes); // Add this line
