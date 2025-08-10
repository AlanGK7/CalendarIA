import crypto from 'crypto';

const algorithm = 'aes-256-cbc';
const key = Buffer.from(process.env.KEY);
const iv = Buffer.alloc(16, 0); // IV fijo para simplicidad. Mejora con uno aleatorio si lo deseas.

export function encrypt(text) {
  if (!text) throw new Error("Texto vacío para cifrar");
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  return encrypted.toString('base64');
}

export function decrypt(encryptedText) {
  if (!encryptedText) throw new Error("Texto vacío para descifrar");
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedText, 'base64')),
    decipher.final()
  ]);
  return decrypted.toString('utf8');
}
