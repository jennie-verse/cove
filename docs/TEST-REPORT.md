# 테스트 보고서

최초 작성일: 2026-08-27 · 최종 검토·재배포 완료 갱신: 2026-08-28

## 2026-08-28 화면·레이아웃 후속 검토

- 설정(Settings)·정렬(Change sort)·내보내기(Export)·추가(Add link) 등 아이콘이 보이지 않던 원인을 수정했습니다. 동적 SVG를 HTML이 아닌 SVG 네임스페이스로 생성해 Safari를 포함한 실제 브라우저에서 `<path>`가 정상 렌더링됩니다.
- 데스크톱 Library에서 헤더만 1040px로 벌어지던 정렬 오류를 고쳐 헤더와 760px 본문이 같은 좌우선에 놓이도록 했습니다.
- Settings 행이 내용 길이만큼 들쭉날쭉 줄어들고 모바일 화살표가 다음 줄로 떨어지던 그리드 오류를 수정했습니다. 모든 행은 섹션 너비를 채우며 긴 값은 가운데 열에서 줄바꿈됩니다.
- 상태·태그·핀·메뉴·하이라이트 색상 버튼의 최소 터치 영역을 44×44px로 맞췄고, 작은 화면에서 하이라이트 도구와 폴더 관리 작업 버튼이 줄바꿈되도록 했습니다.
- 변경 자산이 기존 브라우저/Service Worker 캐시에 남지 않도록 CSS·진입 모듈에 빌드 쿼리 `v=13`을 붙이고 캐시 이름을 `cove-v13-ui-icons-layout`으로 올렸습니다.
- 실제 브라우저에서 390×844, 844×390, 768×1024, 1024×768, 1280×800을 확인했습니다. 가로 넘침 0, 프레임워크 오류 오버레이 없음, 최종 콘솔 warning/error 0건이며 글자 크기 6px·17px에서도 Settings 가로 넘침이 없었습니다.
- 상호작용 확인: Change sort → Title 선택 후 `Sort: Title` 갱신, Settings 진입/복귀, Add link 저장, 카드 Pin → Unpin 상태 변경, Detail 화면 진입을 확인했습니다.
- GitHub 커밋 `d55093f`의 Actions `33178243312`에서 16개 테스트와 Pages 배포가 성공했습니다. 공개 Pages에서 새 Service Worker 활성화 후 아이콘·레이아웃·상호작용·콘솔을 재검증했고 변경 런타임 6개는 로컬과 SHA-256이 모두 일치했습니다.

## 이번 검토에서 고친 것 (요약 — 자세한 내용은 docs/README-KO.md 및 커밋 로그)

1. `navigator.storage.persist()` — 이미 `src/app.js`의 `init()`에 있었음을 확인 (추가 조치 불필요).
2. `src/` 17개 파일을 한 줄 압축 코드에서 줄바꿈·들여쓰기·파일 상단 설명 주석이 있는 형태로 재포맷 (동작 변경 없음 — 기존 7개 테스트 전부 재포맷 후에도 그대로 통과 확인).
3. `reader-host.html`을 `allow-same-origin` 없는 샌드박스 iframe(`allow-scripts allow-popups allow-popups-to-escape-sandbox`)으로 실제로 사용하도록 변경. 본문은 `src/reader-frame.js`(신뢰된 부트스트랩 스크립트, 이 iframe에 들어가는 유일한 스크립트)를 통해 `postMessage`로만 주고받음 — 하이라이트 칠하기·텍스트 선택 감지·스크롤 진행률도 전부 메시지 기반으로 전환.
4. `shared/v1`·`shared/v2` 중복 보관 폴더를 cove 저장소에서 삭제하고, folio·tide와 같은 방식으로 배포된 공용 사이트를 `../../shared/...` 상대 경로로 참조하도록 `src/sync.js`·`src/journal.js`를 수정. `sw.js` 캐시 목록과 `.github/workflows/deploy.yml`(테스트 문법 검사 대상, 배포 시 복사 목록)도 함께 고침 — 안 고쳤으면 배포가 실패했을 것.
5. `index.html`에 `description`·`apple-mobile-web-app-title`·`color-scheme`·`format-detection`·`mobile-web-app-capable`·`noscript` 안내를 추가.
6. `docs/CUSTOMIZATION-KO.md` 신규 작성 (petal 형식을 따름).
7. (범위 밖 발견) 폴더 이름 바꾸기·순서 바꾸기가 계획서 5-4에 있었지만 구현이 없어 추가 (`src/folders.js`의 `renameFolder`/`moveFolder`).
8. (범위 밖 발견) Markdown 내보내기가 항목 1개만 가능했음 — "여러 개 선택/폴더 통째로" 내보내기(`serializeMultiItemAnnotations`, `exportItemsMarkdown`)를 추가하고 Library 툴바("현재 보이는 목록 내보내기")와 Manage folders("폴더 통째로 내보내기")에 연결.
9. `sw.js` 캐시를 `cove-v5` → `cove-v6`로 올림 (reader-frame.js 추가, shared 캐시 경로 수정).

## 자동 검사 (`npm test`)

- 16/16 통과 (기존 13개 + 화면 회귀 방지 계약 3개): URL 정규화·위험 프로토콜 차단·태그 정규화, Markdown 단일/다중 항목 내보내기 머리말·본문 개수 일치, 백업 JSON 검증(다른 앱 거부·스키마 1과 2 모두 허용·잘못된 형태 거부), Cove Journal 레코드 계약, SVG 네임스페이스, HTML/CSS/Service Worker 빌드 번호 일치, 반응형·44px 터치 CSS 계약.
- `node --check`로 `src/*.js` 17개 + `src/reader-frame.js` + `sw.js` 전체 문법 검사 통과.
- CI(`npm test` 뒤 문법 검사)가 삭제한 `shared/` 폴더를 더 이상 참조하지 않도록 워크플로도 함께 수정함 (안 고쳤으면 이번 통과와 별개로 실제 GitHub Actions에서 실패했을 것).

## 이번에 로컬 서버로 직접 확인한 것 (Claude Code 리뷰 브라우저)

- Library → Add link(한글 제목 "재무제표 읽는 법" 입력) → 저장 → Detail → Read → 상태가 Inbox에서 Reading으로 자동 전환됨을 확인.
- Manage folders: 폴더 이름 바꾸기 버튼·↑/↓ 순서 바꾸기(실제로 순서가 바뀜을 화면에서 확인)·Export·Delete 버튼 전부 렌더링과 동작 확인.
- 폴더 삭제 시 문구("N items will move to Unsorted. Items are not deleted.") 및 로직 코드 리뷰로 확인 (실제 클릭은 `confirm()` 네이티브 다이얼로그라 자동화 환경에서 스킵).
- 백업: `buildBackup()`이 `{app:'cove', schema:2, items, folders}` 형태로 실제 데이터를 반환함을 콘솔에서 직접 실행해 확인. schema 1 형태의 백업을 `restoreBackup(file,'merge')`로 넣었을 때 같은 `urlKey`를 가진 기존 항목과 **중복되지 않고 병합**됨을 실제로 실행해 확인(항목 수가 1로 유지됨).
- 읽기 화면(iframe) 렌더링·하이라이트 칠하기·텍스트 선택 감지(`postMessage`)를 별도의 최소 테스트 페이지(샌드박스 없는 iframe)에서 직접 실행해 로직이 올바름을 확인. 악의적인 `<img onerror=...>`를 강제로 주입했을 때 `reader-host.html`의 CSP(`script-src 'self'`)가 인라인 이벤트 핸들러 실행을 실제로 차단하는 것도 콘솔 오류로 확인.
- **알려진 리뷰 환경 제약** — 이 리뷰용 브라우저는 `allow-same-origin`이 빠진 샌드박스 iframe 안에서 자기 자신의 `<script src>`를 불러오는 것을 차단합니다(로그: "An unknown error occurred when fetching the script"). 최소 재현 페이지로 확인한 결과 앱 코드와 무관한 이 브라우저 고유의 제약이며, 실제 Safari·Chrome이나 GitHub Pages 배포본에서는 표준 동작이라 문제 없이 열립니다. 그 결과 이 리뷰 환경에서는 Reader 화면 본문이 비어 보입니다 — **사용자가 실기기/실제 배포 주소에서 반드시 재확인 필요합니다.**
- 콘솔 오류: 위 알려진 리뷰 환경 제약(스크립트 fetch 차단, sw.js 등록 실패 — 둘 다 `.catch()`로 앱 동작에는 영향 없음) 외 실제 앱 버그로 보이는 오류 없음.

## 실기기 Pending (사용자가 실제 iPhone/iPad에서 확인)

1. iOS 공유 시트 단축어와 홈 화면 앱 인테이크(`?add=`), 새로고침 시 중복 저장 안 되는지.
2. 한글 제목·폴더 이름이 단축어 URL 파라미터에 실려도 깨지지 않는지, 저장한 HTML의 한글 인코딩.
3. **Reader 화면이 실제 Safari/홈 화면 앱에서 정상적으로 본문을 보여주는지** — 이번에 구조를 바꾼 부분(샌드박스 iframe)이라 최우선으로 확인 필요. 하이라이트 칠하기·삭제·스크롤 이어읽기·Aa(글꼴 설정)까지 함께.
4. iPhone/iPad 세로·가로, 글자 크기 6단계 전체에서 레이아웃 확인 — 특히 헤더의 폴더 이름이 길 때, 온스크린 키보드가 열렸을 때 Add link 버튼이 가려지지 않는지.
5. 한글 IME 조합 중 검색·태그 입력이 끊기지 않는지.
6. iOS 저장 공간 부족 시 `persist()` 적용 후 IndexedDB 유지 여부.
7. 실제 비공개 `webapp-data` 저장소로 Sync·Daybook 기록이 날짜별로 정상 표시되는지 (canonical `shared/v1`·`v2` 참조 경로를 이번에 고쳤으므로 특히 확인 필요).
8. Export(다중/폴더) Markdown 파일을 Obsidian에서 열어 형식이 folio와 한 폴더에 잘 모이는지.

## 판단이 필요해 남겨 둔 것 (docs/README-KO.md 참고)

- 진짜 체크박스 다중 선택 UI 대신 "현재 보이는 목록 내보내기"로 다중 export를 구현함 — 더 큰 UI 작업 없이 계획서의 "여러 개 선택" 요구를 만족시키는 실용적 절충. 필요하면 후속 작업으로 체크박스 선택 모드를 추가할 수 있음.
