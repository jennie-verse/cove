# 테스트 보고서

작성일: 2026-09-05 · Cove v1 첫 릴리즈 (cove-v1-2026.09.05)

## 개요

이 문서는 Cove 첫 릴리즈 시점의 테스트 결과를 담습니다.

## 자동 테스트 — 통과

`npm test` (`node --test tests/*.test.js`) 실행 결과: **8개 파일, 24개 테스트 모두 통과**.

- 마크다운 프런트매터 · 주석 카운트 일치
- Export: 빈 export, 다건 export(주석 0건 포함) 항목·카운트 일치
- Backup 가져오기 검증: 다른 앱 백업 거부, 미지원 스키마 거부, 배열 누락(손상) 백업 거부,
  구버전(schema-1, schema-2) 백업 호환성 유지
- Reading 세션 기록: 30초 미만 폐기, 정상 범위 근사 기록, 60분 상한 초과 시 기간 없이 기록(클램프 안 함),
  최소 경계값(정확히/1ms 미만) 처리, pending 기록의 저장·복원·finalize, pending 없을 때 무동작,
  Cove Reader 인앱 세션의 historyAccuracy "exact" 유지
- Journal 연동: 공유 Journal에 Cove 기록 정상 반영
- 아이콘: 동적 SVG 아이콘 네임스페이스 정상 생성
- 자산·서비스워커: 엔트리 자산 빌드 스탬프와 서비스워커 캐시 버전 일치
- 레이아웃: 반응형에서 행 전체 폭·터치 타깃 크기 유지
- URL 정규화: 추적 파라미터·www·프래그먼트·trailing slash 정리, 경로 대소문자 보존과 쿼리 정렬,
  안전하지 않은 프로토콜 거부
- 태그: 정규화 및 최대 8개 제한

문법 검사(`node --check`)도 `src/*.js`, `sw.js` 모두 통과.

## Fresh-start 데이터 초기화 동작

첫 릴리즈 배포에 맞춰 앱 최초 로드 시 이전 사용 흔적을 지우는 초기화 로직을 추가했습니다.

- `cove.*`로 시작하는 모든 localStorage 키를 삭제
- `cove` IndexedDB 데이터베이스를 삭제(재생성은 앱이 다시 열 때 정상 스키마로 처리)
- 초기화는 최초 1회만 수행되며, 이후 재실행되지 않음

## Pending — 실기기에서 직접 확인 필요

- 실제 iPhone / iPad Safari에서 Home Screen 추가 후 기본 동작(오프라인 진입, 레이아웃, 터치 제스처) 확인
- GitHub Sync: 실제 `webapp-data-rw` 토큰으로 Safari ↔ Home Screen 양방향 pull/push 라운드트립 확인
- 이미 설치된 Home Screen 아이콘에서 서비스워커 업데이트가 정상적으로 적용되는지(캐시 버전 갱신 후 재실행 시 새 버전 반영) 확인
