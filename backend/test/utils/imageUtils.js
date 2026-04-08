function pngBuffer() {
  return Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO8n5z0AAAAASUVORK5CYII=',
    'base64',
  );
}

module.exports = { pngBuffer };
