import { Measurements } from './measurements';

const DEFAULT_THRESHOLD = 10;

export class PerfTest {
  private static instance?: PerfTest;
  private readonly results: Map<string, number[]> = new Map();
  private readonly testTimes: Map<string, number> = new Map();

  private constructor() {}

  static getInstance(): PerfTest {
    if (this.instance) {
      return this.instance;
    }

    this.instance = new PerfTest();
    return this.instance;
  }

  measure(testName: string): () => void {
    const start = performance.now();
    return () => {
      const finish = performance.now();
      this.addResult(testName, finish - start);
    };
  }

  runTest(testName: string, seconds: number, fn: () => any): void {
    this.testTimes.set(testName, seconds);
    const ms = seconds * 1000;
    const start = performance.now();

    while (performance.now() - start < ms) {
      const done = this.measure(testName);
      fn();
      done();
    }
  }

  average(key: string): number {
    return this.calcAverage(this.getResults(key));
  }

  max(key: string): number {
    const res = this.getResults(key);
    return res[res.length - 1];
  }

  median(key: string): number {
    return this.calcMedian(this.getResults(key));
  }

  min(key: string): number {
    return this.getResults(key)[0];
  }

  normalizedAverage(
    key: string,
    thresholdPercentage = DEFAULT_THRESHOLD
  ): number {
    return this.calcAverage(
      this.getNormalizedResults(key, thresholdPercentage)
    );
  }

  normalizedMax(key: string, thresholdPercentage = DEFAULT_THRESHOLD): number {
    const res = this.getNormalizedResults(key, thresholdPercentage);
    return res[res.length - 1];
  }

  normalizedMedian(
    key: string,
    thresholdPercentage = DEFAULT_THRESHOLD
  ): number {
    return this.calcMedian(this.getNormalizedResults(key, thresholdPercentage));
  }

  normalizedMin(key: string, thresholdPercentage = DEFAULT_THRESHOLD): number {
    return this.getNormalizedResults(key, thresholdPercentage)[0];
  }

  getMeasurements(
    key: string,
    thresholdPercentage = DEFAULT_THRESHOLD
  ): Measurements {
    if (!this.results.has(key)) {
      throw new Error(`Measurements with key '${key}' doesn't exist.`);
    }

    const operations = this.getResults(key).length;
    const testTime = this.testTimes.get(key);
    return {
      testName: key,
      results: {
        average: this.average(key),
        normalizedAverage: this.normalizedAverage(key, thresholdPercentage),
        max: this.max(key),
        normalizedMax: this.normalizedMax(key, thresholdPercentage),
        min: this.min(key),
        normalizedMin: this.normalizedMin(key, thresholdPercentage),
        median: this.median(key),
        normalizedMedian: this.normalizedMedian(key, thresholdPercentage),
      },
      operations,
      opsPerSec: operations / (testTime || 1),
    };
  }

  getResults(key: string): number[] {
    return this.results.get(key).sort((a, b) => a - b);
  }

  getNormalizedResults(
    key: string,
    thresholdPercentage = DEFAULT_THRESHOLD
  ): number[] {
    const res = this.getResults(key);

    if (res.length < 3) {
      return res;
    }

    const normalizedRes: number[] = [];
    const middle = Math.floor(res.length / 2);

    for (let i = 0; i < middle; i++) {
      const j = res.length - 1 - i;
      const variation = 100 - (res[i] / res[j]) * 100;

      if (thresholdPercentage > variation) {
        normalizedRes.push(res[i], res[j]);
      }
    }

    return normalizedRes.length ? normalizedRes.sort((a, b) => a - b) : res;
  }

  private addResult(key: string, time: number): void {
    if (this.results.has(key)) {
      this.results.get(key).push(time);
    } else {
      this.results.set(key, [time]);
    }
  }

  private calcAverage(results: number[]): number {
    if (results.length === 0) {
      return 0;
    }

    if (results.length === 1) {
      return results[0];
    }

    return results.reduce((a, b) => a + b) / results.length;
  }

  private calcMedian(results: number[]): number {
    const middle = Math.floor(results.length / 2);
    const nums = [...results].sort((a, b) => a - b);
    return results.length % 2 !== 0
      ? nums[middle]
      : (nums[middle - 1] + nums[middle]) / 2;
  }
}
