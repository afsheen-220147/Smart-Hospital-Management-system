# Smart Hospital Management System (Backend)

## 📌 Project Overview
The Smart Hospital Management System is an advanced, production-ready MERN stack application designed to streamline hospital operations, patient management, doctor scheduling, and medical records handling. The backend is powered by Node.js, Express, and MongoDB, heavily utilizing modern AI-driven features to assist with diagnoses, symptom analysis, patient recommendations, and medical report summarization.

## 🛠 Tech Stack
- **Runtime:** Node.js
- **Framework:** Express.js 5.x
- **Database:** MongoDB (with Mongoose ODM)
- **Authentication:** JWT (JSON Web Tokens), bcryptjs, Google Auth Library
- **Artificial Intelligence:** Groq API (Llama-3.3-70b-versatile)
- **Uploads & Storage:** Multer, Cloudinary
- **Email Services:** Nodemailer
- **Security:** Helmet, Express Rate Limit, CORS
- **OCR:** Tesseract.js

## 🗄 Backend Architecture
The backend follows the MVC (Model-View-Controller) architecture, separating business logic, routing, and database interactions securely. 

```text
backend/
├── config/           # Database & Cloudinary configurations
├── controllers/      # Route handlers & business logic
├── middleware/       # Custom auth, role-guards, and error handlers
├── models/           # Mongoose schemas (User, Patient, Doctor, Appointment, Visit, Waitlist)
├── routes/           # Express router configuration 
├── services/         # Encapsulated logic like AI Service, Availability Service
├── uploads/          # Temporary local file storage
├── utils/            # Utilities (Tokens, Parsers, Email Templates)
├── seeder.js         # DB initial seeding script
└── server.js         # Application entry point
```

## 🔌 API Modules & Structure
The API strictly follows RESTful principles and is versioned under `/api/v1/`.

| Module | Base Route | Description |
|--------|------------|-------------|
| **Auth** | `/auth` | Handles registration, login, JWT issuance, and Google OAuth. |
| **Patients** | `/patients` | CRUD operations for patient records and history. |
| **Doctors** | `/doctors` | Doctor profiles, specialties, and schedules. |
| **Appointments** | `/appointments` | Booking, modifying, and tracking appointments. |
| **Visits** | `/visits` | Post-appointment medical records and updates. |
| **Scheduling** | `/scheduling` | Slot generation and availability validation. |
| **Admin** | `/admin` | Elevated operations across users and configurations. |
| **AI** | `/ai` | Groq-powered endpoints supporting all intelligent features. |
| **Uploads** | `/uploads` | Handles file/report uploads securely via Cloudinary. |

## 🔐 Authentication Flow
- **Local Authentication:** Users authenticate via email and password. Passwords are automatically salted and hashed using `bcryptjs` via Mongoose's pre-save hooks.
- **Provider Authentication:** Supports single sign-on (SSO) via Google (`google-auth-library`).
- **Authorization:** Handled via middleware:
  - `authMiddleware.js` verifies the presence and signature of the `Bearer` JWT.
  - `roleMiddleware.js` scopes endpoints to verify if the authed user role matches: `patient`, `doctor`, or `admin`.

## 🤖 AI Features (Powered by Groq)
A specialized `aiService.js` natively integrates the Llama 3.3 model to perform heavily capable medical intelligence operations:
1. **Symptom Analyzer:** Parses symptoms, estimates urgency, and recommends the appropriate specialist.
2. **Medical Report Summarization:** Automatically extracts core findings, vital signs, and abnormal values from raw lab reports.
3. **Smart Appointment Recommender:** Suggests optimal times and specific doctors based on existing conditions and doctor loads.
4. **Prescription Safety Check:** Cross-references prescriptions with a patient's known allergies, medical history, and medications to vividly flag drug interactions and contraindications.
5. **Emergency Detection:** Intercepts critical symptoms dynamically rendering an immediate priority tag to emergency wards.
6. **Chat Medical Assistant:** Integrated conversational chatbot (`MediCare+ AI`) providing basic health guidance and quick navigation to application workflows.

## 🗝 Environment Variables
Configure a `.env` file within the `/backend` directory based closely on `.env.example`:
```env
PORT=5000
NODE_ENV=development
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
FRONTEND_URL=http://localhost:3000
GROQ_API_KEY=your_groq_api_key
CLOUDINARY_CLOUD_NAME=name
CLOUDINARY_API_KEY=key
CLOUDINARY_API_SECRET=secret
EMAIL_USER=your_email
EMAIL_PASS=your_password
```

## 🚀 How to Run the Project
1. **Navigate to backend codebase:** 
   ```bash
   cd backend
   ```
2. **Install dependencies:** 
   ```bash
   npm install --legacy-peer-deps
   ```
3. **Seed the database (Optional):** 
   ```bash
   npm run data:import
   ```
4. **Boot the server locally:** 
   ```bash
   npm run dev
   # Server bootstraps successfully on http://localhost:5000
   ```

## 🐛 Error Handling & Validation
- **Global Express Exception Handler:** All unhandled promise rejections and general routing errors pass cleanly through a singular custom error handling middleware injected inside `server.js` guaranteeing standardized `.json` response shapes.
- **Mongoose Validation:** Models encompass deep schema validations strictly controlling structure, required fields, and preventing accidental insertion of incorrect/unformatted data properties.

## 🌟 Future Improvements
- **Caching Layer Integration:** Embedding Redis caching for high-frequency or repetitive AI prompt inferences securely to slash model expenses.
- **Real-Time Architectures:** Introduction of socket architectures (e.g. `Socket.io`) enabling fully real-time hospital to patient web push notifications.
- **Microservices Shift:** Decoupling heavily utilized routes (like the expansive AI service or Email) via queues like Kafka or RabbitMQ.
