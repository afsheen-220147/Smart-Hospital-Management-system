const EXPIRY_TIME = 3 * 60 * 1000; // 3 minutes
const MAX_ATTEMPTS = 3;

const patientCodes = new Map(); // { patientId: { code, expiresAt } }
const challenges = new Map(); // { challengeId: { correct, options, patientId, attempts, expiresAt } }

function generateCode() {
  return String(Math.floor(Math.random() * 100)).padStart(2, '0');
}

function getOrCreateCode(patientId) {
  const now = Date.now();
  const existing = patientCodes.get(patientId);

  if (existing && existing.expiresAt > now) {
    return existing.code;
  }

  const code = generateCode();
  patientCodes.set(patientId, {
    code,
    expiresAt: now + EXPIRY_TIME
  });

  return code;
}

function createChallenge(patientId) {
  const correctCode = getOrCreateCode(patientId);
  const challenge = {
    id: Math.random().toString(36).substr(2, 9),
    correct: correctCode,
    patientId,
    attempts: 0,
    expiresAt: Date.now() + EXPIRY_TIME
  };

  // Generate 2 random codes (different from correct)
  const randomCodes = new Set([correctCode]);
  while (randomCodes.size < 3) {
    randomCodes.add(generateCode());
  }

  // Shuffle the 3 options
  challenge.options = Array.from(randomCodes).sort(() => Math.random() - 0.5);

  challenges.set(challenge.id, challenge);
  return challenge;
}

function verifyChallenge(challengeId, selectedCode) {
  const now = Date.now();
  const challenge = challenges.get(challengeId);

  if (!challenge) {
    return { valid: false, reason: 'Challenge not found' };
  }

  if (challenge.expiresAt < now) {
    challenges.delete(challengeId);
    return { valid: false, reason: 'Challenge expired' };
  }

  if (challenge.attempts >= MAX_ATTEMPTS) {
    challenges.delete(challengeId);
    return { valid: false, reason: 'Max attempts exceeded' };
  }

  challenge.attempts++;

  if (selectedCode === challenge.correct) {
    challenges.delete(challengeId);
    return { valid: true };
  }

  return { valid: false, reason: 'Incorrect code' };
}

function getPatientsCurrentCode(patientId) {
  const now = Date.now();
  const existing = patientCodes.get(patientId);

  if (existing && existing.expiresAt > now) {
    return existing.code;
  }

  return null;
}

// Cleanup expired entries every minute
setInterval(() => {
  const now = Date.now();
  for (const [id, data] of patientCodes.entries()) {
    if (data.expiresAt < now) {
      patientCodes.delete(id);
    }
  }
  for (const [id, data] of challenges.entries()) {
    if (data.expiresAt < now) {
      challenges.delete(id);
    }
  }
}, 60000);

module.exports = {
  getOrCreateCode,
  createChallenge,
  verifyChallenge,
  getPatientsCurrentCode
};
