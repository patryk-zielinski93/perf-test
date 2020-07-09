import { Measurements } from './measurements';
import { MeasurementsResults } from './measurements-results';
import { styles } from './styles';
import { TestResult } from './test-result';

type TestResultsMap = { [key: string]: TestResult[] };

export class TestResultsRenderer {
  private measurements: Measurements[] = [];

  addMeasurements(measurements: Measurements): void {
    this.measurements.push(measurements);
  }

  render(element: HTMLElement): void {
    const testResultsMap = this.prepareTestResults();
    const rows = new Map<keyof MeasurementsResults, string>();
    let header = '<thead><th>Type</th>';

    this.measurements.forEach((measurements) => {
      header += `<th>${measurements.testName}</th>`;

      Object.keys(testResultsMap).forEach((key: keyof MeasurementsResults) => {
        if (key !== 'average' && key !== 'normalizedAverage') {
          return;
        }
        const testResult = testResultsMap[key].find(
          (tr) => tr.testName === measurements.testName
        );
        if (rows.has(key)) {
          const row = rows.get(key);
          rows.set(key, `${row}${this.getTestResultHtml(testResult)}`);
        } else {
          rows.set(
            key,
            `<tr><td>${key}</td>${this.getTestResultHtml(testResult)}`
          );
        }
      });
    });

    let body = '';
    rows.forEach((value) => {
      body += value + '</tr>';
    });
    header += '</thead>';

    element.innerHTML = `<style>${styles}</style><table class="compared-measurements">${header}${body}</table>`;
  }

  private getTestResultHtml(testResult: TestResult): string {
    const cssClass = testResult.isSlowest
      ? 'slowest'
      : testResult.isFastest
      ? 'fastest'
      : '';
    const description =
      (testResult.isFastest ? 'Fastest' : 'Slower') +
      `<div><strong>${testResult.slower.toLocaleString()}%</strong></div>`;
    const operations = `
Operations<div>${testResult.operations.toLocaleString()}</div>
<div>Ops/sec</div>
<div>${testResult.opsPerSec.toLocaleString()}</div>
`;

    return `
<td class="${cssClass}">
    <div class="result">${testResult.value}ms</div>
    <div>${operations}</div>
    <div style="font-size: 10px">${description}</div>
</td>`;
  }

  private prepareTestResults(): TestResultsMap {
    const testResults: TestResultsMap = {};

    this.measurements.forEach((measurements) => {
      const results = measurements.results;

      Object.keys(results).forEach((resultKey) => {
        const res: TestResult = {
          value: results[resultKey],
          testName: measurements.testName,
          slower: 0,
          isFastest: false,
          isSlowest: false,
          operations: measurements.operations,
          opsPerSec: measurements.opsPerSec,
        };

        if (testResults[resultKey]) {
          testResults[resultKey].push(res);
        } else {
          testResults[resultKey] = [res];
        }
      });
    });

    Object.keys(testResults).forEach((key) => {
      this.calculateSlower(testResults[key].sort((a, b) => a.value - b.value));
    });

    return testResults;
  }

  private calculateSlower(resultsAggregate: TestResult[]): void {
    for (let i = 0; i < resultsAggregate.length; i++) {
      if (resultsAggregate[i].value !== 0) {
        const frac = resultsAggregate[i].value / resultsAggregate[0].value;
        resultsAggregate[i].slower =
          frac !== 1 ? Math.abs(Number((100 - frac * 100).toFixed(3))) : 0;
      }
    }

    if (
      resultsAggregate.some((res) => res.value !== resultsAggregate[0].value)
    ) {
      resultsAggregate[0].isFastest = true;
      resultsAggregate[resultsAggregate.length - 1].isSlowest = true;
    }
  }
}
