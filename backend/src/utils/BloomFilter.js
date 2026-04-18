const { createHash } = require('crypto');

class BloomFilter {
  constructor(expectedItems = 10000, falsePositiveRate = 0.01) {
    const safeExpectedItems = Math.max(1, expectedItems);
    const safeFalsePositiveRate = Math.min(Math.max(falsePositiveRate, 0.0001), 0.5);

    const bitCount = Math.ceil(
      -(safeExpectedItems * Math.log(safeFalsePositiveRate)) / (Math.log(2) ** 2),
    );
    const hashCount = Math.max(1, Math.round((bitCount / safeExpectedItems) * Math.log(2)));

    this.bitCount = bitCount;
    this.hashCount = hashCount;
    this.bytes = Buffer.alloc(Math.ceil(bitCount / 8), 0);
  }

  _locations(value) {
    const normalized = String(value);
    const digest = createHash('sha256').update(normalized).digest();
    const locations = [];

    for (let i = 0; i < this.hashCount; i += 1) {
      const offset = (i * 4) % (digest.length - 3);
      const hashValue = digest.readUInt32BE(offset);
      locations.push(hashValue % this.bitCount);
    }

    return locations;
  }

  add(value) {
    for (const location of this._locations(value)) {
      const byteIndex = Math.floor(location / 8);
      const bitIndex = location % 8;
      this.bytes[byteIndex] |= (1 << bitIndex);
    }
  }

  mightContain(value) {
    for (const location of this._locations(value)) {
      const byteIndex = Math.floor(location / 8);
      const bitIndex = location % 8;
      if ((this.bytes[byteIndex] & (1 << bitIndex)) === 0) {
        return false;
      }
    }
    return true;
  }
}

module.exports = BloomFilter;

