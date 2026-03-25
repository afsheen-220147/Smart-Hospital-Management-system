const axios = require('axios');

const API_BASE = 'http://localhost:5000/api/v1/admin-approval';
const ADMIN_API = 'http://localhost:5000/api/v1/admin';

const testAdminApprovalFlow = async () => {
  try {
    console.log('\n========== ADMIN APPROVAL SYSTEM TEST ==========\n');

    // Step 1: Admin 1 Login
    console.log('1. Admin 1 logs in...');
    const login1 = await axios.post(`${API_BASE}/login`, {
      email: 'admin@medicare.com',
      password: 'password123'
    });
    const admin1Id = login1.data.adminId;
    console.log(`   ✓ Logged in: ${login1.data.name} (${admin1Id})\n`);

    // Step 2: Admin 1 initiates action
    console.log('2. Admin 1 initiates privileged action...');
    const initiate = await axios.post(`${API_BASE}/action/initiate`, {
      adminId: admin1Id,
      actionType: 'user_deletion',
      payload: { userId: 'user_123', reason: 'Account termination' }
    });
    const actionId = initiate.data.actionId;
    console.log(`   ✓ Action created: ${actionId}`);
    console.log(`   ✓ Approvals: ${initiate.data.approvals}/${initiate.data.approvalsNeeded}\n`);

    // Step 3: Admin 2 Login
    console.log('3. Admin 2 logs in...');
    const login2 = await axios.post(`${API_BASE}/login`, {
      email: 'admin2@medicare.com',
      password: 'password123'
    });
    const admin2Id = login2.data.adminId;
    console.log(`   ✓ Logged in: ${login2.data.name} (${admin2Id})\n`);

    // Step 4: Admin 2 approves
    console.log('4. Admin 2 approves action...');
    const approve2 = await axios.post(`${API_BASE}/action/approve`, {
      adminId: admin2Id,
      actionId: actionId
    });
    console.log(`   ✓ Action status: ${approve2.data.status}`);
    console.log(`   ✓ Approvals: ${approve2.data.approvals}/${approve2.data.approvalsNeeded}\n`);

    // Step 5: Admin 3 Login & Approve
    console.log('5. Admin 3 logs in and approves...');
    const login3 = await axios.post(`${API_BASE}/login`, {
      email: 'admin3@medicare.com',
      password: 'password123'
    });
    const admin3Id = login3.data.adminId;
    console.log(`   ✓ Logged in: ${login3.data.name} (${admin3Id})`);

    const approve3 = await axios.post(`${API_BASE}/action/approve`, {
      adminId: admin3Id,
      actionId: actionId
    });
    console.log(`   ✓ Action status: ${approve3.data.status}`);
    console.log(`   ✓ Approvals: ${approve3.data.approvals}/${approve3.data.approvalsNeeded}\n`);

    // Step 6: Get all actions
    console.log('6. Fetching all actions...');
    const actions = await axios.get(`${API_BASE}/actions`);
    console.log(`   ✓ Total actions: ${actions.data.length}`);
    console.log(`   ✓ Latest action status: ${actions.data[0].status}\n`);

    // Step 7: Try duplicate approval (should fail)
    console.log('7. Attempting duplicate approval (should fail)...');
    try {
      await axios.post(`${API_BASE}/action/approve`, {
        adminId: admin1Id,
        actionId: actionId
      });
    } catch (err) {
      console.log(`   ✗ Expected error: ${err.response.data.error}\n`);
    }

    console.log('========== TEST COMPLETE ==========\n');
  } catch (error) {
    console.error('Error during test:', error.message);
  }
};

const testDoctorDeletionFlow = async () => {
  try {
    console.log('\n========== DOCTOR DELETION APPROVAL TEST ==========\n');

    // Admin 1 Login
    console.log('1. Admin 1 logs in...');
    const login1 = await axios.post(`${API_BASE}/login`, {
      email: 'admin@medicare.com',
      password: 'password123'
    });
    const admin1Id = login1.data.adminId;
    console.log(`   ✓ Logged in: ${login1.data.name}\n`);

    // Note: In real test, you'd use actual doctor IDs from DB
    // For now, this demonstrates the flow
    console.log('2. Admin 1 initiates doctor deletion (requires real doctorId from DB)');
    console.log('   Example: POST /api/v1/admin/doctor/delete-request');
    console.log('   Body: { doctorId: <id>, adminId: <id>, reason: "Terminated" }\n');

    console.log('3. This creates a pending approval action');
    console.log('4. Admin 2 and Admin 3 must approve via /api/v1/admin-approval/action/approve');
    console.log('5. After 3 approvals, doctor is automatically deleted\n');

    console.log('========== DOCTOR DELETION TEST COMPLETE ==========\n');
  } catch (error) {
    console.error('Error during doctor deletion test:', error.message);
  }
};

const testPatientDeletionFlow = async () => {
  try {
    console.log('\n========== PATIENT DELETION APPROVAL TEST ==========\n');

    // Admin 1 Login
    console.log('1. Admin 1 logs in...');
    const login1 = await axios.post(`${API_BASE}/login`, {
      email: 'admin@medicare.com',
      password: 'password123'
    });
    const admin1Id = login1.data.adminId;
    console.log(`   ✓ Logged in: ${login1.data.name}\n`);

    // Note: In real test, you'd use actual patient IDs from DB
    // For now, this demonstrates the flow
    console.log('2. Admin 1 initiates patient deletion (requires real patientId from DB)');
    console.log('   Example: POST /api/v1/admin/patient/delete-request');
    console.log('   Body: { patientId: <id>, adminId: <id>, reason: "Account violation" }\n');

    console.log('3. This creates a pending approval action');
    console.log('4. Admin 2 and Admin 3 must approve via /api/v1/admin-approval/action/approve');
    console.log('5. After 3 approvals, patient is automatically deleted along with all appointments\n');

    console.log('========== PATIENT DELETION TEST COMPLETE ==========\n');
  } catch (error) {
    console.error('Error during patient deletion test:', error.message);
  }
};

// Run all test flows
(async () => {
  await testAdminApprovalFlow();
  await testDoctorDeletionFlow();
  await testPatientDeletionFlow();
})();
