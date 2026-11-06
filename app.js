/**
 * AGV Route Lab - Main Application Logic
 * (브라우저 직접 실행 file:// 및 웹서버 모두 지원)
 */

(function () {
  'use strict';

  // 전역 데이터 및 알고리즘 참조
  const EXAMPLES = window.EXAMPLES || [];
  const GraphAlgorithms = window.GraphAlgorithms || {};
  const {
    findEulerianPath,
    findHamiltonianPath,
    checkConnectedness,
    calculateDegrees
  } = GraphAlgorithms;

  class AGVRouteLabApp {
    constructor() {
      // 1. 상태 변수
      this.currentExampleId = 'example-1';
      this.nodes = [];
      this.edges = [];
      this.shelves = [];
      
      this.taskConfig = {
        mode: 'EULER',          // 'EULER' | 'HAMILTON'
        startNodeId: 'A',
        returnToStart: true,
        searchGoal: 'any'       // 'any' | 'shortest'
      };

      this.calculationResult = null;

      // 애니메이션 상태
      this.animation = {
        status: 'IDLE',         // 'IDLE' | 'PLAYING' | 'PAUSED' | 'FINISHED'
        stepIndex: 0,           // 현재 세그먼트 인덱스 (0 ~ path.length - 2)
        progressInStep: 0,      // 0.0 ~ 1.0
        speedMultiplier: 1.0,
        rafId: null,
        lastTimestamp: null,
        traversedDistance: 0,
        visitedNodes: new Set(),
        traversedEdges: new Set(),
        baseSpeedMeterPerSec: 6.0 // 1초당 6m 주행
      };

      // 뷰포트 (Zoom & Pan)
      this.viewBox = { x: 0, y: 0, w: 900, h: 560 };
      this.defaultViewBox = { x: 0, y: 0, w: 900, h: 560 };
      this.isPanning = false;
      this.panStart = { x: 0, y: 0 };

      // 편집 모드
      this.editMode = {
        isActive: false,
        tool: 'select',         // 'select' | 'add-node' | 'add-edge' | 'delete' | 'edit-weight'
        edgeStartNodeId: null,
        draggingNodeId: null,
        dragOffset: { x: 0, y: 0 }
      };

      this.targetEdgeForDistance = null;

      // DOM 캐싱 및 이벤트 바인딩
      this.cacheDom();
      this.bindEvents();

      // 초기 예제 로드 및 자동 계산
      this.loadExample(this.currentExampleId);
    }

    // DOM 엘리먼트 캐싱
    cacheDom() {
      this.dom = {
        // Header
        exampleSelect: document.getElementById('exampleSelect'),
        btnResetMap: document.getElementById('btnResetMap'),
        btnOpenHelp: document.getElementById('btnOpenHelp'),

        // Map Selection Tabs
        mapTabsGroup: document.getElementById('mapTabsGroup'),
        mapTabBtns: document.querySelectorAll('.map-tab-btn'),

        // Left Panel
        modeBtnEuler: document.getElementById('modeBtnEuler'),
        modeBtnHamilton: document.getElementById('modeBtnHamilton'),
        startNodeSelect: document.getElementById('startNodeSelect'),
        startNodeHelp: document.getElementById('startNodeHelp'),
        chkReturnToStart: document.getElementById('chkReturnToStart'),
        returnDesc: document.getElementById('returnDesc'),
        hamiltonGoalGroup: document.getElementById('hamiltonGoalGroup'),
        hamiltonGoalRadios: document.querySelectorAll('input[name="hamiltonGoal"]'),
        eulerFixedDistanceNotice: document.getElementById('eulerFixedDistanceNotice'),
        btnComputeRoute: document.getElementById('btnComputeRoute'),

        // Edit Mode
        btnToggleEditMode: document.getElementById('btnToggleEditMode'),
        editBtnText: document.getElementById('editBtnText'),
        editToolsSubmenu: document.getElementById('editToolsSubmenu'),
        editToolPills: document.querySelectorAll('.pill-btn[data-tool]'),
        editModeNotice: document.getElementById('editModeNotice'),
        editModePromptText: document.getElementById('editModePromptText'),

        // Canvas & Map
        svgContainer: document.getElementById('svgContainer'),
        svg: document.getElementById('warehouseSvg'),
        btnZoomIn: document.getElementById('btnZoomIn'),
        btnZoomOut: document.getElementById('btnZoomOut'),
        btnZoomFit: document.getElementById('btnZoomFit'),
        zoomLevelText: document.getElementById('zoomLevelText'),

        // SVG Layers
        layerShelves: document.getElementById('layerShelves'),
        layerCorridors: document.getElementById('layerCorridors'),
        layerCalculatedPath: document.getElementById('layerCalculatedPath'),
        layerWeights: document.getElementById('layerWeights'),
        layerNodes: document.getElementById('layerNodes'),
        layerAgv: document.getElementById('layerAgv'),

        // Playback Controls
        btnPlayPause: document.getElementById('btnPlayPause'),
        iconPlay: document.getElementById('iconPlay'),
        iconPause: document.getElementById('iconPause'),
        playPauseText: document.getElementById('playPauseText'),
        btnStepForward: document.getElementById('btnStepForward'),
        btnResetAnimation: document.getElementById('btnResetAnimation'),
        speedPills: document.querySelectorAll('.speed-pill'),
        telemetryCurrentPos: document.getElementById('telemetryCurrentPos'),
        telemetryNextPos: document.getElementById('telemetryNextPos'),
        telemetryDist: document.getElementById('telemetryDist'),
        telemetryProgress: document.getElementById('telemetryProgress'),

        // Right Panel
        resultStatusBanner: document.getElementById('resultStatusBanner'),
        statusIconReady: document.getElementById('statusIconReady'),
        statusIconSuccess: document.getElementById('statusIconSuccess'),
        statusIconFail: document.getElementById('statusIconFail'),
        statusIconLimit: document.getElementById('statusIconLimit'),
        resultStatusTitle: document.getElementById('resultStatusTitle'),
        resultStatusSub: document.getElementById('resultStatusSub'),
        mTotalDistance: document.getElementById('mTotalDistance'),
        mStartEnd: document.getElementById('mStartEnd'),
        mUniqueNodes: document.getElementById('mUniqueNodes'),
        mUniqueEdges: document.getElementById('mUniqueEdges'),
        optimalityBox: document.getElementById('optimalityBox'),
        optimalityStatusText: document.getElementById('optimalityStatusText'),
        itineraryList: document.getElementById('itineraryList'),
        stepCountBadge: document.getElementById('stepCountBadge'),

        // Bottom Theory Panel
        btnToggleTheoryDetails: document.getElementById('btnToggleTheoryDetails'),
        theoryToggleText: document.getElementById('theoryToggleText'),
        theoryArrowIcon: document.getElementById('theoryArrowIcon'),
        groundingSummaryBox: document.getElementById('groundingSummaryBox'),
        groundingLeadText: document.getElementById('groundingLeadText'),
        groundingDetailsText: document.getElementById('groundingDetailsText'),
        theoryDetailsCollapse: document.getElementById('theoryDetailsCollapse'),

        // Modals
        helpModal: document.getElementById('helpModal'),
        btnCloseHelpModal: document.getElementById('btnCloseHelpModal'),
        btnConfirmHelpModal: document.getElementById('btnConfirmHelpModal'),
        distancePromptModal: document.getElementById('distancePromptModal'),
        distancePromptTitle: document.getElementById('distancePromptTitle'),
        distancePromptPrompt: document.getElementById('distancePromptPrompt'),
        distanceInput: document.getElementById('distanceInput'),
        distanceErrorText: document.getElementById('distanceErrorText'),
        btnCloseDistanceModal: document.getElementById('btnCloseDistanceModal'),
        btnCancelDistance: document.getElementById('btnCancelDistance'),
        btnSaveDistance: document.getElementById('btnSaveDistance')
      };
    }

    // 이벤트 바인딩
    bindEvents() {
      // 1. 헤더 및 지도 선택 탭 바
      this.dom.exampleSelect.addEventListener('change', (e) => {
        this.loadExample(e.target.value);
      });

      this.dom.mapTabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          const exId = btn.dataset.exampleId;
          this.loadExample(exId);
        });
      });

      this.dom.btnResetMap.addEventListener('click', () => {
        this.loadExample(this.currentExampleId);
      });
      this.dom.btnOpenHelp.addEventListener('click', () => {
        this.dom.helpModal.style.display = 'flex';
      });
      this.dom.btnCloseHelpModal.addEventListener('click', () => {
        this.dom.helpModal.style.display = 'none';
      });
      this.dom.btnConfirmHelpModal.addEventListener('click', () => {
        this.dom.helpModal.style.display = 'none';
      });

      // 2. 작업 설정 이벤트
      this.dom.modeBtnEuler.addEventListener('click', () => this.setMode('EULER'));
      this.dom.modeBtnHamilton.addEventListener('click', () => this.setMode('HAMILTON'));

      this.dom.startNodeSelect.addEventListener('change', (e) => {
        this.taskConfig.startNodeId = e.target.value;
        this.computeRoute();
      });

      this.dom.chkReturnToStart.addEventListener('change', (e) => {
        this.taskConfig.returnToStart = e.target.checked;
        this.updateReturnDesc();
        this.computeRoute();
      });

      this.dom.hamiltonGoalRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
          if (e.target.checked) {
            this.taskConfig.searchGoal = e.target.value;
            this.computeRoute();
          }
        });
      });

      this.dom.btnComputeRoute.addEventListener('click', () => {
        this.computeRoute();
      });

      // 3. 편집 모드 토글 및 툴 선택
      this.dom.btnToggleEditMode.addEventListener('click', () => {
        this.toggleEditMode();
      });

      this.dom.editToolPills.forEach(pill => {
        pill.addEventListener('click', () => {
          const tool = pill.dataset.tool;
          this.setEditTool(tool);
        });
      });

      // 4. 지도 Zoom & Pan 이벤트
      this.dom.btnZoomIn.addEventListener('click', () => this.zoom(0.8));
      this.dom.btnZoomOut.addEventListener('click', () => this.zoom(1.25));
      this.dom.btnZoomFit.addEventListener('click', () => this.fitView());

      this.dom.svgContainer.addEventListener('wheel', (e) => {
        e.preventDefault();
        const zoomFactor = e.deltaY < 0 ? 0.9 : 1.1;
        this.zoomAtPoint(zoomFactor, e.clientX, e.clientY);
      }, { passive: false });

      this.dom.svg.addEventListener('mousedown', (e) => this.handleSvgMouseDown(e));
      window.addEventListener('mousemove', (e) => this.handleSvgMouseMove(e));
      window.addEventListener('mouseup', (e) => this.handleSvgMouseUp(e));

      // 5. 애니메이션 제어 이벤트
      this.dom.btnPlayPause.addEventListener('click', () => this.togglePlayPause());
      this.dom.btnStepForward.addEventListener('click', () => this.stepForward());
      this.dom.btnResetAnimation.addEventListener('click', () => this.resetAnimation());

      this.dom.speedPills.forEach(pill => {
        pill.addEventListener('click', () => {
          this.dom.speedPills.forEach(p => p.classList.remove('active'));
          pill.classList.add('active');
          this.animation.speedMultiplier = parseFloat(pill.dataset.speed);
        });
      });

      // 6. 하단 이론 아코디언 토글
      this.dom.btnToggleTheoryDetails.addEventListener('click', () => {
        const isHidden = this.dom.theoryDetailsCollapse.style.display === 'none';
        this.dom.theoryDetailsCollapse.style.display = isHidden ? 'block' : 'none';
        this.dom.theoryToggleText.textContent = isHidden ? '이론 상세 설명 접기' : '이론 상세 설명 열기';
        this.dom.theoryArrowIcon.style.transform = isHidden ? 'rotate(180deg)' : 'none';
      });

      // 7. 거리 수정 모달 이벤트
      this.dom.btnCloseDistanceModal.addEventListener('click', () => this.closeDistanceModal());
      this.dom.btnCancelDistance.addEventListener('click', () => this.closeDistanceModal());
      this.dom.btnSaveDistance.addEventListener('click', () => this.saveDistance());
      this.dom.distanceInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') this.saveDistance();
        if (e.key === 'Escape') this.closeDistanceModal();
      });
    }

    // ==========================================
    // 예제 로드 및 초기화
    // ==========================================
    loadExample(exampleId) {
      const ex = EXAMPLES.find(e => e.id === exampleId) || EXAMPLES[0];
      this.currentExampleId = ex.id;
      this.dom.exampleSelect.value = ex.id;

      // 탭 바 활성 버튼 동기화
      this.dom.mapTabBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.exampleId === ex.id);
      });

      // 깊은 복사
      this.nodes = JSON.parse(JSON.stringify(ex.nodes));
      this.edges = JSON.parse(JSON.stringify(ex.edges));
      this.shelves = JSON.parse(JSON.stringify(ex.shelves || []));

      // 설정 적용
      this.taskConfig.mode = ex.config.mode;
      this.taskConfig.startNodeId = ex.config.startNodeId;
      this.taskConfig.returnToStart = ex.config.returnToStart;
      this.taskConfig.searchGoal = ex.config.searchGoal || 'any';

      this.updateControlsFromConfig();
      this.fitView();
      this.renderGraph();

      // 지도 로드 후 바로 경로 계산 실행 (즉각적인 시각 피드백)
      this.computeRoute();
    }

    updateControlsFromConfig() {
      this.setMode(this.taskConfig.mode, false);
      this.dom.chkReturnToStart.checked = this.taskConfig.returnToStart;
      this.updateReturnDesc();

      this.dom.hamiltonGoalRadios.forEach(radio => {
        radio.checked = (radio.value === this.taskConfig.searchGoal);
      });

      this.refreshStartNodeDropdown();
    }

    setMode(mode, doCompute = true) {
      this.taskConfig.mode = mode;
      if (mode === 'EULER') {
        this.dom.modeBtnEuler.classList.add('active');
        this.dom.modeBtnHamilton.classList.remove('active');
        this.dom.hamiltonGoalGroup.style.display = 'none';
        this.dom.eulerFixedDistanceNotice.style.display = 'flex';
      } else {
        this.dom.modeBtnEuler.classList.remove('active');
        this.dom.modeBtnHamilton.classList.add('active');
        this.dom.hamiltonGoalGroup.style.display = 'flex';
        this.dom.eulerFixedDistanceNotice.style.display = 'none';
      }
      this.updateReturnDesc();
      if (doCompute) {
        this.computeRoute();
      }
    }

    updateReturnDesc() {
      if (this.taskConfig.mode === 'EULER') {
        this.dom.returnDesc.textContent = this.taskConfig.returnToStart
          ? '오일러 회로(모든 통로 순환 후 복귀) 탐색'
          : '오일러 경로(끝점 제한 없음, 모든 통로 1회) 탐색';
      } else {
        this.dom.returnDesc.textContent = this.taskConfig.returnToStart
          ? '해밀턴 회로(모든 지점 1회 순환 후 복귀) 탐색'
          : '해밀턴 경로(모든 지점 1회 방문, 끝점 제한 없음) 탐색';
      }
    }

    refreshStartNodeDropdown() {
      const degrees = calculateDegrees(this.nodes, this.edges);
      this.dom.startNodeSelect.innerHTML = '';

      this.nodes.forEach(node => {
        const opt = document.createElement('option');
        opt.value = node.id;
        const deg = degrees.get(node.id) || 0;
        const oddTag = (deg % 2 !== 0) ? ' [홀수 차수]' : '';
        opt.textContent = `지점 ${node.id} (${deg}개 통로 연결)${oddTag}`;
        if (node.id === this.taskConfig.startNodeId) {
          opt.selected = true;
        }
        this.dom.startNodeSelect.appendChild(opt);
      });

      if (this.nodes.length > 0 && !this.nodes.some(n => n.id === this.taskConfig.startNodeId)) {
        this.taskConfig.startNodeId = this.nodes[0].id;
        this.dom.startNodeSelect.value = this.nodes[0].id;
      }
    }

    // ==========================================
    // 계산 실행 및 결과 반영
    // ==========================================
    computeRoute() {
      if (this.editMode.isActive) {
        this.toggleEditMode();
      }

      this.resetAnimation();

      const conn = checkConnectedness(this.nodes, this.edges);
      if (conn.isolatedNodes.length > 0) {
        this.showErrorResult({
          message: '고립된 작업 지점이 존재합니다.',
          details: `지점 ${conn.isolatedNodes.join(', ')}에 연결된 통로가 없어 작업 수행이 불가능합니다. 통로를 연결하거나 지점을 삭제하세요.`
        });
        return;
      }
      if (conn.components.length > 1) {
        this.showErrorResult({
          message: '창고 그래프가 서로 분리되어 있습니다.',
          details: `모든 작업 지점이 통로로 연결되어 있어야 합니다. (현재 분리 구역: ${conn.components.map(c => `[${c.join(', ')}]`).join(', ')})`
        });
        return;
      }

      const graphPayload = {
        nodes: this.nodes,
        edges: this.edges
      };

      if (this.taskConfig.mode === 'EULER') {
        const result = findEulerianPath(graphPayload, this.taskConfig.startNodeId, this.taskConfig.returnToStart);
        this.applyCalculationResult(result);
      } else {
        const result = findHamiltonianPath(
          graphPayload,
          this.taskConfig.startNodeId,
          this.taskConfig.returnToStart,
          this.taskConfig.searchGoal,
          { maxSteps: 300000, timeoutMs: 2500 }
        );
        this.applyCalculationResult(result);
      }
    }

    applyCalculationResult(result) {
      this.calculationResult = result;

      if (!result.success) {
        this.showErrorResult(result);
        return;
      }

      this.dom.resultStatusBanner.className = 'status-banner success';
      this.dom.statusIconReady.style.display = 'none';
      this.dom.statusIconSuccess.style.display = 'block';
      this.dom.statusIconFail.style.display = 'none';
      this.dom.statusIconLimit.style.display = 'none';

      this.dom.resultStatusTitle.textContent = result.isCircuit ? '회로 탐색 성공 (복귀 완료)' : '경로 탐색 성공 (도착 완료)';
      this.dom.resultStatusSub.textContent = `${result.path.length}개 지점 경유, 총 ${result.totalDistance}m 이동`;

      this.dom.mTotalDistance.textContent = `${result.totalDistance} m`;
      this.dom.mStartEnd.textContent = `${result.startNode} → ${result.endNode}`;
      this.dom.mUniqueNodes.textContent = `${result.uniqueNodesVisited} / ${this.nodes.length} 개`;
      this.dom.mUniqueEdges.textContent = `${result.uniqueEdgesTraversed} / ${this.edges.length} 개`;

      if (result.mode === 'HAMILTON' && result.searchGoal === 'shortest') {
        this.dom.optimalityBox.style.display = 'flex';
        this.dom.optimalityStatusText.textContent = result.optimalityConfirmed
          ? '전체 후보 탐색 완료 (최단거리 글로벌 최적 확정)'
          : '탐색 제한 도달로 최적성 미확정';
      } else {
        this.dom.optimalityBox.style.display = 'none';
      }

      this.renderItineraryList(result);

      this.dom.groundingSummaryBox.className = 'grounding-summary-box';
      this.dom.groundingLeadText.textContent = result.explanation;
      this.dom.groundingDetailsText.textContent = this.generateMathematicalDetails(result);

      this.renderGraph();
      this.resetAnimation();
    }

    showErrorResult(result) {
      this.calculationResult = null;

      const isLimit = result.hitLimit || result.reason === 'SEARCH_LIMIT_REACHED';
      this.dom.resultStatusBanner.className = isLimit ? 'status-banner limit' : 'status-banner error';
      this.dom.statusIconReady.style.display = 'none';
      this.dom.statusIconSuccess.style.display = 'none';
      this.dom.statusIconFail.style.display = isLimit ? 'none' : 'block';
      this.dom.statusIconLimit.style.display = isLimit ? 'block' : 'none';

      this.dom.resultStatusTitle.textContent = result.message || '조건을 만족하는 경로가 없습니다.';
      this.dom.resultStatusSub.textContent = result.details || '그래프 조건이나 작업 설정을 변경해 보세요.';

      this.dom.mTotalDistance.textContent = '-';
      this.dom.mStartEnd.textContent = '-';
      this.dom.mUniqueNodes.textContent = '-';
      this.dom.mUniqueEdges.textContent = '-';
      this.dom.optimalityBox.style.display = 'none';

      this.dom.itineraryList.innerHTML = `<div class="empty-list-placeholder">${result.message || '경로가 존재하지 않습니다.'}</div>`;
      this.dom.stepCountBadge.textContent = '0 단계';

      this.dom.groundingSummaryBox.className = 'grounding-summary-box error';
      this.dom.groundingLeadText.textContent = result.message || '경로 탐색 불가 판정';
      this.dom.groundingDetailsText.textContent = result.details || '';

      this.renderGraph();
      this.resetAnimation();
    }

    renderItineraryList(result) {
      this.dom.itineraryList.innerHTML = '';
      const path = result.path;
      const pathEdges = result.pathEdges;

      this.dom.stepCountBadge.textContent = `${pathEdges.length} 단계`;

      let cumulativeDist = 0;
      for (let i = 0; i < pathEdges.length; i++) {
        const u = path[i];
        const v = path[i + 1];
        const edge = pathEdges[i];
        const dist = Number(edge.distance);
        cumulativeDist += dist;

        const item = document.createElement('div');
        item.className = 'itinerary-item';
        item.dataset.stepIndex = i;
        item.innerHTML = `
          <div class="itinerary-left">
            <span class="itinerary-step-num">${i + 1}</span>
            <span class="itinerary-edge">${u} → ${v}</span>
          </div>
          <div class="itinerary-dist">${dist}m (누적 ${cumulativeDist}m)</div>
        `;

        item.addEventListener('click', () => {
          this.seekToStep(i);
        });

        this.dom.itineraryList.appendChild(item);
      }
    }

    generateMathematicalDetails(result) {
      if (result.mode === 'EULER') {
        const degrees = calculateDegrees(this.nodes, this.edges);
        const oddList = [];
        degrees.forEach((deg, id) => {
          if (deg % 2 !== 0) oddList.push(`${id}(${deg})`);
        });

        if (oddList.length === 0) {
          return `[오일러 회로 성립] 모든 작업 지점(${this.nodes.map(n => n.id).join(', ')})의 차수가 짝수이므로 출발점(${result.startNode})으로 완벽히 복귀하는 오일러 회로가 보장됩니다.`;
        } else {
          return `[열린 오일러 경로 성립] 홀수 차수인 지점이 정확히 2개[${oddList.join(', ')}] 존재하여, ${result.startNode}에서 출발하여 반대편 홀수 지점인 ${result.endNode}에 도달하는 오일러 경로가 형성되었습니다.`;
        }
      } else {
        let msg = `[해밀턴 경로 성립] 전체 ${this.nodes.length}개 작업 지점을 각각 단 1회씩만 경유하였습니다.`;
        if (result.isCircuit) {
          msg += ` 마지막으로 출발점(${result.startNode})으로 복귀하는 닫힌 사이클을 완성했습니다.`;
        }
        if (result.searchGoal === 'shortest') {
          msg += ` 탐색된 총 ${result.stepsExplored?.toLocaleString() || ''}개 후보 중 거리합이 최소(${result.totalDistance}m)인 조합입니다.`;
        }
        return msg;
      }
    }

    // ==========================================
    // 애니메이션 시스템
    // ==========================================
    togglePlayPause() {
      if (!this.calculationResult || !this.calculationResult.success) {
        this.computeRoute();
        if (!this.calculationResult || !this.calculationResult.success) return;
      }

      if (this.animation.status === 'PLAYING') {
        this.pauseAnimation();
      } else {
        if (this.animation.status === 'FINISHED') {
          this.resetAnimation();
        }
        this.playAnimation();
      }
    }

    playAnimation() {
      this.animation.status = 'PLAYING';
      this.animation.lastTimestamp = performance.now();
      this.dom.iconPlay.style.display = 'none';
      this.dom.iconPause.style.display = 'block';
      this.dom.playPauseText.textContent = '일시정지';

      this.tickAnimation(performance.now());
    }

    pauseAnimation() {
      this.animation.status = 'PAUSED';
      if (this.animation.rafId) {
        cancelAnimationFrame(this.animation.rafId);
        this.animation.rafId = null;
      }
      this.dom.iconPlay.style.display = 'block';
      this.dom.iconPause.style.display = 'none';
      this.dom.playPauseText.textContent = '재생';
    }

    resetAnimation() {
      this.pauseAnimation();
      this.animation.status = 'IDLE';
      this.animation.stepIndex = 0;
      this.animation.progressInStep = 0;
      this.animation.traversedDistance = 0;
      this.animation.visitedNodes = new Set();
      this.animation.traversedEdges = new Set();

      if (this.calculationResult && this.calculationResult.path.length > 0) {
        this.animation.visitedNodes.add(this.calculationResult.path[0]);
      }

      this.updateTelemetry();
      this.updateItineraryActiveItem();
      this.renderAgvVehicle();
      this.renderGraphPathOverlay();
    }

    stepForward() {
      if (!this.calculationResult || !this.calculationResult.success) return;
      this.pauseAnimation();

      const maxSteps = this.calculationResult.path.length - 1;
      if (this.animation.stepIndex < maxSteps) {
        this.seekToStep(this.animation.stepIndex + 1);
      }
    }

    seekToStep(stepIdx) {
      if (!this.calculationResult || !this.calculationResult.success) return;
      const maxSteps = this.calculationResult.path.length - 1;
      const target = Math.max(0, Math.min(stepIdx, maxSteps));

      this.animation.stepIndex = target;
      this.animation.progressInStep = 0;

      let dist = 0;
      this.animation.visitedNodes = new Set([this.calculationResult.path[0]]);
      this.animation.traversedEdges = new Set();

      for (let i = 0; i < target; i++) {
        dist += Number(this.calculationResult.pathEdges[i].distance);
        this.animation.visitedNodes.add(this.calculationResult.path[i + 1]);
        this.animation.traversedEdges.add(this.calculationResult.pathEdges[i].id);
      }
      this.animation.traversedDistance = dist;

      if (target === maxSteps) {
        this.animation.status = 'FINISHED';
        this.dom.iconPlay.style.display = 'block';
        this.dom.iconPause.style.display = 'none';
        this.dom.playPauseText.textContent = '다시 재생';
      }

      this.updateTelemetry();
      this.updateItineraryActiveItem();
      this.renderAgvVehicle();
      this.renderGraphPathOverlay();
    }

    tickAnimation(timestamp) {
      if (this.animation.status !== 'PLAYING') return;

      const deltaMs = timestamp - (this.animation.lastTimestamp || timestamp);
      this.animation.lastTimestamp = timestamp;

      const path = this.calculationResult.path;
      const pathEdges = this.calculationResult.pathEdges;
      const currentStep = this.animation.stepIndex;

      if (currentStep >= pathEdges.length) {
        this.animation.status = 'FINISHED';
        this.dom.iconPlay.style.display = 'block';
        this.dom.iconPause.style.display = 'none';
        this.dom.playPauseText.textContent = '다시 재생';
        this.updateTelemetry();
        return;
      }

      const currentEdge = pathEdges[currentStep];
      const edgeDist = Number(currentEdge.distance);

      const metersPerMs = (this.animation.baseSpeedMeterPerSec * this.animation.speedMultiplier) / 1000;
      const deltaDistance = metersPerMs * deltaMs;

      this.animation.progressInStep += deltaDistance / edgeDist;
      this.animation.traversedDistance += deltaDistance;

      if (this.animation.progressInStep >= 1.0) {
        this.animation.traversedEdges.add(currentEdge.id);
        this.animation.visitedNodes.add(path[currentStep + 1]);
        this.animation.stepIndex++;
        this.animation.progressInStep = 0;

        let exactDist = 0;
        for (let i = 0; i < this.animation.stepIndex; i++) {
          exactDist += Number(pathEdges[i].distance);
        }
        this.animation.traversedDistance = exactDist;

        this.updateItineraryActiveItem();
      }

      this.updateTelemetry();
      this.renderAgvVehicle();
      this.renderGraphPathOverlay();

      this.animation.rafId = requestAnimationFrame((ts) => this.tickAnimation(ts));
    }

    updateTelemetry() {
      if (!this.calculationResult || !this.calculationResult.success) {
        this.dom.telemetryCurrentPos.textContent = `지점 ${this.taskConfig.startNodeId}`;
        this.dom.telemetryNextPos.textContent = '-';
        this.dom.telemetryDist.textContent = '0.0m / 0.0m';
        this.dom.telemetryProgress.textContent = '대기 중';
        return;
      }

      const path = this.calculationResult.path;
      const totalDist = this.calculationResult.totalDistance;
      const step = this.animation.stepIndex;
      const maxSteps = path.length - 1;

      if (step >= maxSteps) {
        this.dom.telemetryCurrentPos.textContent = `지점 ${path[maxSteps]} (도착)`;
        this.dom.telemetryNextPos.textContent = '목적지 도착 완료';
        this.dom.telemetryDist.textContent = `${totalDist.toFixed(1)}m / ${totalDist.toFixed(1)}m`;
        this.dom.telemetryProgress.textContent = '운행 완료 (100%)';
      } else {
        const u = path[step];
        const v = path[step + 1];
        const percent = Math.min(100, Math.round((this.animation.traversedDistance / totalDist) * 100));
        this.dom.telemetryCurrentPos.textContent = `지점 ${u} → ${v}`;
        this.dom.telemetryNextPos.textContent = `지점 ${v}`;
        this.dom.telemetryDist.textContent = `${Math.min(totalDist, this.animation.traversedDistance).toFixed(1)}m / ${totalDist.toFixed(1)}m`;
        this.dom.telemetryProgress.textContent = `주행 중 (${percent}%)`;
      }
    }

    updateItineraryActiveItem() {
      const items = this.dom.itineraryList.querySelectorAll('.itinerary-item');
      items.forEach((item, idx) => {
        item.classList.remove('active', 'traversed');
        if (idx === this.animation.stepIndex) {
          item.classList.add('active');
          item.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        } else if (idx < this.animation.stepIndex) {
          item.classList.add('traversed');
        }
      });
    }

    // ==========================================
    // SVG 지도 렌더링
    // ==========================================
    renderGraph() {
      this.refreshStartNodeDropdown();
      this.renderShelves();
      this.renderCorridors();
      this.renderGraphPathOverlay();
      this.renderWeights();
      this.renderNodes();
      this.renderAgvVehicle();
    }

    renderShelves() {
      this.dom.layerShelves.innerHTML = '';
      this.shelves.forEach(shelf => {
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');

        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', shelf.x);
        rect.setAttribute('y', shelf.y);
        rect.setAttribute('width', shelf.width);
        rect.setAttribute('height', shelf.height);
        rect.setAttribute('class', 'shelf-rect');

        const stripes = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        stripes.setAttribute('x1', shelf.x);
        stripes.setAttribute('y1', shelf.y + shelf.height / 2);
        stripes.setAttribute('x2', shelf.x + shelf.width);
        stripes.setAttribute('y2', shelf.y + shelf.height / 2);
        stripes.setAttribute('class', 'shelf-stripes');

        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', shelf.x + shelf.width / 2);
        text.setAttribute('y', shelf.y + shelf.height / 2);
        text.setAttribute('class', 'shelf-text');
        text.textContent = shelf.label || '보관 랙';

        g.appendChild(rect);
        g.appendChild(stripes);
        g.appendChild(text);
        this.dom.layerShelves.appendChild(g);
      });
    }

    renderCorridors() {
      this.dom.layerCorridors.innerHTML = '';
      const nodeMap = new Map(this.nodes.map(n => [n.id, n]));

      this.edges.forEach(e => {
        const u = nodeMap.get(e.u);
        const v = nodeMap.get(e.v);
        if (!u || !v) return;

        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.dataset.edgeId = e.id;

        const road = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        road.setAttribute('x1', u.x);
        road.setAttribute('y1', u.y);
        road.setAttribute('x2', v.x);
        road.setAttribute('y2', v.y);
        road.setAttribute('class', 'corridor-road');

        const center = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        center.setAttribute('x1', u.x);
        center.setAttribute('y1', u.y);
        center.setAttribute('x2', v.x);
        center.setAttribute('y2', v.y);
        center.setAttribute('class', 'corridor-centerline');

        center.addEventListener('click', (ev) => {
          ev.stopPropagation();
          this.handleEdgeClick(e);
        });

        g.appendChild(road);
        g.appendChild(center);
        this.dom.layerCorridors.appendChild(g);
      });
    }

    renderGraphPathOverlay() {
      this.dom.layerCalculatedPath.innerHTML = '';
      if (!this.calculationResult || !this.calculationResult.success) return;

      const path = this.calculationResult.path;
      const nodeMap = new Map(this.nodes.map(n => [n.id, n]));

      for (let i = 0; i < path.length - 1; i++) {
        const u = nodeMap.get(path[i]);
        const v = nodeMap.get(path[i + 1]);
        if (!u || !v) continue;

        const edge = this.calculationResult.pathEdges[i];
        const isTraversed = this.animation.traversedEdges.has(edge?.id);
        const isCurrentlyActive = (i === this.animation.stepIndex);

        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', u.x);
        line.setAttribute('y1', u.y);
        line.setAttribute('x2', v.x);
        line.setAttribute('y2', v.y);

        line.setAttribute('class', isTraversed ? 'corridor-traversed-highlight' : 'corridor-active-highlight');
        line.setAttribute('marker-end', isCurrentlyActive ? 'url(#arrowMarkerActive)' : 'url(#arrowMarker)');

        this.dom.layerCalculatedPath.appendChild(line);

        const midX = (u.x + v.x) / 2;
        const midY = (u.y + v.y) / 2;
        const dx = v.x - u.x;
        const dy = v.y - u.y;
        const len = Math.hypot(dx, dy) || 1;
        const offsetX = (-dy / len) * 14;
        const offsetY = (dx / len) * 14;

        const orderG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        const orderCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        orderCircle.setAttribute('cx', midX + offsetX);
        orderCircle.setAttribute('cy', midY + offsetY);
        orderCircle.setAttribute('r', 9);
        orderCircle.setAttribute('class', 'path-order-badge-bg');
        if (isCurrentlyActive) {
          orderCircle.setAttribute('fill', '#ea580c');
        }

        const orderText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        orderText.setAttribute('x', midX + offsetX);
        orderText.setAttribute('y', midY + offsetY);
        orderText.setAttribute('class', 'path-order-badge-text');
        orderText.textContent = `${i + 1}`;

        orderG.appendChild(orderCircle);
        orderG.appendChild(orderText);
        this.dom.layerCalculatedPath.appendChild(orderG);
      }
    }

    renderWeights() {
      this.dom.layerWeights.innerHTML = '';
      const nodeMap = new Map(this.nodes.map(n => [n.id, n]));

      this.edges.forEach(e => {
        const u = nodeMap.get(e.u);
        const v = nodeMap.get(e.v);
        if (!u || !v) return;

        const midX = (u.x + v.x) / 2;
        const midY = (u.y + v.y) / 2;

        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.setAttribute('class', 'weight-badge-group');
        g.dataset.edgeId = e.id;

        const badgeWidth = 38;
        const badgeHeight = 20;

        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', midX - badgeWidth / 2);
        rect.setAttribute('y', midY - badgeHeight / 2);
        rect.setAttribute('width', badgeWidth);
        rect.setAttribute('height', badgeHeight);
        rect.setAttribute('class', 'weight-badge-bg');

        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', midX);
        text.setAttribute('y', midY);
        text.setAttribute('class', 'weight-badge-text');
        text.textContent = `${e.distance}m`;

        g.appendChild(rect);
        g.appendChild(text);

        g.addEventListener('click', (ev) => {
          ev.stopPropagation();
          this.openDistanceModal(e);
        });

        this.dom.layerWeights.appendChild(g);
      });
    }

    renderNodes() {
      this.dom.layerNodes.innerHTML = '';
      const degrees = calculateDegrees(this.nodes, this.edges);

      this.nodes.forEach(node => {
        const deg = degrees.get(node.id) || 0;
        const isOdd = (deg % 2 !== 0);
        const isStart = (node.id === this.taskConfig.startNodeId);
        const isEnd = (this.calculationResult && this.calculationResult.success && node.id === this.calculationResult.endNode);
        const isVisited = this.animation.visitedNodes.has(node.id);

        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        let classList = ['node-group'];
        if (isOdd) classList.push('odd-degree');
        if (isStart) classList.push('start-node');
        if (isEnd && !isStart) classList.push('end-node');
        if (isVisited) classList.push('visited');
        if (this.editMode.edgeStartNodeId === node.id) classList.push('selected');
        g.setAttribute('class', classList.join(' '));
        g.dataset.nodeId = node.id;
        g.style.cursor = 'pointer';

        // 툴팁 타이틀
        const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
        title.textContent = `지점 ${node.id} (클릭하여 출발 지점으로 선택)`;
        g.appendChild(title);

        const halo = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        halo.setAttribute('cx', node.x);
        halo.setAttribute('cy', node.y);
        halo.setAttribute('r', 24);
        halo.setAttribute('class', 'node-halo');

        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', node.x);
        circle.setAttribute('cy', node.y);
        circle.setAttribute('r', 18);
        circle.setAttribute('class', 'node-circle');

        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', node.x);
        text.setAttribute('y', node.y);
        text.setAttribute('class', 'node-text');
        text.textContent = node.id;

        const badgeG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        const badgeBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        badgeBg.setAttribute('x', node.x + 8);
        badgeBg.setAttribute('y', node.y - 20);
        badgeBg.setAttribute('width', 16);
        badgeBg.setAttribute('height', 14);
        badgeBg.setAttribute('class', 'node-degree-badge-bg');

        const badgeText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        badgeText.setAttribute('x', node.x + 16);
        badgeText.setAttribute('y', node.y - 13);
        badgeText.setAttribute('class', 'node-degree-badge-text');
        badgeText.textContent = deg;

        badgeG.appendChild(badgeBg);
        badgeG.appendChild(badgeText);

        const descText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        descText.setAttribute('x', node.x);
        descText.setAttribute('y', node.y + 32);
        descText.setAttribute('class', 'node-desc-text');
        descText.textContent = node.label || node.id;

        g.appendChild(halo);
        g.appendChild(circle);
        g.appendChild(text);
        g.appendChild(badgeG);
        g.appendChild(descText);

        g.addEventListener('mousedown', (ev) => {
          if (ev.button === 0) {
            this.handleNodeMouseDown(ev, node);
          }
        });

        this.dom.layerNodes.appendChild(g);
      });
    }

    renderAgvVehicle() {
      this.dom.layerAgv.innerHTML = '';

      let posX, posY, angleDeg = 0;
      const nodeMap = new Map(this.nodes.map(n => [n.id, n]));

      if (this.calculationResult && this.calculationResult.success) {
        const path = this.calculationResult.path;
        const step = this.animation.stepIndex;

        if (step >= path.length - 1) {
          const lastNode = nodeMap.get(path[path.length - 1]);
          if (lastNode) {
            posX = lastNode.x;
            posY = lastNode.y;
          }
        } else {
          const u = nodeMap.get(path[step]);
          const v = nodeMap.get(path[step + 1]);
          if (u && v) {
            const t = this.animation.progressInStep;
            posX = u.x + (v.x - u.x) * t;
            posY = u.y + (v.y - u.y) * t;
            angleDeg = (Math.atan2(v.y - u.y, v.x - u.x) * 180) / Math.PI;
          }
        }
      } else {
        const startNode = nodeMap.get(this.taskConfig.startNodeId);
        if (startNode) {
          posX = startNode.x;
          posY = startNode.y;
        }
      }

      if (posX === undefined || posY === undefined) return;

      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('class', 'agv-vehicle');
      g.setAttribute('transform', `translate(${posX}, ${posY}) rotate(${angleDeg})`);

      g.innerHTML = `
        <rect x="-18" y="-14" width="36" height="28" rx="6" fill="#1e293b" stroke="#0f172a" stroke-width="2"/>
        <rect x="-16" y="-12" width="6" height="24" rx="2" fill="#f59e0b"/>
        <rect x="10" y="-12" width="6" height="24" rx="2" fill="#f59e0b"/>
        <rect x="-8" y="-16" width="16" height="4" rx="2" fill="#475569"/>
        <rect x="-8" y="12" width="16" height="4" rx="2" fill="#475569"/>
        <circle cx="12" cy="0" r="5" fill="#38bdf8"/>
        <polygon points="17,-6 24,0 17,6" fill="#10b981"/>
        <circle cx="-4" cy="0" r="4" fill="#ea580c"/>
      `;

      this.dom.layerAgv.appendChild(g);
    }

    // ==========================================
    // 인터랙션 (Pan, Zoom, Drag, Tools)
    // ==========================================
    zoom(factor) {
      const cx = this.viewBox.x + this.viewBox.w / 2;
      const cy = this.viewBox.y + this.viewBox.h / 2;
      const newW = this.viewBox.w * factor;
      const newH = this.viewBox.h * factor;

      if (newW < 250 || newW > 2500) return;

      this.viewBox.w = newW;
      this.viewBox.h = newH;
      this.viewBox.x = cx - newW / 2;
      this.viewBox.y = cy - newH / 2;
      this.updateSvgViewBox();
    }

    zoomAtPoint(factor, clientX, clientY) {
      const pt = this.clientToSvgCoords(clientX, clientY);
      const newW = this.viewBox.w * factor;
      const newH = this.viewBox.h * factor;

      if (newW < 250 || newW > 2500) return;

      this.viewBox.x = pt.x - (pt.x - this.viewBox.x) * factor;
      this.viewBox.y = pt.y - (pt.y - this.viewBox.y) * factor;
      this.viewBox.w = newW;
      this.viewBox.h = newH;
      this.updateSvgViewBox();
    }

    fitView() {
      if (this.nodes.length === 0) {
        this.viewBox = { ...this.defaultViewBox };
        this.updateSvgViewBox();
        return;
      }

      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      this.nodes.forEach(n => {
        minX = Math.min(minX, n.x);
        maxX = Math.max(maxX, n.x);
        minY = Math.min(minY, n.y);
        maxY = Math.max(maxY, n.y);
      });

      const padding = 120;
      const w = Math.max(500, (maxX - minX) + padding * 2);
      const h = Math.max(400, (maxY - minY) + padding * 2);

      this.viewBox = {
        x: (minX + maxX) / 2 - w / 2,
        y: (minY + maxY) / 2 - h / 2,
        w,
        h
      };
      this.updateSvgViewBox();
    }

    updateSvgViewBox() {
      this.dom.svg.setAttribute('viewBox', `${this.viewBox.x} ${this.viewBox.y} ${this.viewBox.w} ${this.viewBox.h}`);
      const zoomPercent = Math.round((this.defaultViewBox.w / this.viewBox.w) * 100);
      this.dom.zoomLevelText.textContent = `${zoomPercent}%`;
    }

    clientToSvgCoords(clientX, clientY) {
      const pt = this.dom.svg.createSVGPoint();
      pt.x = clientX;
      pt.y = clientY;
      return pt.matrixTransform(this.dom.svg.getScreenCTM().inverse());
    }

    handleSvgMouseDown(e) {
      if (e.button !== 0) return;

      if (this.editMode.isActive) {
        if (this.editMode.tool === 'add-node') {
          const coords = this.clientToSvgCoords(e.clientX, e.clientY);
          this.addNewNode(coords.x, coords.y);
          return;
        }
      }

      this.isPanning = true;
      this.panStart = { x: e.clientX, y: e.clientY };
      this.dom.svg.classList.add('panning');
    }

    handleSvgMouseMove(e) {
      if (this.isPanning) {
        const dx = (e.clientX - this.panStart.x) * (this.viewBox.w / this.dom.svg.clientWidth);
        const dy = (e.clientY - this.panStart.y) * (this.viewBox.h / this.dom.svg.clientHeight);
        this.viewBox.x -= dx;
        this.viewBox.y -= dy;
        this.panStart = { x: e.clientX, y: e.clientY };
        this.updateSvgViewBox();
        return;
      }

      if (this.editMode.isActive && this.editMode.draggingNodeId) {
        const node = this.nodes.find(n => n.id === this.editMode.draggingNodeId);
        if (node) {
          const coords = this.clientToSvgCoords(e.clientX, e.clientY);
          node.x = Math.round(coords.x - this.editMode.dragOffset.x);
          node.y = Math.round(coords.y - this.editMode.dragOffset.y);
          this.renderGraph();
        }
      }
    }

    handleSvgMouseUp() {
      if (this.isPanning) {
        this.isPanning = false;
        this.dom.svg.classList.remove('panning');
      }

      if (this.editMode.draggingNodeId) {
        this.editMode.draggingNodeId = null;
      }
    }

    handleNodeMouseDown(e, node) {
      e.stopPropagation();

      // 일반 상태: 지도 노드 클릭 시 즉시 출발점으로 선택 및 재계산
      if (!this.editMode.isActive) {
        this.taskConfig.startNodeId = node.id;
        this.dom.startNodeSelect.value = node.id;
        this.computeRoute();
        return;
      }

      switch (this.editMode.tool) {
        case 'select': {
          this.editMode.draggingNodeId = node.id;
          const coords = this.clientToSvgCoords(e.clientX, e.clientY);
          this.editMode.dragOffset = {
            x: coords.x - node.x,
            y: coords.y - node.y
          };
          break;
        }

        case 'add-edge': {
          if (!this.editMode.edgeStartNodeId) {
            this.editMode.edgeStartNodeId = node.id;
            this.dom.editModePromptText.textContent = `지점 ${node.id} 선택됨. 연결할 두 번째 지점을 클릭하세요.`;
            this.renderGraph();
          } else if (this.editMode.edgeStartNodeId === node.id) {
            this.editMode.edgeStartNodeId = null;
            this.dom.editModePromptText.textContent = '통로 추가 모드: 연결할 첫 번째 지점을 클릭하세요.';
            this.renderGraph();
          } else {
            this.addNewEdge(this.editMode.edgeStartNodeId, node.id);
            this.editMode.edgeStartNodeId = null;
            this.dom.editModePromptText.textContent = '통로 추가 모드: 연결할 첫 번째 지점을 클릭하세요.';
          }
          break;
        }

        case 'delete': {
          this.deleteNode(node.id);
          break;
        }

        default:
          break;
      }
    }

    handleEdgeClick(edge) {
      if (!this.editMode.isActive) return;

      if (this.editMode.tool === 'delete') {
        this.deleteEdge(edge.id);
      } else if (this.editMode.tool === 'edit-weight') {
        this.openDistanceModal(edge);
      }
    }

    // ==========================================
    // 지도 편집 도구 구현
    // ==========================================
    toggleEditMode() {
      this.editMode.isActive = !this.editMode.isActive;
      this.editMode.edgeStartNodeId = null;
      this.editMode.draggingNodeId = null;

      if (this.editMode.isActive) {
        this.dom.editBtnText.textContent = '지도 편집 완료';
        this.dom.btnToggleEditMode.classList.remove('btn-secondary');
        this.dom.btnToggleEditMode.classList.add('btn-primary');
        this.dom.editToolsSubmenu.style.display = 'flex';
        this.dom.editModeNotice.style.display = 'block';
        this.setEditTool('select');
        this.pauseAnimation();
      } else {
        this.dom.editBtnText.textContent = '지도 편집 시작';
        this.dom.btnToggleEditMode.classList.add('btn-secondary');
        this.dom.btnToggleEditMode.classList.remove('btn-primary');
        this.dom.editToolsSubmenu.style.display = 'none';
        this.dom.editModeNotice.style.display = 'none';
        this.dom.svg.className.baseVal = '';
      }

      this.renderGraph();
    }

    setEditTool(tool) {
      this.editMode.tool = tool;
      this.editMode.edgeStartNodeId = null;

      this.dom.editToolPills.forEach(pill => {
        pill.classList.toggle('active', pill.dataset.tool === tool);
      });

      this.dom.svg.className.baseVal = '';

      switch (tool) {
        case 'select':
          this.dom.editModePromptText.textContent = '이동 도구: 지점을 드래그하여 원하는 위치로 배치하세요. (거리값은 유지됩니다)';
          break;
        case 'add-node':
          this.dom.svg.classList.add('tool-add-node');
          this.dom.editModePromptText.textContent = '지점 추가: 빈 바닥 공간을 클릭하면 새 작업 지점이 생성됩니다.';
          break;
        case 'add-edge':
          this.dom.editModePromptText.textContent = '통로 추가: 통로로 연결할 첫 번째 지점을 클릭하세요.';
          break;
        case 'delete':
          this.dom.svg.classList.add('tool-delete');
          this.dom.editModePromptText.textContent = '삭제 도구: 삭제하려는 지점이나 통로를 클릭하세요.';
          break;
        case 'edit-weight':
          this.dom.editModePromptText.textContent = '거리 변경: 이동거리를 수정할 통로 중앙의 거리 뱃지를 클릭하세요.';
          break;
        default:
          break;
      }

      this.renderGraph();
    }

    addNewNode(x, y) {
      const existingIds = new Set(this.nodes.map(n => n.id));
      let nextId = '';
      for (let c = 65; c <= 90; c++) {
        const char = String.fromCharCode(c);
        if (!existingIds.has(char)) {
          nextId = char;
          break;
        }
      }
      if (!nextId) nextId = `N${this.nodes.length + 1}`;

      const newNode = {
        id: nextId,
        x: Math.round(x),
        y: Math.round(y),
        label: `지점 ${nextId}`
      };

      this.nodes.push(newNode);
      this.renderGraph();
      this.computeRoute();
    }

    addNewEdge(u, v) {
      const exists = this.edges.some(e => (e.u === u && e.v === v) || (e.u === v && e.v === u));
      if (exists) {
        alert(`지점 ${u}와 ${v} 사이에는 이미 연결된 통로가 존재합니다.`);
        return;
      }

      const nodeU = this.nodes.find(n => n.id === u);
      const nodeV = this.nodes.find(n => n.id === v);
      const distPx = Math.hypot(nodeU.x - nodeV.x, nodeU.y - nodeV.y);
      const defaultMeters = Math.max(3, Math.round(distPx / 35));

      const newEdge = {
        id: `e_${u}${v}_${Date.now()}`,
        u,
        v,
        distance: defaultMeters
      };

      this.edges.push(newEdge);
      this.renderGraph();
      this.computeRoute();
    }

    deleteNode(nodeId) {
      if (this.nodes.length <= 2) {
        alert('최소 2개 이상의 작업 지점이 유지되어야 합니다.');
        return;
      }

      this.nodes = this.nodes.filter(n => n.id !== nodeId);
      this.edges = this.edges.filter(e => e.u !== nodeId && e.v !== nodeId);

      if (this.taskConfig.startNodeId === nodeId) {
        this.taskConfig.startNodeId = this.nodes[0].id;
      }

      this.renderGraph();
      this.computeRoute();
    }

    deleteEdge(edgeId) {
      this.edges = this.edges.filter(e => e.id !== edgeId);
      this.renderGraph();
      this.computeRoute();
    }

    // ==========================================
    // 거리 수정 모달
    // ==========================================
    openDistanceModal(edge) {
      this.targetEdgeForDistance = edge;
      this.dom.distancePromptTitle.textContent = `통로 ${edge.u} - ${edge.v} 거리 수정`;
      this.dom.distanceInput.value = edge.distance;
      this.dom.distanceErrorText.style.display = 'none';
      this.dom.distancePromptModal.style.display = 'flex';
      this.dom.distanceInput.focus();
      this.dom.distanceInput.select();
    }

    closeDistanceModal() {
      this.dom.distancePromptModal.style.display = 'none';
      this.targetEdgeForDistance = null;
    }

    saveDistance() {
      if (!this.targetEdgeForDistance) return;

      const val = parseFloat(this.dom.distanceInput.value);
      if (isNaN(val) || val <= 0) {
        this.dom.distanceErrorText.style.display = 'block';
        this.dom.distanceErrorText.textContent = '0보다 큰 양의 유한한 숫자를 입력하세요.';
        return;
      }

      this.targetEdgeForDistance.distance = Math.round(val * 10) / 10;
      this.closeDistanceModal();
      this.renderGraph();
      this.computeRoute();
    }
  }

  // 브라우저 DOM 로드 시 자동 초기화
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      window.app = new AGVRouteLabApp();
    });
  } else {
    window.app = new AGVRouteLabApp();
  }
})();
