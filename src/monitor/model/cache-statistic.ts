export class CacheStatistic {
  private available = 0;
  private missing = 0;
  private expected = 0;

  setExpected(expected: number) {
    this.expected = expected;
  }

  incrAvailable() {
    this.available += 1;
    this.missing = this.expected - this.available;
  }

  incrMissing() {
    this.missing += 1;
    this.available = this.expected - this.missing;
  }

  toString() {
    return `${this.available}/${this.expected}`;
  }
}
