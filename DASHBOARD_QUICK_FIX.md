## 🚀 Dashboard Loading - Quick Fixes

### Most Common Cause

**The API endpoint `/doctors/me` is returning null or the wrong structure.**

---

### 🔧 QUICK FIX #1: Use Demo Doctor Account

Test with built-in demo credentials first:

**Login with:**

- Email: `sneha@medicare.com`
- Password: `password123`

This account should have pre-configured doctor data.

---

### 🔧 QUICK FIX #2: Check if Backend Routes Exist

Your Dashboard calls these endpoints:

- `GET /api/v1/doctors/me` (get current doctor profile)
- `GET /api/v1/appointments/doctor/:id` (get doctor's appointments)
- `GET /api/v1/doctor/off-duty/my-requests` (get leave requests)

**Verify they exist:**

```bash
# Check backend routes
grep -r "doctors/me\|appointments/doctor\|off-duty/my-requests" backend/routes/
```

---

### 🔧 QUICK FIX #3: Fallback Data Loading

The updated Dashboard now has fallback handling. If API fails, it should:

1. ✅ Still show doctor name (from user context)
2. ✅ Still show stats cards (with 0 values)
3. ✅ Show "No appointments scheduled" message
4. ✅ Show error message if critical failures

**Test this:**

- Open dashboard after login
- Check if at least the header shows with your name
- If yes → Frontend is working, backend API is the issue

---

### 🔧 QUICK FIX #4: Enable Detailed Logging

To see exactly where it's failing:

1. Open browser DevTools → **Console** tab
2. You should see logs like:

   ```
   🔄 Fetching doctor dashboard data...
   👤 User: { name: "...", email: "...", id: "..." }
   📌 Step 1: Fetching doctor profile...
   ✅ Doctor profile loaded: { ... }  ← or ❌ Error fetching doctor profile
   📌 Step 2: Fetching appointments...
   ```

3. Share which step is failing

---

### 🔧 QUICK FIX #5: Check Your User is Actually a Doctor

Not all users have a doctor profile. To verify:

```bash
# In browser console:
const user = JSON.parse(localStorage.getItem('sh_user'));
console.log('Role:', user.role);     // Should be "doctor"
console.log('ID:', user.id);          // Should exist
console.log('Token:', user.token);    // Should be long JWT
```

If role is not "doctor" → Create a doctor account in admin panel

---

### ⚡ QUICK TEST SEQUENCE

**Do this in order:**

1. **Clear everything:**
   - DevTools → Application → Clear Site Data
   - Or: `localStorage.clear(); sessionStorage.clear();`

2. **Login as demo doctor:**
   - Username: `sneha@medicare.com`
   - Password: `password123`

3. **Open Dashboard:**
   - Navigate to `/doctor`
   - Check console for logs
   - Check Network tab for API responses

4. **If still loading:**
   - Open Network tab
   - For `/doctors/me` request:
     - Check Status code
     - Check Response (should have doctor data)
     - Check Headers (should have Authorization)

---

### 📋 What the Dashboard Needs to Work

| Component          | Status                                    | What to Check                            |
| ------------------ | ----------------------------------------- | ---------------------------------------- |
| **Authentication** | ✅ Must have user & token in localStorage | `localStorage.sh_user`                   |
| **Doctor Profile** | ✅ Must exist in database                 | Admin → Check if user has doctor profile |
| **Appointments**   | ⚠️ OK if empty                            | API should return `[]`                   |
| **Leave Requests** | ⚠️ OK if empty                            | API should return `[]`                   |

---

### 🎯 Success Indicators

Dashboard is working if you see:

- ✅ "Welcome, Dr. [Your Name]" header
- ✅ 3 stat cards (shows numbers or 0)
- ✅ Appointments table heading visible
- ✅ "No appointments scheduled" or actual appointments list
- ✅ Leave Requests section visible
- ✅ "Request Leave" button active

---

### 🆘 Still Stuck?

1. **Check backend is really running:**

   ```bash
   lsof -i :5050
   # Should show: node process listening on port 5050
   ```

2. **Check frontend has correct API base URL:**
   - It should be: `http://localhost:5050/api/v1`
   - Check file: `frontend/src/services/api.js`
   - Line: `baseURL: '/api/v1'`

3. **Check CORS is enabled in backend:**

   ```bash
   grep -n "cors\|CORS" backend/server.js
   # Should see cors middleware setup
   ```

4. **Restart from scratch:**

   ```bash
   # Kill all:
   pkill -f vite; pkill -f npm; pkill -f node

   # Backend:
   cd backend && npm run dev &

   # Frontend:
   cd frontend && npm run dev &

   # Wait 10 seconds, then test
   sleep 10
   curl http://localhost:3000 >/dev/null && echo "✅ Frontend ready"
   curl http://localhost:5050/api/v1/health >/dev/null && echo "✅ Backend ready"
   ```

---

### 📞 Debug Information to Provide

If you need help, prepare:

1. **Console logs** - Screenshot of all console messages when dashboard loads
2. **Network response** - Screenshot of `/doctors/me` response in Network tab
3. **LocalStorage** - Content of `sh_user` (hide password & sensitive data)
4. **Backend logs** - Any errors shown when backend runs
