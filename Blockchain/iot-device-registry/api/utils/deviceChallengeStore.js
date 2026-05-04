const crypto = require('crypto');

const challenges = new Map();
const CHALLENGE_TTL_MS = 5 * 60 * 1000;

function createChallenge(deviceId) {
  const nonce = crypto.randomBytes(32).toString('base64');
  const expiresAt = Date.now() + CHALLENGE_TTL_MS;
  challenges.set(deviceId, { nonce, expiresAt });
  return { nonce, expiresAt };
}

function getChallenge(deviceId) {
  const record = challenges.get(deviceId);
  if (!record) {
    return null;
  }

  if (record.expiresAt < Date.now()) {
    challenges.delete(deviceId);
    return null;
  }

  return record;
}

function consumeChallenge(deviceId) {
  const record = getChallenge(deviceId);
  challenges.delete(deviceId);
  return record;
}

module.exports = {
  consumeChallenge,
  createChallenge,
  getChallenge
};
