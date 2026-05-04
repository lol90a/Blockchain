const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { dataDir } = require('../utils/jsonStore');

const localArchiveDir = path.join(dataDir, 'ipfs-archive');

function ensureArchiveDir() {
  fs.mkdirSync(localArchiveDir, { recursive: true });
}

async function tryRemoteIpfsAdd(payload, name) {
  const apiBase = process.env.IPFS_API_URL;
  if (!apiBase) {
    return null;
  }

  const form = new FormData();
  form.append(
    'file',
    new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }),
    `${name}.json`
  );

  const response = await fetch(`${apiBase.replace(/\/$/, '')}/api/v0/add?pin=true`, {
    method: 'POST',
    body: form
  });

  if (!response.ok) {
    throw new Error(`IPFS add failed with status ${response.status}`);
  }

  const raw = (await response.text()).trim().split('\n').pop();
  const parsed = JSON.parse(raw);

  return {
    provider: 'ipfs',
    cid: parsed.Hash,
    uri: `ipfs://${parsed.Hash}`,
    pinned: true,
    name: parsed.Name,
    size: parsed.Size
  };
}

function persistLocalArchive(payload, name) {
  ensureArchiveDir();
  const serialized = JSON.stringify(payload, null, 2);
  const cid = crypto.createHash('sha256').update(serialized).digest('hex');
  const filePath = path.join(localArchiveDir, `${cid}.json`);

  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, serialized);
  }

  return {
    provider: 'local-archive',
    cid,
    uri: `local-archive://${cid}`,
    pinned: false,
    name,
    path: filePath
  };
}

async function storeAuditBundle(payload, name = 'audit-bundle') {
  try {
    const remoteReceipt = await tryRemoteIpfsAdd(payload, name);
    if (remoteReceipt) {
      return remoteReceipt;
    }
  } catch (error) {
    return {
      ...persistLocalArchive(payload, name),
      warning: error.message
    };
  }

  return persistLocalArchive(payload, name);
}

module.exports = {
  storeAuditBundle
};
