/**
 * AGV Route Lab - Examples Dataset
 * 창고 시나리오별 그래프 및 기본 작업 설정
 * (브라우저 직접 실행 file:// 및 모듈 환경 모두 지원)
 */

(function (global) {
  'use strict';

  const EXAMPLES = [
    {
      id: 'example-1',
      title: '예제 1: 모든 통로를 점검하는 창고',
      shortTitle: '예제 1: 통로 점검 (40m)',
      subtitle: '오일러 회로 점검 시나리오',
      description: '모든 통로를 정확히 한 번씩 점검하고 출발 지점으로 안전하게 복귀하는 기본 순환 통로 모델입니다.',
      config: {
        mode: 'EULER',
        startNodeId: 'A',
        returnToStart: true,
        searchGoal: 'any'
      },
      warehouseInfo: {
        zone: '제1물류센터 외곽 순환 통로',
        inspectionTarget: '외곽 메인 통로 5개소 전체'
      },
      nodes: [
        { id: 'A', x: 250, y: 140, label: 'A (입고)' },
        { id: 'B', x: 650, y: 140, label: 'B (선반 A)' },
        { id: 'C', x: 720, y: 380, label: 'C (선반 B)' },
        { id: 'D', x: 450, y: 440, label: 'D (포장)' },
        { id: 'E', x: 180, y: 380, label: 'E (출고)' }
      ],
      edges: [
        { id: 'e_AB', u: 'A', v: 'B', distance: 8 },
        { id: 'e_BC', u: 'B', v: 'C', distance: 10 },
        { id: 'e_CD', u: 'C', v: 'D', distance: 7 },
        { id: 'e_DE', u: 'D', v: 'E', distance: 9 },
        { id: 'e_EA', u: 'E', v: 'A', distance: 6 }
      ],
      shelves: [
        { x: 340, y: 190, width: 220, height: 70, label: '보관 랙 R-01' },
        { x: 340, y: 300, width: 220, height: 70, label: '보관 랙 R-02' }
      ]
    },
    {
      id: 'example-2',
      title: '예제 2: 출발점으로 복귀할 수 없는 점검 경로',
      shortTitle: '예제 2: 복귀 불가 (63m)',
      subtitle: '홀수 차수가 존재하는 열린 오일러 경로 시나리오',
      description: '중앙 연결 통로(BD)로 인해 지점 B와 D의 차수가 홀수(3)가 되어, 복귀 회로는 불가능하고 두 지점 사이의 열린 경로만 가능한 창고입니다.',
      config: {
        mode: 'EULER',
        startNodeId: 'B',
        returnToStart: false,
        searchGoal: 'any'
      },
      warehouseInfo: {
        zone: '제2물류센터 크로스도킹 구역',
        inspectionTarget: '내부 우회로 포함 통로 7개소'
      },
      nodes: [
        { id: 'A', x: 450, y: 260, label: 'A (중앙 허브)' },
        { id: 'B', x: 680, y: 130, label: 'B (북동 선반)' },
        { id: 'C', x: 220, y: 130, label: 'C (북서 선반)' },
        { id: 'D', x: 680, y: 390, label: 'D (남동 작업대)' },
        { id: 'E', x: 220, y: 390, label: 'E (남서 작업대)' }
      ],
      edges: [
        { id: 'e_AB', u: 'A', v: 'B', distance: 8 },
        { id: 'e_BC', u: 'B', v: 'C', distance: 6 },
        { id: 'e_CA', u: 'C', v: 'A', distance: 10 },
        { id: 'e_AD', u: 'A', v: 'D', distance: 9 },
        { id: 'e_DE', u: 'D', v: 'E', distance: 7 },
        { id: 'e_EA', u: 'E', v: 'A', distance: 11 },
        { id: 'e_BD', u: 'B', v: 'D', distance: 12 }
      ],
      shelves: [
        { x: 300, y: 160, width: 100, height: 70, label: '선반 N-1' },
        { x: 300, y: 290, width: 100, height: 70, label: '선반 S-1' },
        { x: 500, y: 160, width: 100, height: 180, label: '자동화 랙' }
      ]
    },
    {
      id: 'example-3',
      title: '예제 3: 배송 순서에 따라 거리가 달라지는 창고',
      shortTitle: '예제 3: 배송 최적화 (39m)',
      subtitle: '해밀턴 최단거리 최적화 시나리오',
      description: '6개 작업 지점을 모두 1회씩 방문하여 복귀할 때, 이동 순서에 따라 총거리가 48m 또는 39m로 크게 달라지는 최단경로 최적화 모델입니다.',
      config: {
        mode: 'HAMILTON',
        startNodeId: 'A',
        returnToStart: true,
        searchGoal: 'shortest'
      },
      warehouseInfo: {
        zone: '제3물류센터 하이랙 피킹 구역',
        inspectionTarget: 'A~F 작업 셀 6개소 전수 피킹'
      },
      nodes: [
        { id: 'A', x: 220, y: 150, label: 'A (입고)' },
        { id: 'B', x: 450, y: 150, label: 'B (중앙북)' },
        { id: 'C', x: 680, y: 150, label: 'C (피킹C)' },
        { id: 'F', x: 220, y: 380, label: 'F (분류대)' },
        { id: 'E', x: 450, y: 380, label: 'E (중앙남)' },
        { id: 'D', x: 680, y: 380, label: 'D (피킹D)' }
      ],
      edges: [
        { id: 'e_AB', u: 'A', v: 'B', distance: 8 },
        { id: 'e_BC', u: 'B', v: 'C', distance: 9 },
        { id: 'e_CD', u: 'C', v: 'D', distance: 7 },
        { id: 'e_DE', u: 'D', v: 'E', distance: 6 },
        { id: 'e_EF', u: 'E', v: 'F', distance: 10 },
        { id: 'e_FA', u: 'F', v: 'A', distance: 8 },
        { id: 'e_BE', u: 'B', v: 'E', distance: 5 },
        { id: 'e_CF', u: 'C', v: 'F', distance: 5 },
        { id: 'e_CE', u: 'C', v: 'E', distance: 11 }
      ],
      shelves: [
        { x: 270, y: 200, width: 130, height: 130, label: '랙 블록 01' },
        { x: 500, y: 200, width: 130, height: 130, label: '랙 블록 02' }
      ]
    },
    {
      id: 'example-4',
      title: '예제 4: 두 임무의 가능 여부가 다른 창고',
      shortTitle: '예제 4: 임무 비교 (나비형)',
      subtitle: '오일러 회로 가능 / 해밀턴 회로 불가능 비교 시나리오',
      description: '중앙 지점 A를 통해서만 동쪽과 서쪽 구역이 연결되는 나비형(Bowtie) 구조로, 오일러 회로는 완벽히 가능하지만 해밀턴 회로는 불가능합니다.',
      config: {
        mode: 'EULER',
        startNodeId: 'A',
        returnToStart: true,
        searchGoal: 'any'
      },
      warehouseInfo: {
        zone: '제4물류센터 듀얼 윙 보관동',
        inspectionTarget: '서측 삼각동 + 동측 삼각동 연결부'
      },
      nodes: [
        { id: 'A', x: 450, y: 260, label: 'A (중앙 브릿지)' },
        { id: 'B', x: 190, y: 140, label: 'B (서측 원자재)' },
        { id: 'C', x: 190, y: 380, label: 'C (서측 부품)' },
        { id: 'D', x: 710, y: 140, label: 'D (동측 완제품)' },
        { id: 'E', x: 710, y: 380, label: 'E (동측 포장재)' }
      ],
      edges: [
        { id: 'e_AB', u: 'A', v: 'B', distance: 8 },
        { id: 'e_BC', u: 'B', v: 'C', distance: 6 },
        { id: 'e_CA', u: 'C', v: 'A', distance: 10 },
        { id: 'e_AD', u: 'A', v: 'D', distance: 9 },
        { id: 'e_DE', u: 'D', v: 'E', distance: 7 },
        { id: 'e_EA', u: 'E', v: 'A', distance: 11 }
      ],
      shelves: [
        { x: 260, y: 220, width: 120, height: 90, label: '서측 보관대' },
        { x: 520, y: 220, width: 120, height: 90, label: '동측 보관대' }
      ]
    }
  ];

  global.EXAMPLES = EXAMPLES;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { EXAMPLES };
  }
})(typeof window !== 'undefined' ? window : this);
