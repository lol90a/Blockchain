const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { Wallets } = require('fabric-network');

const walletPath = path.join(__dirname, '../../wallet');

async function getWallet() {
  return Wallets.newFileSystemWallet(walletPath);
}

async function getWalletIdentity(label) {
  const wallet = await getWallet();
  return wallet.get(label);
}

async function requireWalletIdentity(label) {
  const identity = await getWalletIdentity(label);
  if (!identity) {
    const error = new Error(`Fabric identity "${label}" was not found in the wallet`);
    error.code = 'FABRIC_IDENTITY_MISSING';
    throw error;
  }

  return identity;
}

async function getIdentitySummary(label) {
  const identity = await getWalletIdentity(label);
  if (!identity) {
    return {
      label,
      exists: false
    };
  }

  const certificate = identity.credentials?.certificate || '';
  return {
    label,
    exists: true,
    type: identity.type,
    mspId: identity.mspId,
    certificateFingerprint: crypto.createHash('sha256').update(certificate).digest('hex'),
    walletPath
  };
}

function adminIdentityIsRequired() {
  return String(process.env.ADMIN_REQUIRE_FABRIC_IDENTITY || 'true').toLowerCase() !== 'false';
}

function readConnectionProfilePath() {
  return path.resolve(process.env.CONNECTION_PROFILE_PATH || '');
}

function connectionProfileExists() {
  const profilePath = readConnectionProfilePath();
  return Boolean(profilePath) && fs.existsSync(profilePath);
}

module.exports = {
  getWalletIdentity,
  requireWalletIdentity,
  getIdentitySummary,
  adminIdentityIsRequired,
  readConnectionProfilePath,
  connectionProfileExists,
  walletPath
};
