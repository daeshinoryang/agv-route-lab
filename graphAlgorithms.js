/**
 * AGV Route Lab - Graph Algorithms Module
 * 오일러 경로/회로 및 해밀턴 경로/회로 계산 및 검증 알고리즘
 * (브라우저 직접 실행 file:// 및 모듈 환경 모두 지원)
 */

(function (global) {
  'use strict';

  // 그래프 연결성 검사 (BFS)
  function checkConnectedness(nodes, edges) {
    if (nodes.length === 0) return { connected: true, components: [], isolatedNodes: [] };
    
    const adj = new Map();
    nodes.forEach(n => adj.set(n.id, []));
    edges.forEach(e => {
      if (adj.has(e.u) && adj.has(e.v)) {
        adj.get(e.u).push(e.v);
        adj.get(e.v).push(e.u);
      }
    });

    const visited = new Set();
    const components = [];

    for (const node of nodes) {
      if (!visited.has(node.id)) {
        const comp = [];
        const queue = [node.id];
        visited.add(node.id);

        while (queue.length > 0) {
          const curr = queue.shift();
          comp.push(curr);
          for (const neighbor of adj.get(curr) || []) {
            if (!visited.has(neighbor)) {
              visited.add(neighbor);
              queue.push(neighbor);
            }
          }
        }
        components.push(comp);
      }
    }

    return {
      connected: components.length <= 1,
      components,
      isolatedNodes: nodes.filter(n => (adj.get(n.id) || []).length === 0).map(n => n.id)
    };
  }

  // 각 꼭짓점의 차수(Degree) 계산
  function calculateDegrees(nodes, edges) {
    const degrees = new Map();
    nodes.forEach(n => degrees.set(n.id, 0));
    edges.forEach(e => {
      if (degrees.has(e.u)) degrees.set(e.u, degrees.get(e.u) + 1);
      if (degrees.has(e.v)) degrees.set(e.v, degrees.get(e.v) + 1);
    });
    return degrees;
  }

  // ==========================================
  // 1. 오일러 경로 / 회로 (Hierholzer 알고리즘)
  // ==========================================
  function findEulerianPath(graph, startNodeId, returnToStart) {
    const { nodes, edges } = graph;

    // 1. 기초 검증: 노드 및 엣지 유무
    if (nodes.length === 0 || edges.length === 0) {
      return {
        success: false,
        reason: 'EMPTY_GRAPH',
        message: '그래프에 작업 지점과 통로가 충분하지 않습니다.',
        details: '최소 2개 이상의 지점과 1개 이상의 통로가 필요합니다.'
      };
    }

    // 2. 연결성 검사
    const conn = checkConnectedness(nodes, edges);
    if (conn.isolatedNodes.length > 0 && nodes.length > 1) {
      return {
        success: false,
        reason: 'DISCONNECTED_GRAPH',
        message: '고립된 작업 지점이 존재합니다.',
        details: `통로가 연결되지 않은 지점(${conn.isolatedNodes.join(', ')})이 있어 모든 지점/통로 점검이 불가능합니다.`
      };
    }
    if (conn.components.length > 1) {
      return {
        success: false,
        reason: 'DISCONNECTED_GRAPH',
        message: '그래프가 서로 분리된 구역으로 나뉘어 있습니다.',
        details: `분리된 구역: ${conn.components.map(c => `[${c.join(', ')}]`).join(', ')}`
      };
    }

    // 3. 차수 계산 및 홀수 차수 꼭짓점 확인
    const degrees = calculateDegrees(nodes, edges);
    const oddNodes = [];
    degrees.forEach((deg, id) => {
      if (deg % 2 !== 0) oddNodes.push(id);
    });

    // 4. 오일러 회로(출발점 복귀) 조건 검사
    if (returnToStart) {
      if (oddNodes.length > 0) {
        return {
          success: false,
          reason: 'NO_EULER_CIRCUIT_ODD_DEGREE',
          message: '오일러 회로가 존재하지 않습니다.',
          details: `출발점으로 복귀하려면 모든 지점의 차수가 짝수여야 합니다. 현재 홀수 차수 지점: ${oddNodes.map(id => `${id}(차수 ${degrees.get(id)})`).join(', ')}`,
          oddNodes,
          degrees: Object.fromEntries(degrees)
        };
      }
    } else {
      // 오일러 경로(복귀 불필요) 조건 검사
      if (oddNodes.length !== 0 && oddNodes.length !== 2) {
        return {
          success: false,
          reason: 'NO_EULER_PATH_ODD_DEGREE',
          message: '오일러 경로가 존재하지 않습니다.',
          details: `모든 통로를 한 번씩 통과하는 경로는 홀수 차수 지점이 0개 또는 2개여야 합니다. 현재 홀수 차수 지점은 ${oddNodes.length}개(${oddNodes.join(', ')})입니다.`,
          oddNodes,
          degrees: Object.fromEntries(degrees)
        };
      }

      // 홀수 차수가 2개인데 짝수 차수 출발점을 고른 경우
      if (oddNodes.length === 2 && !oddNodes.includes(startNodeId)) {
        return {
          success: false,
          reason: 'INVALID_START_NODE_EULER',
          message: `선택한 출발 지점(${startNodeId})에서는 오일러 경로를 시작할 수 없습니다.`,
          details: `홀수 차수 지점이 2개인 경우, 반드시 두 홀수 지점 중 하나(${oddNodes.join(' 또는 ')})에서 출발해야 합니다. 지점 ${startNodeId}의 차수는 짝수(${degrees.get(startNodeId)})입니다.`,
          suggestedStarts: oddNodes,
          oddNodes,
          degrees: Object.fromEntries(degrees)
        };
      }
    }

    // 5. Hierholzer 알고리즘 구현 (무방향 그래프)
    const adj = new Map();
    nodes.forEach(n => adj.set(n.id, []));
    edges.forEach(e => {
      adj.get(e.u).push({ edgeId: e.id, target: e.v, distance: e.distance });
      adj.get(e.v).push({ edgeId: e.id, target: e.u, distance: e.distance });
    });

    const usedEdgeIds = new Set();
    const currentPathStack = [startNodeId];
    const finalPath = [];

    const edgeIndexMap = new Map();
    nodes.forEach(n => edgeIndexMap.set(n.id, 0));

    while (currentPathStack.length > 0) {
      const curr = currentPathStack[currentPathStack.length - 1];
      const neighbors = adj.get(curr) || [];
      let foundUnusedEdge = false;

      while (edgeIndexMap.get(curr) < neighbors.length) {
        const idx = edgeIndexMap.get(curr);
        edgeIndexMap.set(curr, idx + 1);
        const edgeInfo = neighbors[idx];

        if (!usedEdgeIds.has(edgeInfo.edgeId)) {
          usedEdgeIds.add(edgeInfo.edgeId);
          currentPathStack.push(edgeInfo.target);
          foundUnusedEdge = true;
          break;
        }
      }

      if (!foundUnusedEdge) {
        finalPath.push(currentPathStack.pop());
      }
    }

    finalPath.reverse();

    // 엣지 정보 및 순서 매핑
    const edgeLookup = new Map();
    edges.forEach(e => {
      edgeLookup.set(`${e.u}-${e.v}`, e);
      edgeLookup.set(`${e.v}-${e.u}`, e);
    });

    let totalDistance = 0;
    const pathEdges = [];
    for (let i = 0; i < finalPath.length - 1; i++) {
      const u = finalPath[i];
      const v = finalPath[i + 1];
      const edge = edgeLookup.get(`${u}-${v}`);
      if (edge) {
        pathEdges.push(edge);
        totalDistance += Number(edge.distance);
      }
    }

    // 유효성 검증
    const validation = validateEulerian(finalPath, pathEdges, edges);
    if (!validation.isValid) {
      return {
        success: false,
        reason: 'ALGORITHM_VALIDATION_FAILED',
        message: '계산된 오일러 경로 검증에 실패했습니다.',
        details: validation.error
      };
    }

    const isCircuit = finalPath[0] === finalPath[finalPath.length - 1];
    let explanation = '';
    if (oddNodes.length === 0) {
      explanation = `모든 꼭짓점의 차수가 짝수이므로 완전한 오일러 회로(총 거리 ${totalDistance}m)가 성립합니다.`;
    } else {
      explanation = `홀수 차수인 지점이 ${oddNodes.join('와 ')}이므로, ${finalPath[0]}에서 출발하여 ${finalPath[finalPath.length - 1]}에 도착하는 열린 오일러 경로(총 거리 ${totalDistance}m)를 완성했습니다.`;
    }

    return {
      success: true,
      mode: 'EULER',
      path: finalPath,
      pathEdges,
      totalDistance,
      isCircuit,
      startNode: finalPath[0],
      endNode: finalPath[finalPath.length - 1],
      uniqueNodesVisited: new Set(finalPath).size,
      uniqueEdgesTraversed: new Set(pathEdges.map(e => e.id)).size,
      totalGraphEdges: edges.length,
      oddNodes,
      degrees: Object.fromEntries(degrees),
      explanation,
      optimalityConfirmed: true
    };
  }

  // 오일러 경로 유효성 검증
  function validateEulerian(path, pathEdges, originalEdges) {
    if (path.length !== originalEdges.length + 1) {
      return {
        isValid: false,
        error: `경로 지점 수(${path.length})가 통로 수+1(${originalEdges.length + 1})과 다릅니다.`
      };
    }
    if (pathEdges.length !== originalEdges.length) {
      return {
        isValid: false,
        error: `통과한 통로 수(${pathEdges.length})가 전체 통로 수(${originalEdges.length})와 일치하지 않습니다.`
      };
    }
    const usedIds = new Set();
    for (const e of pathEdges) {
      if (usedIds.has(e.id)) {
        return { isValid: false, error: `통로 ${e.u}-${e.v}(ID: ${e.id})가 중복 통과되었습니다.` };
      }
      usedIds.add(e.id);
    }
    return { isValid: true };
  }

  // ==========================================
  // 2. 해밀턴 경로 / 회로 (백트래킹 & 분기한정법)
  // ==========================================
  function findHamiltonianPath(graph, startNodeId, returnToStart, searchGoal = 'shortest', limits = {}) {
    const { nodes, edges } = graph;
    const maxSteps = limits.maxSteps || 300000;
    const timeoutMs = limits.timeoutMs || 2500;
    const startTime = Date.now();

    if (nodes.length === 0) {
      return { success: false, reason: 'EMPTY_GRAPH', message: '작업 지점이 없습니다.' };
    }
    if (nodes.length === 1) {
      return {
        success: true,
        mode: 'HAMILTON',
        path: [nodes[0].id],
        pathEdges: [],
        totalDistance: 0,
        isCircuit: returnToStart,
        startNode: nodes[0].id,
        endNode: nodes[0].id,
        uniqueNodesVisited: 1,
        uniqueEdgesTraversed: 0,
        totalGraphNodes: 1,
        explanation: '단일 지점으로 이동이 필요 없습니다.',
        optimalityConfirmed: true
      };
    }

    const degrees = calculateDegrees(nodes, edges);
    const isolated = nodes.filter(n => degrees.get(n.id) === 0);
    if (isolated.length > 0) {
      return {
        success: false,
        reason: 'ISOLATED_NODE',
        message: '연결되지 않은 작업 지점이 있습니다.',
        details: `지점 ${isolated.map(n => n.id).join(', ')}은 연결된 통로가 없어 방문할 수 없습니다.`,
        hitLimit: false
      };
    }

    if (returnToStart) {
      const leafNodes = nodes.filter(n => degrees.get(n.id) < 2);
      if (leafNodes.length > 0) {
        return {
          success: false,
          reason: 'LEAF_NODE_PREVENTS_CIRCUIT',
          message: '해밀턴 회로를 구성할 수 없습니다.',
          details: `회로(사이클)가 되려면 모든 지점의 차수가 최소 2 이상이어야 하지만, 지점 ${leafNodes.map(n => `${n.id}(차수 ${degrees.get(n.id)})`).join(', ')}의 차수가 부족합니다.`,
          hitLimit: false
        };
      }
    }

    const adj = new Map();
    nodes.forEach(n => adj.set(n.id, []));
    const edgeMap = new Map();

    edges.forEach(e => {
      adj.get(e.u).push({ target: e.v, distance: Number(e.distance), edge: e });
      adj.get(e.v).push({ target: e.u, distance: Number(e.distance), edge: e });
      edgeMap.set(`${e.u}-${e.v}`, e);
      edgeMap.set(`${e.v}-${e.u}`, e);
    });

    nodes.forEach(n => {
      adj.get(n.id).sort((a, b) => a.distance - b.distance);
    });

    const totalNodeCount = nodes.length;
    let stepsExplored = 0;
    let hitLimit = false;

    let bestPath = null;
    let bestDistance = Infinity;
    let foundAnyPath = null;
    let foundAnyDistance = Infinity;

    const currentPath = [startNodeId];
    const visited = new Set([startNodeId]);

    function backtrack(currNode, currentDistance) {
      stepsExplored++;
      if (stepsExplored > maxSteps || Date.now() - startTime > timeoutMs) {
        hitLimit = true;
        return;
      }

      if (searchGoal === 'shortest' && currentDistance >= bestDistance) {
        return;
      }

      if (currentPath.length === totalNodeCount) {
        if (returnToStart) {
          const returnEdge = edgeMap.get(`${currNode}-${startNodeId}`);
          if (returnEdge) {
            const finalDist = currentDistance + Number(returnEdge.distance);
            const fullPath = [...currentPath, startNodeId];
            if (!foundAnyPath) {
              foundAnyPath = fullPath;
              foundAnyDistance = finalDist;
            }
            if (finalDist < bestDistance) {
              bestDistance = finalDist;
              bestPath = fullPath;
            }
          }
        } else {
          if (!foundAnyPath) {
            foundAnyPath = [...currentPath];
            foundAnyDistance = currentDistance;
          }
          if (currentDistance < bestDistance) {
            bestDistance = currentDistance;
            bestPath = [...currentPath];
          }
        }

        if (searchGoal === 'any' && foundAnyPath) {
          return;
        }
        return;
      }

      const neighbors = adj.get(currNode) || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor.target)) {
          visited.add(neighbor.target);
          currentPath.push(neighbor.target);

          backtrack(neighbor.target, currentDistance + neighbor.distance);

          currentPath.pop();
          visited.delete(neighbor.target);

          if (searchGoal === 'any' && foundAnyPath) return;
          if (hitLimit) return;
        }
      }
    }

    backtrack(startNodeId, 0);

    const selectedPath = (searchGoal === 'shortest' ? bestPath : (foundAnyPath || bestPath));
    const finalDistance = (searchGoal === 'shortest' ? bestDistance : (foundAnyDistance || bestDistance));

    if (!selectedPath) {
      if (hitLimit) {
        return {
          success: false,
          reason: 'SEARCH_LIMIT_REACHED',
          message: '탐색 제한 안에서 경로를 확인하지 못했습니다.',
          details: `정해진 탐색 연산 한도(${stepsExplored.toLocaleString()}단계) 또는 시간 제한에 도달하여 경로를 확정하지 못했습니다.`,
          hitLimit: true,
          stepsExplored
        };
      } else {
        return {
          success: false,
          reason: 'NO_HAMILTONIAN_PATH',
          message: returnToStart ? '조건을 만족하는 해밀턴 회로가 존재하지 않습니다.' : '모든 지점을 한 번씩 방문하는 해밀턴 경로가 존재하지 않습니다.',
          details: '가능한 모든 이동 조합을 확인하였으나, 지점을 중복 없이 모두 방문하는 연결 경로가 없습니다.',
          hitLimit: false,
          stepsExplored
        };
      }
    }

    const pathEdges = [];
    for (let i = 0; i < selectedPath.length - 1; i++) {
      const u = selectedPath[i];
      const v = selectedPath[i + 1];
      const edge = edgeMap.get(`${u}-${v}`);
      if (edge) pathEdges.push(edge);
    }

    const validation = validateHamiltonian(selectedPath, pathEdges, nodes, returnToStart);
    if (!validation.isValid) {
      return {
        success: false,
        reason: 'ALGORITHM_VALIDATION_FAILED',
        message: '해밀턴 경로 검증 실패',
        details: validation.error
      };
    }

    const optimalityConfirmed = (!hitLimit && searchGoal === 'shortest');
    const isCircuit = returnToStart && selectedPath[0] === selectedPath[selectedPath.length - 1];

    let explanation = '';
    if (returnToStart) {
      explanation = `모든 작업 지점 ${totalNodeCount}개를 정확히 한 번씩 거쳐 출발점(${startNodeId})으로 복귀하는 해밀턴 회로(총 거리 ${finalDistance}m)를 찾았습니다.`;
    } else {
      explanation = `모든 작업 지점 ${totalNodeCount}개를 중복 없이 한 번씩 방문하는 해밀턴 경로(총 거리 ${finalDistance}m, 도착점 ${selectedPath[selectedPath.length - 1]})를 찾았습니다.`;
    }

    if (searchGoal === 'shortest') {
      if (optimalityConfirmed) {
        explanation += ' (전체 후보 검증을 완료한 최단거리 최적 경로입니다)';
      } else if (hitLimit) {
        explanation += ' (탐색 제한으로 인해 더 짧은 경로가 있을 수 있습니다)';
      }
    }

    return {
      success: true,
      mode: 'HAMILTON',
      path: selectedPath,
      pathEdges,
      totalDistance: finalDistance,
      isCircuit,
      startNode: selectedPath[0],
      endNode: selectedPath[selectedPath.length - 1],
      uniqueNodesVisited: new Set(selectedPath).size,
      uniqueEdgesTraversed: new Set(pathEdges.map(e => e.id)).size,
      totalGraphNodes: totalNodeCount,
      stepsExplored,
      hitLimit,
      optimalityConfirmed,
      searchGoal,
      explanation
    };
  }

  // 해밀턴 경로 검증
  function validateHamiltonian(path, pathEdges, originalNodes, returnToStart) {
    const expectedUniqueCount = originalNodes.length;

    if (returnToStart) {
      if (path.length !== expectedUniqueCount + 1) {
        return { isValid: false, error: `회로 경로 지점 수(${path.length})가 N+1(${expectedUniqueCount + 1})과 맞지 않습니다.` };
      }
      if (path[0] !== path[path.length - 1]) {
        return { isValid: false, error: '회로 경로의 출발점과 도착점이 일치하지 않습니다.' };
      }
      const innerNodes = path.slice(0, path.length - 1);
      const innerSet = new Set(innerNodes);
      if (innerSet.size !== expectedUniqueCount) {
        return { isValid: false, error: '모든 작업 지점을 한 번씩 방문하지 않았거나 중복 방문이 있습니다.' };
      }
    } else {
      if (path.length !== expectedUniqueCount) {
        return { isValid: false, error: `경로 지점 수(${path.length})가 전체 지점 수(${expectedUniqueCount})와 맞지 않습니다.` };
      }
      const pathSet = new Set(path);
      if (pathSet.size !== expectedUniqueCount) {
        return { isValid: false, error: '모든 작업 지점을 정확히 한 번씩 방문하지 않았습니다.' };
      }
    }

    return { isValid: true };
  }

  const api = {
    checkConnectedness,
    calculateDegrees,
    findEulerianPath,
    validateEulerian,
    findHamiltonianPath,
    validateHamiltonian
  };

  // 전역 객체 등록 (file:// 환경 지원)
  global.GraphAlgorithms = api;

  // ES 모듈 export 호환
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof window !== 'undefined' ? window : this);
