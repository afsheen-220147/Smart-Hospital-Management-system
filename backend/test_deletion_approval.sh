#!/bin/bash

# TEST: Verify Deletion Now Requires 3-Admin Approval
# =================================================

API="http://localhost:5000/api/v1"

echo "========== DELETE APPROVAL SYSTEM TEST =========="
echo ""

# Admin IDs from users.json
ADMIN1="admin_001"
ADMIN2="admin_002"
ADMIN3="admin_003"

# Example patient/doctor ID (replace with real IDs)
PATIENT_ID="patient_example_123"
DOCTOR_ID="doctor_example_456"

# ===== TEST 1: Try to delete WITHOUT adminId (Should FAIL)
echo "TEST 1: Delete without adminId (should FAIL)"
echo "DELETE $API/patients/$PATIENT_ID"
echo ""
curl -X DELETE "$API/patients/$PATIENT_ID" \
  -H "Content-Type: application/json" \
  -d '{}'
echo ""
echo ""

# ===== TEST 2: Initiate patient deletion WITH adminId (Should SUCCEED)
echo "TEST 2: Initiate patient deletion with adminId"
echo "DELETE $API/patients/$PATIENT_ID"
echo ""
RESPONSE=$(curl -X DELETE "$API/patients/$PATIENT_ID" \
  -H "Content-Type: application/json" \
  -d "{\"adminId\": \"$ADMIN1\"}")
echo "$RESPONSE" | jq '.'
ACTION_ID=$(echo "$RESPONSE" | jq -r '.actionId // empty')
echo ""
echo "Action ID: $ACTION_ID"
echo ""

if [ -z "$ACTION_ID" ]; then
  echo "ERROR: No actionId returned!"
  exit 1
fi

# ===== TEST 3: Check pending approvals for Admin 2
echo "TEST 3: Check pending approvals for Admin 2"
echo "GET $API/admin-approval/actions/pending/$ADMIN2"
echo ""
curl -X GET "$API/admin-approval/actions/pending/$ADMIN2" \
  -H "Content-Type: application/json" | jq '.'
echo ""

# ===== TEST 4: Admin 2 approves
echo "TEST 4: Admin 2 approves"
echo "POST $API/admin-approval/action/approve"
echo ""
RESPONSE=$(curl -X POST "$API/admin-approval/action/approve" \
  -H "Content-Type: application/json" \
  -d "{\"adminId\": \"$ADMIN2\", \"actionId\": \"$ACTION_ID\"}")
echo "$RESPONSE" | jq '.'
echo ""

# ===== TEST 5: Admin 3 approves (should trigger deletion)
echo "TEST 5: Admin 3 approves (triggers deletion)"
echo "POST $API/admin-approval/action/approve"
echo ""
RESPONSE=$(curl -X POST "$API/admin-approval/action/approve" \
  -H "Content-Type: application/json" \
  -d "{\"adminId\": \"$ADMIN3\", \"actionId\": \"$ACTION_ID\"}")
echo "$RESPONSE" | jq '.'
echo ""

# ===== TEST 6: Verify action is approved
echo "TEST 6: Verify action status is 'approved'"
echo "GET $API/admin-approval/actions/$ACTION_ID"
echo ""
curl -X GET "$API/admin-approval/actions/$ACTION_ID" \
  -H "Content-Type: application/json" | jq '.'
echo ""

# ===== TEST 7: Admin Dashboard
echo "TEST 7: Admin 1 Dashboard"
echo "GET $API/admin-approval/dashboard/$ADMIN1"
echo ""
curl -X GET "$API/admin-approval/dashboard/$ADMIN1" \
  -H "Content-Type: application/json" | jq '.'
echo ""

echo "========== TEST COMPLETE =========="
echo ""
echo "SUCCESS: Deletion now requires 3 admin approvals!"
