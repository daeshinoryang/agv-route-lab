/**
 * AGV Route Lab - Web Worker for Graph Computations
 */
import { findEulerianPath, findHamiltonianPath } from './graphAlgorithms.js';

self.onmessage = function (e) {
  const { type, graph, startNodeId, returnToStart, searchGoal, limits } = e.data;

  try {
    if (type === 'EULER') {
      const result = findEulerianPath(graph, startNodeId, returnToStart);
      self.postMessage({ type: 'SUCCESS', result });
    } else if (type === 'HAMILTON') {
      const result = findHamiltonianPath(graph, startNodeId, returnToStart, searchGoal, limits);
      self.postMessage({ type: 'SUCCESS', result });
    } else {
      self.postMessage({ type: 'ERROR', message: `알 수 없는 연산 타입: ${type}` });
    }
  } catch (err) {
    self.postMessage({ type: 'ERROR', message: err.message || '연산 중 예외가 발생했습니다.' });
  }
};
