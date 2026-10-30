import type { InteropMatrixItem } from '../../types/index.ts';

export interface MatrixSummaryMetrics {
  totalPermutations: number;
  testedCount: number;
  totalAttempts: number;
  totalCompletedRuns: number;
  totalPassRuns: number;
  totalFailRuns: number;
  totalErrorRuns: number;
  totalRunning: number;
  totalIncomplete: number;
  latestOverallVerdict: string;
  triadsLatestPassCount: number;
  triadsLatestFailCount: number;
}

export function isRowTested(item: InteropMatrixItem): boolean {
  return (
    (typeof item.attempt_count === 'number' && item.attempt_count > 0) ||
    (typeof item.completed_count === 'number' && item.completed_count > 0) ||
    (typeof item.execution_count === 'number' && item.execution_count > 0) ||
    Boolean(item.test_id)
  );
}

export function computeMatrixSummaryMetrics(matrixData: InteropMatrixItem[]): MatrixSummaryMetrics {
  const totalPermutations = matrixData.length;
  const testedItems = matrixData.filter(isRowTested);
  const testedCount = testedItems.length;

  const triadsLatestPassCount = testedItems.filter(
    (i) => (i.latest_verdict || i.display_status || i.status) === 'PASS'
  ).length;

  const triadsLatestFailCount = testedItems.filter(
    (i) => {
      const v = i.latest_verdict || i.display_status || i.status;
      return v === 'FAIL' || v === 'ERROR';
    }
  ).length;

  const totalCompletedRuns = testedItems.reduce(
    (acc, item) =>
      acc + (typeof item.completed_count === 'number' ? item.completed_count : (item.execution_count || (item.test_id ? 1 : 0))),
    0
  );

  const totalAttempts = testedItems.reduce(
    (acc, item) =>
      acc + (typeof item.attempt_count === 'number' ? item.attempt_count : totalCompletedRuns),
    0
  );

  const totalPassRuns = testedItems.reduce(
    (acc, item) =>
      acc + (typeof item.pass_count === 'number' ? item.pass_count : (item.status === 'PASS' ? 1 : 0)),
    0
  );

  const totalFailRuns = testedItems.reduce(
    (acc, item) =>
      acc + (typeof item.fail_count === 'number' ? item.fail_count : (item.status === 'FAIL' ? 1 : 0)),
    0
  );

  const totalErrorRuns = testedItems.reduce(
    (acc, item) =>
      acc + (typeof item.error_count === 'number' ? item.error_count : (item.status === 'ERROR' ? 1 : 0)),
    0
  );

  const totalRunning = testedItems.reduce(
    (acc, item) => acc + (item.running_count || 0),
    0
  );

  const totalIncomplete = testedItems.reduce(
    (acc, item) => acc + (item.incomplete_count || 0),
    0
  );

  // Derive latest execution verdict from tested items
  let latestOverallVerdict = 'NOT TESTED';
  if (testedItems.length > 0) {
    const primary = testedItems.find((t) => t.latest_verdict && t.latest_verdict !== 'NOT TESTED') || testedItems[0];
    latestOverallVerdict = primary.latest_verdict || primary.display_status || primary.status || 'PASS';
  }

  return {
    totalPermutations,
    testedCount,
    totalAttempts,
    totalCompletedRuns,
    totalPassRuns,
    totalFailRuns,
    totalErrorRuns,
    totalRunning,
    totalIncomplete,
    latestOverallVerdict,
    triadsLatestPassCount,
    triadsLatestFailCount,
  };
}
