const express = require('express');
const { getOrCreateCode, createChallenge, verifyChallenge, getPatientsCurrentCode } = require('../services/consentService');

const router = express.Router();

// Patient retrieves their current verification code
router.get('/patient/code/:patientId', (req, res) => {
  const { patientId } = req.params;

  if (!patientId) {
    return res.status(400).json({ error: 'Patient ID required' });
  }

  const code = getOrCreateCode(patientId);
  res.json({ code });
});

// Doctor requests a challenge for a patient
router.get('/doctor/challenge/:patientId', (req, res) => {
  const { patientId } = req.params;

  if (!patientId) {
    return res.status(400).json({ error: 'Patient ID required' });
  }

  const challenge = createChallenge(patientId);
  res.json({
    challengeId: challenge.id,
    options: challenge.options
  });
});

// Doctor submits their code selection
router.post('/doctor/verify', (req, res) => {
  const { challengeId, selectedCode } = req.body;

  if (!challengeId || !selectedCode) {
    return res.status(400).json({ error: 'Challenge ID and code required' });
  }

  const result = verifyChallenge(challengeId, selectedCode);

  if (result.valid) {
    return res.json({ valid: true, message: 'Access granted' });
  }

  res.status(401).json({ valid: false, error: result.reason });
});

module.exports = router;
