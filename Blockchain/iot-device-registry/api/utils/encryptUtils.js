const crypto = require("crypto");

const algorithm = "aes-256-cbc";
const ivLength = 16;

// Get the secret key and ensure it's the correct length for AES-256
function getSecretKey() {
  const secret = process.env.AES_SECRET;
  
  if (!secret) {
    throw new Error('AES_SECRET environment variable is not set');
  }
  
  // If it's a hex string, convert it
  if (secret.match(/^[0-9a-fA-F]+$/)) {
    if (secret.length !== 64) {
      throw new Error('Hex AES_SECRET must be exactly 64 characters (32 bytes)');
    }
    return Buffer.from(secret, 'hex');
  }
  
  // If it's a regular string, hash it to get 32 bytes
  return crypto.createHash('sha256').update(secret).digest();
}

const secretKey = getSecretKey();

exports.encrypt = (text) => {
  const iv = crypto.randomBytes(ivLength);
  const cipher = crypto.createCipheriv(algorithm, secretKey, iv);
  let encrypted = cipher.update(text, 'utf8');
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString("hex") + ":" + encrypted.toString("hex");
};

exports.decrypt = (text) => {
  const textParts = text.split(":");
  const iv = Buffer.from(textParts.shift(), "hex");
  const encryptedText = Buffer.from(textParts.join(":"), "hex");
  const decipher = crypto.createDecipheriv(algorithm, secretKey, iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString('utf8');
};
