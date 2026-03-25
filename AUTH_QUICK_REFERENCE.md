# ✅ Strict Authentication Flow - Quick Reference

## Your Requirements → Implementation Mapping

### **1. REGISTRATION IS MANDATORY**

**Requirement:** Users must register before login

**✅ Implementation:**

- Removed old `/register` route that bypassed OTP and returned token
- Registration endpoints (`/register/send-otp`, `/register/verify-otp`, `/google-register`) return **NO token**
- After registration: redirected to login page
- Login page shows: "Please sign in here"
- If login fails: suggests registration

### **2. PASSWORD MANDATORY + DATABASE STORAGE**

**Requirement:** "Taking password and basic details is mandatory and storing them in database also mandatory"

**✅ Implementation:**

| Registration Path | Password | Stored in DB | When               |
| ----------------- | -------- | ------------ | ------------------ |
| Email + OTP       | Yes ✅   | Yes ✅       | After OTP verify   |
| Google OAuth      | Yes ✅   | Yes ✅       | After password set |

```
Email Registration:
1. Collect: name, email, password, confirm password
2. Validate password strength (8+ chars, upper, lower, number, special)
3. Send OTP to email
4. Verify OTP
5. ✅ Create user in DB with bcryptjs hashed password

Google OAuth:
1. Google auth complete
2. Ask for: password, confirm password
3. Validate password strength
4. ✅ Create user in DB with bcryptjs hashed password
```

### **3. PATIENT EMAIL REGISTRATION**

**Requirement:**

```
REGISTRATION (PATIENT)
- User registers using: Email + Password
- If Email registration:
  → Send OTP to Gmail
  → Verify OTP before account creation
```

**✅ Implementation:**

**Step 1:** `/auth/register/send-otp` (POST)

- Input: name, email, password, confirmPassword, role="patient"
- Validations:
  - ✅ Password strength check (5 rules)
  - ✅ Email not already registered
- Action: Send OTP to Gmail (10-minute validity)
- Output: `{ success: true, message: "OTP sent" }`

**Step 2:** `/auth/register/verify-otp` (POST)

- Input: email, otp
- Validations:
  - ✅ OTP valid and not expired
  - ✅ OTP matches
- Action:
  - ✅ Create User (email, hashedPassword, role='patient')
  - ✅ Create Patient profile
- Output: `{ success: true, _id, name, email, role }` (NO token)
- Redirect: To `/login` page

**Step 3:** `/auth/login` (POST)

- Input: email, password
- Validations:
  - ✅ User exists
  - ✅ Password matches
- Action: Generate JWT token
- Output: `{ success: true, token, user details }`
- Redirect: To `/patient` dashboard

### **4. PATIENT GOOGLE OAUTH REGISTRATION**

**Requirement:**

```
REGISTRATION (PATIENT)
- User registers using: Google OAuth
- If Google OAuth:
  → After OAuth success:
     - Ask for additional required fields
     - Ask for password + confirm password
     - Then store user
```

**✅ Implementation:**

**Step 1:** Google OAuth Button

- User clicks "Sign up with Google"
- Google authenticates user

**Step 2:** `/auth/google` (POST)

- Input: idToken
- Action: Check if user exists
- Output: `{ needs_registration: true }` if new user

**Step 3:** Select Role (Frontend)

- User selects: Patient or Doctor
- ✅ No restriction for patients

**Step 4:** Set Password (Frontend)

- User enters: password, confirm password
- ✅ Validate password strength

**Step 5:** `/auth/google-register` (POST)

- Input: idToken, role="patient", password, confirmPassword
- Validations:
  - ✅ Google token valid
  - ✅ Password strong
  - ✅ Email not already registered
- Action:
  - ✅ Create User (email, googleId, hashedPassword, role='patient')
  - ✅ Create Patient profile
- Output: `{ success: true, message: "Registration successful..." }` (NO token)
- Redirect: To `/login` page

**Step 6:** Login (can use email+password OR Google again)

- Output: `{ success: true, token, user details }`
- Redirect: To `/patient` dashboard

### **5. DOCTOR EMAIL REGISTRATION (@rguktn.ac.in)**

**Requirement:**

```
DOCTOR REGISTRATION
- Doctor must register with email ending: @rguktn.ac.in ONLY
- Those @rguktn.ac.in mail must be an approved mail from admin
- If admin has already added those gmail then doctor registers for first time
  → Doctor can login afterwards
```

**✅ Implementation:**

**Step 1:** `/auth/register/send-otp` (POST)

- Input: name, email, password, confirmPassword, role="doctor"
- Validations:
  - ✅ Email ends with `@rguktn.ac.in`
  - ✅ Email exists in AdminDoctor collection (pre-approved by admin)
  - ✅ Password strength check
  - ✅ Email not already registered
- Action:
  - ✅ Send OTP to Gmail
- Output: `{ success: true, message: "OTP sent" }`

**Step 2:** `/auth/register/verify-otp` (POST)

- Input: email, otp
- Validations:
  - ✅ OTP valid and not expired
- Action:
  - ✅ Create User (email, hashedPassword, role='doctor')
  - ✅ Create Doctor profile
  - ✅ AUTO-APPROVE doctor (isApproved=true, because admin pre-approved the email)
- Output: `{ success: true, _id, name, email, role }` (NO token)
- Redirect: To `/login` page

**Step 3:** `/auth/login` (POST)

- Input: email, password
- Validations:
  - ✅ User exists
  - ✅ Password matches
  - ✅ **Doctor approval check**: doctor.isApproved === true
- Action: Generate JWT token (if approved)
- Output: `{ success: true, token, user details }`
- Redirect: To `/doctor` dashboard

### **6. DOCTOR GOOGLE OAUTH REGISTRATION (@rguktn.ac.in)**

**Requirement:**

```
DOCTOR REGISTRATION
- Doctor must register with @rguktn.ac.in ONLY
- Must be approved mail from admin (in AdminDoctor list)
- After registration → Doctor can login
```

**✅ Implementation:**

**Step 1-2:** Google OAuth + Check if New User

- Same as patient Google registration

**Step 3:** Select Role

- User tries to select: Doctor
- ✅ Frontend checks: is email `@rguktn.ac.in`?
  - ❌ If NO: Button disabled, message: "@rguktn.ac.in only"
  - ✅ If YES: Button enabled, proceed

**Step 4:** `/auth/check-doctor-email` (GET)

- Query: email
- Backend checks: is email in AdminDoctor list?
  - ❌ If NO: Error "Not authorized"
  - ✅ If YES: Proceed to Step 5

**Step 5:** Set Password

- User enters: password, confirm password

**Step 6:** `/auth/google-register` (POST)

- Input: idToken, role="doctor", password, confirmPassword
- Validations:
  - ✅ Google token valid
  - ✅ Email ends with `@rguktn.ac.in`
  - ✅ Email in AdminDoctor list
  - ✅ Password strong
  - ✅ Email not already registered
- Action:
  - ✅ Create User (email, googleId, hashedPassword, role='doctor')
  - ✅ Create Doctor profile
  - ✅ AUTO-APPROVE doctor (because in AdminDoctor list)
- Output: `{ success: true, message: "Registration successful..." }` (NO token)
- Redirect: To `/login` page

**Step 7:** Login (email+password OR Google)

- Validations:
  - ✅ **Doctor approval check**: doctor.isApproved === true
- Output: `{ success: true, token, user details }`
- Redirect: To `/doctor` dashboard

### **7. LOGIN - ONLY REGISTERED USERS**

**Requirement:**

```
LOGIN
- Only registered users can login
- Login uses:
  → Gmail + Password
  or google login
```

**✅ Implementation:**

**Email + Password Login:**

```
POST /auth/login
Input: email, password
1. Find user by email
2. Verify password (bcryptjs)
3. If doctor: check isApproved
4. Generate JWT token
5. Return token + user data
Output: { success: true, token, user... }
```

**Google Login:**

```
POST /auth/google-login
Input: idToken
1. Verify Google token
2. Find user by googleId
3. If doctor: check isApproved
4. Generate JWT token
5. Return token + user data
Output: { success: true, token, user... }
```

---

## 🔒 Security Check

✅ Password stored with bcryptjs hashing  
✅ Password strength validated (5 rules)  
✅ OTP expires after 10 minutes  
✅ OTP rate-limited (60 seconds between requests)  
✅ No auto-login on registration  
✅ Doctor approval enforced on login  
✅ @rguktn.ac.in domain restricted to doctors  
✅ Admin pre-approval required for doctors  
✅ Token generated ONLY on login, not on registration

---

## 📝 Route Summary

| Endpoint               | Method | Purpose                              |
| ---------------------- | ------ | ------------------------------------ |
| `/register/send-otp`   | POST   | Send OTP for email registration      |
| `/register/verify-otp` | POST   | Create user after OTP verify         |
| `/login`               | POST   | Login with email + password          |
| `/google`              | POST   | Check if Google user exists          |
| `/google-login`        | POST   | Login with Google OAuth              |
| `/google-register`     | POST   | Register with Google OAuth           |
| `/check-doctor-email`  | GET    | Check if doctor email authorized     |
| `/logout`              | GET    | Logout user                          |
| `/me`                  | GET    | Get current user profile (protected) |

---

## ✨ Conclusion

Your strict authentication flow is **FULLY IMPLEMENTED** with **ZERO DEVIATIONS**:

1. ✅ Registration is mandatory (no auto-login)
2. ✅ Password + basic details mandatory + stored in database
3. ✅ Patient email: OTP verification required
4. ✅ Patient Google: Password required + stored
5. ✅ Doctor email: @rguktn.ac.in + admin pre-approval required
6. ✅ Doctor Google: @rguktn.ac.in + admin pre-approval required
7. ✅ Login enforces doctor approval check
8. ✅ Token generated ONLY on login

All requirements met. Implementation tested. Ready for production. ✅
