<!-- IMPLEMENTATION GUIDE FOR 3-ADMIN APPROVAL SYSTEM -->

# Implementation Guide: 3-Admin Approval System

## Quick Start

This guide shows you how to use the 3-admin approval system for critical admin actions.

---

## 1. Adding the Model to Your Database

The `AdminAction` model is MongoDB-based and automatically handles:

- Storage of pending actions
- Tracking approvals
- Storing execution results
- Maintaining audit logs
- Auto-expiration after 24 hours

**No manual setup needed** - Just ensure MongoDB is connected in your `config/db.js`

---

## 2. How to Protect a Critical Action

### Option A: Use Direct Approval Flow

For actions like deleting a doctor:

```javascript
// In doctorController.js
const adminApprovalService = require("../services/adminApprovalService");

exports.requestDeleteDoctor = asyncHandler(async (req, res) => {
  const { doctorId, reason } = req.body;
  const adminId = req.user._id;
  const adminName = req.user.name;

  // Initiate approval action
  const action = await adminApprovalService.createAction(
    adminId,
    adminName,
    "doctor_delete",
    `Request to delete doctor: ${doctorId}`,
    { doctorId, reason },
    {
      type: "doctor",
      entityId: doctorId,
    },
  );

  res.status(201).json({
    success: true,
    actionId: action._id,
    message: "Deletion request initiated. Awaiting 3 admin approvals.",
  });
});

// Direct deletion is blocked!
// Only the approval system can delete doctors
```

### Option B: Using the Generic Approval Endpoint

```javascript
// Frontend sends approval request
async function requestDoctorDeletion(doctorId, reason) {
  const res = await fetch("/api/v1/admin/actions/initiate", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      actionType: "doctor_delete",
      description: `Request to delete doctor: ${doctorId}`,
      payload: {
        doctorId,
        reason,
      },
    }),
  });

  const data = await res.json();
  return data.data.actionId;
}
```

---

## 3. Controller Implementation Examples

### Example: Doctor Management with Approval

```javascript
// backend/controllers/doctorController.js

const adminApprovalService = require("../services/adminApprovalService");
const Doctor = require("../models/Doctor");

/*
 * WORKFLOW:
 * 1. This endpoint INITIATES the deletion request
 * 2. Sends to approval system
 * 3. Actual deletion happens after 3 admins approve
 */

exports.requestDoctorDeletion = asyncHandler(async (req, res) => {
  const { doctorId, reason } = req.body;
  const adminId = req.user._id;
  const adminName = req.user.name;

  // Verify doctor exists
  const doctor = await Doctor.findById(doctorId).populate("user", "name");
  if (!doctor) {
    return res.status(404).json({ error: "Doctor not found" });
  }

  // Create approval action
  const action = await adminApprovalService.createAction(
    adminId,
    adminName,
    "doctor_delete",
    `Delete doctor: ${doctor.user.name}`,
    { doctorId, reason: reason || "No reason provided" },
    {
      type: "doctor",
      entityId: doctorId,
      entityName: doctor.user.name,
    },
  );

  res.status(201).json({
    success: true,
    actionId: action._id,
    doctorName: doctor.user.name,
    doctorId,
    message: "Doctor deletion initiated. Requires approval from 3 admins.",
    approvalsNeeded: 3,
  });
});

exports.requestUpdateDoctor = asyncHandler(async (req, res) => {
  const { doctorId, updateData } = req.body;
  const adminId = req.user._id;
  const adminName = req.user.name;

  const doctor = await Doctor.findById(doctorId);
  if (!doctor) {
    return res.status(404).json({ error: "Doctor not found" });
  }

  // Create approval action
  const action = await adminApprovalService.createAction(
    adminId,
    adminName,
    "doctor_update",
    `Update doctor: ${doctor._id}`,
    { doctorId, updateData },
    {
      type: "doctor",
      entityId: doctorId,
      entityName: `Doctor ${doctorId}`,
    },
  );

  res.status(201).json({
    success: true,
    actionId: action._id,
    message: "Update request initiated. Requires approval from 3 admins.",
    updateFields: Object.keys(updateData),
  });
});

exports.requestAddDoctor = asyncHandler(async (req, res) => {
  const { userId, specialization, licenseNumber } = req.body;
  const adminId = req.user._id;
  const adminName = req.user.name;

  const action = await adminApprovalService.createAction(
    adminId,
    adminName,
    "doctor_add",
    `Add new doctor: ${userId}`,
    { userId, specialization, licenseNumber },
    {
      type: "doctor",
      entityId: userId,
      entityName: `Doctor ${userId}`,
    },
  );

  res.status(201).json({
    success: true,
    actionId: action._id,
    message: "Doctor addition request initiated. Requires 3 admin approvals.",
  });
});
```

### Example: Patient Management with Approval

```javascript
// backend/controllers/patientController.js

exports.requestPatientDeletion = asyncHandler(async (req, res) => {
  const { patientId, reason } = req.body;
  const adminId = req.user._id;
  const adminName = req.user.name;

  const patient = await Patient.findById(patientId).populate("user", "name");
  if (!patient) {
    return res.status(404).json({ error: "Patient not found" });
  }

  const action = await adminApprovalService.createAction(
    adminId,
    adminName,
    "patient_delete",
    `Delete patient: ${patient.user.name}`,
    { patientId, reason: reason || "No reason provided" },
    {
      type: "patient",
      entityId: patientId,
      entityName: patient.user.name,
    },
  );

  res.status(201).json({
    success: true,
    actionId: action._id,
    patientName: patient.user.name,
    message: "Patient deletion initiated. Requires 3 admin approvals.",
  });
});

exports.requestAddPatient = asyncHandler(async (req, res) => {
  const { userId, bloodType, allergies, medicalHistory } = req.body;
  const adminId = req.user._id;
  const adminName = req.user.name;

  const action = await adminApprovalService.createAction(
    adminId,
    adminName,
    "patient_add",
    `Add new patient: ${userId}`,
    { userId, bloodType, allergies, medicalHistory },
    {
      type: "patient",
      entityId: userId,
      entityName: `Patient ${userId}`,
    },
  );

  res.status(201).json({
    success: true,
    actionId: action._id,
    message: "Patient addition request initiated. Requires 3 admin approvals.",
  });
});
```

---

## 4. Middleware Implementation (Optional)

Create a middleware to prevent direct deletion:

```javascript
// backend/middleware/requireApprovalMiddleware.js

const AdminAction = require("../models/AdminAction");

/**
 * This middleware prevents direct deletion/modification
 * of sensitive entities. Must go through approval system.
 */

const requireApprovalForDeletion = (actionType) => {
  return async (req, res, next) => {
    // Get pending or approved action for this entity
    const action = await AdminAction.findOne({
      actionType,
      "payload.doctorId": req.body.doctorId || req.params.doctorId,
      status: { $in: ["pending", "approved", "executed"] },
    });

    if (!action) {
      return res.status(403).json({
        error:
          "This action requires approval through the admin approval system",
        requiredFlow: "/api/v1/admin/actions/initiate",
      });
    }

    // Continue if action is executed
    if (action.status === "executed") {
      next();
    } else {
      return res.status(400).json({
        error: `Action is ${action.status}. Cannot delete until fully approved and executed.`,
      });
    }
  };
};

module.exports = { requireApprovalForDeletion };
```

---

## 5. Route Updates

```javascript
// backend/routes/doctorRoutes.js

const express = require("express");
const {
  getDoctors,
  getDoctor,
  createDoctor,
  updateDoctor,
  requestDeleteDoctor, // NEW - Uses approval system
  requestUpdateDoctor, // NEW - Uses approval system
  requestAddDoctor, // NEW - Uses approval system
} = require("../controllers/doctorController");
const { protect } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");

const router = express.Router();

// Public routes
router.get("/", getDoctors);
router.get("/:id", getDoctor);

// Admin only - with approval system
router.use(protect);
router.use(authorize("admin"));

// Use approval system for sensitive operations
router.post("/request-delete", requestDeleteDoctor); // DELETE via approval
router.post("/request-update", requestUpdateDoctor); // UPDATE via approval
router.post("/request-add", requestAddDoctor); // ADD via approval

// Regular CRUD (if still needed)
router.post("/", createDoctor);
router.put("/:id", updateDoctor);
// router.delete('/:id', deletDoctor);  // REMOVED - Use approval system

module.exports = router;
```

---

## 6. Frontend Integration

### Vue.js - Initiate Action

```vue
<template>
  <div class="delete-doctor-dialog">
    <h2>Delete Doctor</h2>

    <form @submit.prevent="submitDeletion">
      <div class="form-group">
        <label>Reason for deletion:</label>
        <textarea v-model="reason" required></textarea>
      </div>

      <button type="submit" class="btn-danger">Request Deletion</button>
    </form>

    <div v-if="actionId" class="success-msg">
      <p>✓ Deletion request initiated</p>
      <p>Request ID: {{ actionId }}</p>
      <p>Requires approval from 3 admins</p>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      reason: "",
      actionId: null,
      doctorId: this.$route.params.doctorId,
    };
  },

  methods: {
    async submitDeletion() {
      const res = await fetch("/api/v1/admin/actions/initiate", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.$store.state.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          actionType: "doctor_delete",
          description: `Delete doctor ${this.doctorId}`,
          payload: {
            doctorId: this.doctorId,
            reason: this.reason,
          },
        }),
      });

      const data = await res.json();
      if (data.success) {
        this.actionId = data.data.actionId;
        this.$notify.success("Deletion request sent for approval");
      }
    },
  },
};
</script>
```

### React - Approve Action

```jsx
import React, { useState, useEffect } from "react";

function AdminApprovalPanel() {
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPendingActions();
  }, []);

  const loadPendingActions = async () => {
    const res = await fetch("/api/v1/admin/actions/pending", {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    });
    const data = await res.json();
    setActions(data.data);
    setLoading(false);
  };

  const approveAction = async (actionId) => {
    const res = await fetch(`/api/v1/admin/actions/${actionId}/approve`, {
      method: "POST",
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    });

    if (res.ok) {
      alert("Action approved!");
      loadPendingActions();
    }
  };

  const rejectAction = async (actionId, reason) => {
    const res = await fetch(`/api/v1/admin/actions/${actionId}/reject`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ reason }),
    });

    if (res.ok) {
      alert("Action rejected");
      loadPendingActions();
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="approval-panel">
      <h2>Pending Approvals</h2>
      {actions.map((action) => (
        <div key={action.actionId} className="action-card">
          <h3>{action.actionType}</h3>
          <p>{action.description}</p>
          <p>
            Approvals: {action.approvals}/{action.approvalsNeeded}
          </p>

          <button onClick={() => approveAction(action.actionId)}>
            ✓ Approve
          </button>
          <button
            onClick={() => rejectAction(action.actionId, "Invalid request")}
          >
            ✗ Reject
          </button>
        </div>
      ))}
    </div>
  );
}

export default AdminApprovalPanel;
```

---

## 7. Testing the System

### Manual Testing Steps

```bash
# 1. Start server
npm start

# 2. Get admin tokens (from login or JWT)
ADMIN1_TOKEN="token1"
ADMIN2_TOKEN="token2"
ADMIN3_TOKEN="token3"

# 3. Admin 1 initiates deletion
curl -X POST http://localhost:5000/api/v1/admin/actions/initiate \
  -H "Authorization: Bearer $ADMIN1_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "actionType": "doctor_delete",
    "description": "Test doctor deletion",
    "payload": { "doctorId": "60d5ec49c123..." }
  }' | jq .

# Save the actionId from response

# 4. Admin 2 approves
curl -X POST http://localhost:5000/api/v1/admin/actions/ACTION_ID/approve \
  -H "Authorization: Bearer $ADMIN2_TOKEN" | jq .

# 5. Admin 3 approves (should auto-execute)
curl -X POST http://localhost:5000/api/v1/admin/actions/ACTION_ID/approve \
  -H "Authorization: Bearer $ADMIN3_TOKEN" | jq .

# 6. Verify execution
curl http://localhost:5000/api/v1/admin/actions/ACTION_ID \
  -H "Authorization: Bearer $ADMIN1_TOKEN" | jq .data.status
```

### Automated Testing

```javascript
// test/approval-system.test.js

const request = require("supertest");
const app = require("../server");
const AdminAction = require("../models/AdminAction");

describe("3-Admin Approval System", () => {
  let actionId;
  const adminTokens = ["token1", "token2", "token3"];

  test("Should initiate action", async () => {
    const res = await request(app)
      .post("/api/v1/admin/actions/initiate")
      .set("Authorization", `Bearer ${adminTokens[0]}`)
      .send({
        actionType: "doctor_delete",
        description: "Test deletion",
        payload: { doctorId: "test123" },
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    actionId = res.body.data.actionId;
  });

  test("Should approve action (Admin 2)", async () => {
    const res = await request(app)
      .post(`/api/v1/admin/actions/${actionId}/approve`)
      .set("Authorization", `Bearer ${adminTokens[1]}`);

    expect(res.status).toBe(200);
    expect(res.body.data.approvals).toBe(2);
  });

  test("Should execute on 3rd approval", async () => {
    const res = await request(app)
      .post(`/api/v1/admin/actions/${actionId}/approve`)
      .set("Authorization", `Bearer ${adminTokens[2]}`);

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("executed");
  });

  test("Should reject action if admin rejects", async () => {
    // Initiate new action
    const initRes = await request(app)
      .post("/api/v1/admin/actions/initiate")
      .set("Authorization", `Bearer ${adminTokens[0]}`)
      .send({
        actionType: "doctor_delete",
        description: "Test deletion",
        payload: { doctorId: "test123" },
      });

    const newActionId = initRes.body.data.actionId;

    // Admin 2 rejects
    const rejectRes = await request(app)
      .post(`/api/v1/admin/actions/${newActionId}/reject`)
      .set("Authorization", `Bearer ${adminTokens[1]}`)
      .send({ reason: "Invalid request" });

    expect(rejectRes.status).toBe(200);
    expect(rejectRes.body.data.status).toBe("rejected");
  });

  test("Should prevent self-approval", async () => {
    // Admin 1 tries to approve own action
    const res = await request(app)
      .post(`/api/v1/admin/actions/${actionId}/approve`)
      .set("Authorization", `Bearer ${adminTokens[0]}`);

    expect(res.status).toBe(400);
    expect(res.body.message).toContain("cannot approve their own");
  });
});
```

---

## 8. Monitoring & Logging

```javascript
// backend/utils/approvalLogger.js

const fs = require("fs");
const path = require("path");

const approvalLogPath = path.join(__dirname, "../logs/approvals.log");

const logApprovalEvent = (event) => {
  const log =
    JSON.stringify({
      timestamp: new Date().toISOString(),
      ...event,
    }) + "\n";

  fs.appendFileSync(approvalLogPath, log);
};

module.exports = { logApprovalEvent };
```

---

## 9. Deployment Checklist

- [ ] AdminAction model created in MongoDB
- [ ] adminApprovalService.js deployed
- [ ] adminApprovalController.js updated
- [ ] Routes added to adminRoutes.js
- [ ] Controllers updated to use approval system
- [ ] Frontend updated with new endpoints
- [ ] Admin users assigned to system
- [ ] Approval workflow documented for admins
- [ ] Monitoring/logging enabled
- [ ] Database backups tested
- [ ] Approval process tested with 3 admins
- [ ] Error handling tested

---

## 10. FAQ

**Q: What if one admin rejects?**
A: Action is immediately rejected and cannot be approved again. Initiator must create new request.

**Q: Can the same admin approve multiple times?**
A: No. Each admin can only approve once. Three different admins needed.

**Q: What happens if action expires?**
A: After 24 hours, action automatically expires and can no longer be approved.

**Q: Can initiator cancel their action?**
A: Yes, only the initiator can cancel a pending action.

**Q: How do I audit who approved what?**
A: Check the `auditLog` field in the AdminAction document or `/api/v1/admin/actions/:id` endpoint.

**Q: Can I modify action payload after initiating?**
A: No. You must cancel and create a new action.

---

## Support & Next Steps

✓ System is production-ready!
✓ All action types supported
✓ Full audit trail maintained
✓ Auto-execution on 3rd approval
✓ MongoDB persistence

For questions or issues, refer to:

- ADMIN_APPROVAL_SYSTEM_DOCUMENTATION.md (full API docs)
- This file (implementation guide)
- Code comments in adminApprovalService.js
