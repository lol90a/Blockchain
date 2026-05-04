const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '../../data');

function ensureDataDir() {
  fs.mkdirSync(dataDir, { recursive: true });
}

function resolveStorePath(filename) {
  ensureDataDir();
  return path.join(dataDir, filename);
}

function readJsonFile(filename, fallbackValue) {
  const filePath = resolveStorePath(filename);

  if (!fs.existsSync(filePath)) {
    writeJsonFile(filename, fallbackValue);
    return structuredClone(fallbackValue);
  }

  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    return structuredClone(fallbackValue);
  }
}

function writeJsonFile(filename, value) {
  const filePath = resolveStorePath(filename);
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2));
}

module.exports = {
  dataDir,
  resolveStorePath,
  readJsonFile,
  writeJsonFile
};
