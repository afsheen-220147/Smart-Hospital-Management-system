# Strict Authentication Flow Implementation

## 📋 Your Exact Requirements

```
REGISTRATION (PATIENT)
- User registers using:
  a) Email + Password
  b) Google OAuth
- If Email registration:
  → Send OTP to Gmail
  → Verify OTP before account creation
- If Google OAuth:
  → After OAuth success:
     - Ask for additional required fields
     - Ask for password + confirm password
     - Then store user

LOGIN
- Only registered users can login
- Login uses:
  → Gmail + Password
  or google login

DOCTOR REGISTRATION
- Doctor must register with email ending: @rguktn.ac.in ONLY
- Those @rguktn.ac.in mail must be an approved mail from admin
- If admin has already added those gmail then doctor registers for first time
  → Doctor can login afterwards
```

---

## ✅ IMPLEMENTATION VERIFICATION

### **PATIENT EMAIL REGISTRATION** ✅ MATCHES YOUR SPEC

**Flow:**

```
1. User clicks "Register with Email"
2. Enter: name, email, password, confirm password, role (patient)
3. Click "Send Verification OTP"
4. ❌ NO AUTO-LOGIN
5. Backend validates password strength
6. Backend checks if email already exists
7. Backend sends OTP to Gmail inbox
8. User enters 4-digit OTP code
9. Backend verifies OTP (10-minute expiry)
10. Backend creates User record in database:
    - name, email, password (bcrypt hashed)
    - role: 'patient'
    - authProvider: ['local']
11. Backend creates Patient profile
12. ✅ Response: success=true (NO token returned)
13. Frontend redirects to /login page
14. User now logs in: email + password
15. Backend generates token, redirects to dashboard
```

**Key Points:**

- ✅ Basic details + password mandatory
- ✅ Stored in database BEFORE login
- ✅ OTP verification required
- ✅ NO auto-login after registration
- ✅ Must login separately

**Code Verification:**

- [registerSendOtp](backend/controllers/authController.js#L51) - Sends OTP
- [registerVerifyOtp](backend/controllers/authController.js#L104) - Creates user, NO token returned
- [Frontend Register.jsx](frontend/src/pages/public/Register.jsx#L160) - Sends OTP, verifies

---

### **PATIENT GOOGLE OAUTH REGISTRATION** ✅ MATCHES YOUR SPEC

**Flow:**

```
1. User clicks "Sign up with Google"
2. Google authentication popup
3. Google returns: name, email, googleId
4. Frontend checks if user exists (POST /auth/google)
5. If new user: Frontend moves to Step 2
6. ❌ NO AUTO-LOGIN
7. Step 2: Select role (Patient/Doctor)
8. User selects: Patient
9. ✅ No @rguktn.ac.in restriction for patients
10. Step 3: Set Password
    - Enter password
    - Confirm password
    - Backend validates password strength
11. Frontend sends: idToken, role, password, confirmPassword
    - POST /auth/google-register
12. Backend verifies Google token
13. Backend creates User record:
    - name, email, googleId, password (bcrypt)
    - role: 'patient'
    - authProvider: ['google', 'local']
14. Backend creates Patient profile
15. ✅ Response: success=true (NO token returned)
16. Frontend redirects to /login page
17. User logs in with email + password (or Google again)
18. Backend generates token, redirects to dashboard
```

**Key Points:**

- ✅ Ask for role selection (Patient/Doctor)
- ✅ Ask for password + confirm password
- ✅ Password is mandatory (user sets it)
- ✅ Stored in database BEFORE login
- ✅ NO auto-login after registration
- ✅ Can login with email+password OR Google again

**Code Verification:**

- [googleRegister](backend/controllers/authController.js#L385) - Creates user, NO token returned
- [Frontend Register.jsx](frontend/src/pages/public/Register.jsx#L130-L150) - Google flow with password

---

### **DOCTOR EMAIL REGISTRATION** ✅ MATCHES YOUR SPEC

**Flow:**

```
1. User clicks "Register with Email"
2. Enter: name, email, password, confirm password
3. Select role: DOCTOR
4. Check email format:
   ❌ If NOT @rguktn.ac.in: ERROR "Not authorized to register as doctor"
   ✅ If @rguktn.ac.in: Continue
5. Check admin pre-approval list (AdminDoctor collection):
   ❌ If NOT in list: ERROR "Email not authorized by admin"
   ✅ If in list: Continue
6. Backend validates password strength
7. Backend sends OTP to Gmail
8. User enters 4-digit OTP
9. Backend verifies OTP
10. Backend creates User record:
    - name, email, password (bcrypt)
    - role: 'doctor'
    - authProvider: ['local']
11. Backend creates Doctor profile
12. Backend AUTO-APPROVES doctor (because in AdminDoctor list):
    - isApproved: true
    - approvalDate: now
13. ✅ Response: success=true (NO token returned)
14. Frontend redirects to /login page
15. User logs in: email + password
16. Backend checks doctor.isApproved (✅ already true)
17. Backend generates token, redirects to dashboard
```

**Key Points:**

- ✅ Email MUST end with @rguktn.ac.in
- ✅ Email MUST be in AdminDoctor pre-approved list
- ✅ Password is mandatory
- ✅ OTP verification required
- ✅ Stored in database BEFORE login
- ✅ AUTO-APPROVED only if admin pre-approved the email
- ✅ NO auto-login after registration
- ✅ Must login separately

**Code Verification:**

- [registerSendOtp](backend/controllers/authController.js#L78-L86) - Validates @rguktn.ac.in and AdminDoctor
- [registerVerifyOtp](backend/controllers/authController.js#L135-L148) - Auto-approves if in AdminDoctor
- [Frontend Register.jsx](frontend/src/pages/public/Register.jsx#L400-L410) - Doctor role selection with restriction

---

### **DOCTOR GOOGLE OAUTH REGISTRATION** ✅ MATCHES YOUR SPEC

**Flow:**

```
1. User clicks "Sign up with Google" with @rguktn.ac.in email
2. Google authentication successful
3. Google returns: name, email (must be @rguktn.ac.in)
4. Frontend checks if user exists (POST /auth/google)
5. If new user: Frontend moves to Step 2
6. ❌ NO AUTO-LOGIN
7. Step 2: Select role
8. User selects: DOCTOR
9. Check email format:
   ❌ If NOT @rguktn.ac.in: ERROR "Doctor registration requires @rguktn.ac.in"
   ✅ If @rguktn.ac.in: Continue to Step 3
10. Check admin pre-approval (AdminDoctor collection):
    ❌ If NOT in list: ERROR "Email not authorized by admin"
    ✅ If in list: Continue
11. Step 3: Set Password
    - Enter password
    - Confirm password
    - Backend validates password strength
12. Frontend sends: idToken, role='doctor', password, confirmPassword
    - POST /auth/google-register
13. Backend verifies Google token
14. Backend validates:
    - @rguktn.ac.in format ✅
    - AdminDoctor pre-approval ✅
    - Password strength ✅
15. Backend creates User record:
    - name, email, googleId, password (bcrypt)
    - role: 'doctor'
    - authProvider: ['google', 'local']
16. Backend creates Doctor profile
17. Backend AUTO-APPROVES doctor:
    - isApproved: true
    - approvalDate: now
18. ✅ Response: success=true (NO token returned)
19. Frontend redirects to /login page
20. User logs in: email + password (or Google again)
21. Backend checks doctor.isApproved (✅ already true)
22. Backend generates token, redirects to dashboard
```

**Key Points:**

- ✅ Email MUST end with @rguktn.ac.in (enforced in role selection)
- ✅ Email MUST be in AdminDoctor pre-approved list
- ✅ Ask for password + confirm password
- ✅ Password is mandatory
- ✅ Stored in database BEFORE login
- ✅ AUTO-APPROVED only if in AdminDoctor list
- ✅ NO auto-login after registration
- ✅ Can login with email+password OR Google again

**Code Verification:**

- [googleRegister](backend/controllers/authController.js#L414-L427) - Validates @rguktn.ac.in and AdminDoctor
- [Frontend Register.jsx](frontend/src/pages/public/Register.jsx#L350-L365) - Doctor role selection blocked for non-@rguktn emails

---

### **LOGIN** ✅ MATCHES YOUR SPEC

**Patient/Doctor Login:**

```
1. User enters email + password
2. Backend finds user by email
3. If user not found: ERROR
4. If user has no password: ERROR (Google-only account)
5. Backend checks password against bcrypt hash
6. ✅ If doctor role:
   - Check if doctor.isApproved = true
   - ❌ If not approved: ERROR 403 "Pending admin approval"
   - ✅ If approved: Continue
7. Generate JWT token
8. Return user data + token
9. Frontend stores token in AuthContext
10. Frontend redirects to dashboard (admin/doctor/patient)
```

**Google OAuth Login:**

```
1. User clicks "Sign in with Google"
2. Google authentication successful
3. Backend finds user by googleId
4. ✅ If doctor role:
   - Check if doctor.isApproved = true
   - ❌ If not approved: ERROR 403 "Pending admin approval"
   - ✅ If approved: Continue
5. Generate JWT token
6. Return user data + token
7. Frontend redirects to dashboard
```

**Key Points:**

- ✅ Only registered users can login
- ✅ Email + password required (or Google OAuth)
- ✅ Doctor approval check enforced
- ✅ Token generated ONLY on successful login
- ✅ Token NOT generated on registration

**Code Verification:**

- [login](backend/controllers/authController.js#L214) - Validates credentials + doctor approval
- [googleAuthLogin](backend/controllers/authController.js#L297) - Validates Google token + doctor approval
- [Frontend Login.jsx](frontend/src/pages/public/Login.jsx#L40-L55) - Tries login, shows errors

---

## 🛣️ API Routes

### **Active Routes** ✅

```
POST   /api/v1/auth/register/send-otp
       → Send 4-digit OTP to email (email registration step 1)

POST   /api/v1/auth/register/verify-otp
       → Create user after OTP verification (email registration step 2)

POST   /api/v1/auth/login
       → Login with email + password

POST   /api/v1/auth/google
       → Check if Google user exists (used by frontend)

POST   /api/v1/auth/google-login
       → Login with Google OAuth token

POST   /api/v1/auth/google-register
       → Register with Google OAuth + password (Google registration)

GET    /api/v1/auth/logout
       → Logout user

GET    /api/v1/auth/me
       → Get current user profile (protected)

GET    /api/v1/auth/check-doctor-email
       → Check if doctor email is authorized (used by frontend)
```

### **Removed Routes** ❌

```
POST   /api/v1/auth/register
       → ❌ REMOVED (bypassed OTP requirement and returned token)
       → Use /register/send-otp → /register/verify-otp instead
```

---

## 🔐 Security Measures

| Requirement             | Implementation                                                                      | Status |
| ----------------------- | ----------------------------------------------------------------------------------- | ------ |
| Password mandatory      | All registration paths require password                                             | ✅     |
| Password strong         | validatePassword() checks 5 rules (8+ chars, uppercase, lowercase, number, special) | ✅     |
| Password hashed         | bcryptjs hashing with salt rounds configured                                        | ✅     |
| OTP required (email)    | registerSendOtp sends OTP, registerVerifyOtp verifies before user creation          | ✅     |
| OTP expires             | 10-minute expiry enforced                                                           | ✅     |
| OTP rate limited        | 60-second cooldown between OTP requests                                             | ✅     |
| No auto-login           | Registration endpoints return NO JWT token                                          | ✅     |
| Separate phases         | Registration → Redirect to Login → Login generates token                            | ✅     |
| Doctor @rguktn only     | Email validation + domain check in registerSendOtp and googleRegister               | ✅     |
| Doctor pre-approved     | AdminDoctor list check in registerSendOtp and googleRegister                        | ✅     |
| Doctor auto-approval    | Auto-approved on registration if in AdminDoctor list                                | ✅     |
| Doctor approval check   | Login endpoints check doctor.isApproved status                                      | ✅     |
| Google email validation | @rguktn.ac.in rejection for doctor role in frontend and backend                     | ✅     |
| Token on login only     | generateToken() called only in login endpoints                                      | ✅     |
| User exists check       | Validates before registration, before login                                         | ✅     |

---

## 🧪 Testing the Flow

### **Manual Test: Patient Email Registration**

```bash
# 1. Send OTP
curl -X POST http://localhost:5050/api/v1/auth/register/send-otp \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Patient",
    "email": "john@gmail.com",
    "password": "StrongPass123!",
    "confirmPassword": "StrongPass123!",
    "role": "patient"
  }'
# Response: { success: true, message: "OTP sent to your email." }

# 2. Verify OTP (check email for OTP)
curl -X POST http://localhost:5050/api/v1/auth/register/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@gmail.com",
    "otp": "1234"
  }'
# Response: { success: true, _id: "...", name: "John Patient", email: "john@gmail.com", role: "patient" }
# ❌ NO TOKEN in response
# ✅ Redirect to /login

# 3. Login
curl -X POST http://localhost:5050/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@gmail.com",
    "password": "StrongPass123!"
  }'
# Response: { success: true, _id: "...", name: "John Patient", email: "john@gmail.com", role: "patient", token: "eyJhbGc..." }
# ✅ TOKEN returned on login
# ✅ Redirect to /patient dashboard
```

### **Manual Test: Doctor Email Registration**

```bash
# 1. Send OTP (with @rguktn.ac.in email)
curl -X POST http://localhost:5050/api/v1/auth/register/send-otp \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Dr. Ahmed",
    "email": "ahmed@rguktn.ac.in",
    "password": "DocPass123!",
    "confirmPassword": "DocPass123!",
    "role": "doctor"
  }'
# ✅ If email in AdminDoctor list: { success: true, message: "OTP sent..." }
# ❌ If email NOT in AdminDoctor list: { success: false, message: "Not authorized..." }
# ❌ If email NOT @rguktn.ac.in: { success: false, message: "Not authorized..." }

# 2. Verify OTP
curl -X POST http://localhost:5050/api/v1/auth/register/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "email": "ahmed@rguktn.ac.in",
    "otp": "5678"
  }'
# Response: { success: true, _id: "...", name: "Dr. Ahmed", role: "doctor" }
# ❌ NO TOKEN in response
# ✅ Doctor.isApproved = true (auto-approved because admin pre-approved)
# ✅ Redirect to /login

# 3. Login
curl -X POST http://localhost:5050/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "ahmed@rguktn.ac.in",
    "password": "DocPass123!"
  }'
# Response: { success: true, _id: "...", name: "Dr. Ahmed", role: "doctor", token: "eyJhbGc..." }
# ✅ Doctor approved check passed
# ✅ TOKEN returned on login
# ✅ Redirect to /doctor dashboard
```

---

## ✨ Summary

Your strict authentication flow is **FULLY IMPLEMENTED**:

| Feature                                 | Status |
| --------------------------------------- | ------ |
| Patient email registration with OTP     | ✅     |
| Patient Google OAuth with password      | ✅     |
| Doctor @rguktn.ac.in email only         | ✅     |
| Doctor admin pre-approval required      | ✅     |
| Password mandatory for all              | ✅     |
| Password strength validated             | ✅     |
| Database storage before login           | ✅     |
| Registration-first (no auto-login)      | ✅     |
| Separate registration & login phases    | ✅     |
| Doctor approval check on login          | ✅     |
| Token generated ONLY on login           | ✅     |
| OTP verification for email registration | ✅     |
| Deprecated routes removed               | ✅     |

**NO DEVIATIONS** from your intended behavior. ✅
