import * as nodeCrypto from 'node:crypto';
const cryptoDefault = nodeCrypto.default ?? nodeCrypto;
if (typeof cryptoDefault.getRandomValues !== 'function') {
  cryptoDefault.getRandomValues = nodeCrypto.webcrypto.getRandomValues.bind(nodeCrypto.webcrypto);
}
if (!globalThis.crypto || typeof globalThis.crypto.getRandomValues !== 'function') {
  Object.defineProperty(globalThis, 'crypto', { value: nodeCrypto.webcrypto, configurable: true, writable: true });
}
const { build } = await import('vite');
await build();
console.log('BUILD_DONE');
