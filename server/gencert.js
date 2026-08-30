const selfsigned = require('selfsigned');
const fs = require('fs');

const result = selfsigned.generate([{ name: 'commonName', value: 'localhost' }], { days: 365 });

if (result && typeof result.then === 'function') {
  // Async version
  result.then((pems) => {
    fs.writeFileSync('key.pem', pems.private);
    fs.writeFileSync('cert.pem', pems.cert);
    console.log('Certificate generated successfully (async).');
  }).catch((err) => {
    console.error('Error:', err);
  });
} else {
  // Sync version
  fs.writeFileSync('key.pem', result.private);
  fs.writeFileSync('cert.pem', result.cert);
  console.log('Certificate generated successfully (sync).');
}