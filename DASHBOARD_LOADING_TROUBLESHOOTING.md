## 🔍 Doctor Dashboard Loading Troubleshaoting Guide

### ✅ Quick Diagnostic Checklist

#### Step 1: Check if you're logged in

1. Open browser DevTools (F12)
2. Go to **Application → LocalStorage**
3. Look for key: `sh_user`
4. You should see a JSON object with: `{ name, email, role, token }`
5. If NOT present → **You're not logged in**

**Action**: Login at [http://localhost:3000/login](http://localhost:3000/login)

---

#### Step 2: Check the token is valid

1. Open DevTools → Console
2. Paste this code:

```javascript
const user = JSON.parse(localStorage.getItem("sh_user"));
console.log("User:", user);
if (user?.token) {
  console.log("Token present:", user.token.substring(0, 20) + "...");
} else {
  console.log("❌ No token found!");
}
```

3. If token is missing → **Login again**

---

#### Step 3: Check Network requests

1. Open DevTools → **Network** tab
2. Hard refresh the page (Ctrl+Shift+R or Cmd+Shift+R)
3. Look for API calls:
   - `doctors/me` - Should return doctor profile
   - `appointments/doctor/...` - Should return appointments
   - `doctor/off-duty/my-requests` - Should return leave requests

**Check the response:**

- ✅ Status 200 = Success (data should load)
- ❌ Status 401 = Unauthorized (token invalid, need to login)
- ❌ Status 404 = Not found (doctor profile missing)
- ❌ Status 500 = Server error

---

#### Step 4: Check browser console for errors

1. Open DevTools → **Console** tab
2. Look for red error messages
3. Common errors:
   - `"Not authorized to access this route"` → Token invalid
   - `"Doctor profile not found"` → User may not be a doctor
   - `"Cannot read property '_id'"` → API response structure mismatch

---

#### Step 5: Verify backend is running

1. Open terminal and run:

```bash
curl -s http://localhost:5050/api/v1/health || echo "❌ Backend not responding"
```

2. Should see: `{ "status": "ok" }` or similar

---

### 🐛 Common Issues & Fixes

| Issue                          | Cause                     | Solution                        |
| ------------------------------ | ------------------------- | ------------------------------- |
| **Stuck on loading forever**   | Auth token missing        | Login again, check localStorage |
| **401 Unauthorized**           | Token expired or invalid  | Logout & login                  |
| **"Doctor profile not found"** | User role is not "doctor" | Login with doctor account       |
| **API returns null data**      | Backend endpoint issue    | Check backend logs              |
| **Loading shows but slow**     | Network latency           | Check Network tab timings       |

---

### 🔧 Manual Testing Steps

**1. Clear all data and login fresh:**

```javascript
// In browser console:
localStorage.clear();
sessionStorage.clear();
location.reload();
```

Then login with doctor credentials.

**2. Check if API endpoint works:**

```bash
# Replace TOKEN with your actual token from localStorage
curl -X GET http://localhost:5050/api/v1/doctors/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json"
```

---

### 📊 Expected Response Structure

When dashboard loads successfully, API should return:

**Doctor Profile:**

```json
{
  "success": true,
  "data": {
    "_id": "...",
    "specialization": "Cardiology",
    "experience": 5,
    "user": { "name": "Dr. Smith" }
  }
}
```

**Appointments:**

```json
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "patient": { "name": "John" },
      "timeSlot": "10:30 AM",
      "status": "confirmed"
    }
  ]
}
```

---

### 🚨 If Nothing Works

1. **Check backend logs:**

   ```bash
   tail -n 50 /path/to/backend/server.log
   ```

2. **Restart both servers:**

   ```bash
   # Kill all:
   pkill -f vite
   pkill -f "npm run dev"
   pkill -f node

   # Restart backend:
   cd backend && npm run dev

   # Restart frontend:
   cd frontend && npm run dev
   ```

3. **Clear cache:**
   ```bash
   # Browser: Ctrl+Shift+Delete (Windows) or Cmd+Shift+Delete (Mac)
   # LocalStorage: localStorage.clear()
   ```

---

### 📝 What to Report if Still Stuck

If issue persists, provide:

1. Console errors (screenshot)
2. Network tab response for `/doctors/me` API call
3. LocalStorage `sh_user` content (hide token)
4. Backend logs

---

### ✅ Expected Working State

When everything works:

- ✅ Dashboard loads in < 2 seconds
- ✅ Doctor name shows "Welcome, Dr. [Name]"
- ✅ Stats cards show numbers (0 is OK)
- ✅ Appointments table visible (empty is OK)
- ✅ Leave Requests section visible
- ✅ No red errors in console
