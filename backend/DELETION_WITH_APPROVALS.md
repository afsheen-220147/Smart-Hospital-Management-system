/\*\*

- DELETION WITH 3-ADMIN APPROVAL - FIXED
-
- ALL deletions now REQUIRE 3 admin approvals before execution
- No direct deletion possible anymore
  \*/

/\*\*

- METHOD 1: Direct DELETE Endpoint
- =================================
-
- DELETE /api/v1/patients/:patientId
-
- Body:
- {
- "adminId": "admin_001",
- "reason": "Account violation"
- }
-
- Response (201):
- {
- "success": true,
- "actionId": "action_abc123def",
- "message": "Patient deletion initiated. Requires approvals from 3 admins.",
- "details": {
-     "patientId": "patient_123",
-     "status": "pending",
-     "approvals": 1,
-     "approvalsNeeded": 3
- }
- }
-
- Example:
- curl -X DELETE http://localhost:5000/api/v1/patients/patient_123 \
-     -H "Content-Type: application/json" \
-     -d '{"adminId": "admin_001", "reason": "Termination"}'
  \*/

/\*\*

- METHOD 2: Admin Endpoint (User-Friendly)
- =========================================
-
- POST /api/v1/admin/patient/delete-request
-
- Body:
- {
- "patientId": "patient_123",
- "adminId": "admin_001",
- "reason": "Account violation"
- }
-
- Response (201):
- {
- "success": true,
- "actionId": "action_abc123def",
- "patientId": "patient_123",
- "status": "pending",
- "approvals": 1,
- "approvalsNeeded": 3,
- "message": "Patient deletion request initiated. Requiring approvals from 2 more admins."
- }
-
- Example:
- curl -X POST http://localhost:5000/api/v1/admin/patient/delete-request \
-     -H "Content-Type: application/json" \
-     -d '{
-       "patientId": "patient_123",
-       "adminId": "admin_001",
-       "reason": "Account violation"
-     }'
  \*/

/\*\*

- METHOD 3: Doctor Deletion
- ==========================
-
- DELETE /api/v1/doctors/:doctorId
-
- Body:
- {
- "adminId": "admin_001",
- "reason": "Termination"
- }
-
- OR
-
- POST /api/v1/admin/doctor/delete-request
-
- Body:
- {
- "doctorId": "doctor_xyz",
- "adminId": "admin_001",
- "reason": "Termination"
- }
  \*/

/\*\*

- APPROVAL FLOW (After Deletion Initiated)
- =========================================
-
- Step 1: Check pending approvals for you
- GET /api/v1/admin-approval/actions/pending/admin_002
- → See your pending approvals
-
- Step 2: Approve the action
- POST /api/v1/admin-approval/action/approve
- Body:
- {
-     "adminId": "admin_002",
-     "actionId": "action_abc123def"
- }
- Response:
- {
-     "actionId": "action_abc123def",
-     "status": "pending",
-     "approvals": 2,
-     "approvalsNeeded": 3,
-     "approvedBy": [
-       { "id": "admin_001", "name": "Admin User" },
-       { "id": "admin_002", "name": "Admin Manager" }
-     ]
- }
-
- Step 3: Admin 3 approves (triggers execution)
- POST /api/v1/admin-approval/action/approve
- Body:
- {
-     "adminId": "admin_003",
-     "actionId": "action_abc123def"
- }
- Response:
- {
-     "actionId": "action_abc123def",
-     "status": "approved",  ← NOW APPROVED!
-     "approvals": 3,
-     "approvalsNeeded": 3
- }
-
- Console output:
- ✓ Patient patient_123 deleted along with all appointments
  \*/

/\*\*

- ERROR: Direct Deletion Will FAIL
- =================================
-
- This is SECURE - deletion initiations MUST have adminId
- If adminId is missing or wrong, the request will fail:
-
- DELETE /api/v1/patients/patient_123
- (no body)
-
- Response (400/401):
- {
- "error": "Admin authentication required"
- }
  \*/

/\*\*

- TRACKING & MONITORING
- =====================
-
- Check all pending actions:
- GET /api/v1/admin-approval/actions/pending/summary
-
- Check your pending approvals:
- GET /api/v1/admin-approval/actions/pending/:adminId
-
- View your dashboard:
- GET /api/v1/admin-approval/dashboard/:adminId
-
- Check specific action:
- GET /api/v1/admin-approval/actions/:actionId
  \*/

/\*\*

- ADMIN IDS (For Testing)
- =======================
-
- From backend/\_data/users.json:
-
- admin_001: email=admin@medicare.com
- admin_002: email=admin2@medicare.com
- admin_003: email=admin3@medicare.com
- admin_004: email=admin4@medicare.com
- admin_005: email=admin5@medicare.com
-
- Use these adminIds in all deletion and approval endpoints
  \*/

/\*\*

- COMPLETE EXAMPLE FLOW
- =====================
-
- 1.  Admin 1 initiates patient deletion:
- DELETE /api/v1/patients/patient_123
- Body: {"adminId": "admin_001"}
- → Returns actionId = "action_xyz789"
-
- 2.  Admin 2 checks pending:
- GET /api/v1/admin-approval/actions/pending/admin_002
- → Sees action_xyz789 in the list
-
- 3.  Admin 2 approves:
- POST /api/v1/admin-approval/action/approve
- Body: {"adminId": "admin_002", "actionId": "action_xyz789"}
- → Approvals = 2/3
-
- 4.  Admin 3 approves:
- POST /api/v1/admin-approval/action/approve
- Body: {"adminId": "admin_003", "actionId": "action_xyz789"}
- → Approvals = 3/3 ✓ APPROVED ✓
- → Patient is deleted automatically
- → All appointments deleted
-
- 5.  Verify deletion:
- GET /api/v1/admin-approval/actions/action_xyz789
- → Status = "approved"
  \*/

module.exports = {};
