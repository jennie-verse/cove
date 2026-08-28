# 이름·색상·글꼴 수정 안내

코드를 수정한 뒤에는 `sw.js`의 `CACHE` 값을 올리고 저장소 루트를 그대로 배포하세요 (GitHub Actions가 `main` 브랜치를 GitHub Pages로 그대로 올립니다). 별도 빌드나 `dist/` 폴더는 없습니다.

## 앱 이름

- 브라우저 제목·PWA meta(`apple-mobile-web-app-title` 등): `index.html`
- 설치 이름·설명: `manifest.webmanifest`의 `name` / `short_name` / `description`
- 화면 브랜드 이름(헤더의 `cove`): `index.html`의 `#brandButton` 안 `<span>`

세 곳에서 같은 이름을 씁니다.

## 대표 색상

`assets/app.css`의 `:root`:

| 변수 | 쓰임 |
|---|---|
| `--bg`, `--surface` | 배경·카드 |
| `--text`, `--muted`, `--faint` | 본문·보조 글자 |
| `--rose`, `--deep`, `--tint` | Baby Pink 계열 강조색 (버튼·핀 표시·선택 탭) |
| `--sky`, `--mint`, `--coral` | 상태·하이라이트 보조색 |
| `--line`, `--shadow`, `--radius` | 경계선·그림자·모서리 반경 |

본문 대비는 4.5:1 이상을 유지하세요. 상태(Inbox/Reading/Done)와 하이라이트 5색은 **색만으로 구분하지 않습니다** — 탭 이름표·핀 세로선(`.item-card.pinned:before`)·하이라이트 목록의 색 이름 텍스트가 함께 있어야 접근성 규정(WebApp_House_Style.md 5장)을 지킵니다.

하이라이트 5색 자체는 `src/reader.js`의 `COLORS` 배열과 `reader-host.html`의 `mark[data-color=...]` 규칙 두 곳에 **같은 값**으로 들어 있습니다. 색을 추가/변경할 때는 두 파일을 함께 고치세요.

## UI 글씨 크기

`:root`의 `--font`가 앱 화면 전체 글자 크기의 기준입니다. 6단계 값 자체는 `src/settings.js`의

```js
const sizes = [6, 8, 10, 12, 14, 17];
```

한 곳에서 관리합니다 (px 단위, 기본값은 4단계=12px). 여기를 고치면 설정 화면의 슬라이더와 `applyFontStep()`이 함께 따라옵니다.

나머지 `font-size`는 대체로 `rem`/`em`입니다. 단, 아래 두 가지는 **의도적으로 절대 px**이며 바꾸지 마세요.

- `input, textarea, select { font-size: 16px }` (`assets/app.css`) — 16px 미만이면 iOS Safari가 입력 필드를 탭할 때 화면을 자동 확대합니다.
- `min-height: 44px` 계열 (버튼·탭·터치 영역) — 터치 목표 크기 규정입니다.

## Reader 화면 글꼴·레이아웃

읽기 화면(`src/reader.js`)의 글자 크기·줄 간격·본문 폭은 `cove.reader.size` / `cove.reader.line` / `cove.reader.width`라는 localStorage 키에 저장되고, `--reader-size` / `--reader-line` / `--reader-width` CSS 변수로 전달됩니다.

본문은 `reader-host.html`이라는 **별도의 샌드박스 iframe 문서**에서 그려집니다 (보안상 `allow-same-origin` 없이). 그래서 읽기 화면 스타일을 바꿀 때는 두 곳을 함께 봐야 합니다.

| 대상 | 위치 |
|---|---|
| 글꼴·크기·줄간격·폭 슬라이더 UI, 값 저장 | `src/reader.js`의 `readerSettings()` |
| 실제 본문에 적용되는 CSS (iframe 안) | `reader-host.html`의 `<style>` |
| 본문을 감싸는 바깥 iframe 박스 크기 | `assets/app.css`의 `.reader-frame` |
| 본문 렌더링·하이라이트칠·스크롤 진행률 전달(부모 ↔ iframe 메시지) | `src/reader-frame.js` |

앱 전체 UI 글꼴(Lexend)은 `assets/app.css` 상단 `@font-face`와 `assets/fonts/`의 `.woff2` 파일이 출처입니다. 새 글꼴을 추가하면 `licenses/`에 라이선스 원문을 넣고 `THIRD_PARTY_NOTICES.md`를 갱신하세요.

## 아이콘

- PWA/홈 화면: `icons/icon-180.png`, `icon-192.png`, `icon-512.png` (파스텔톤, 글자 없음)
- UI 안의 작은 아이콘(설정 톱니바퀴, 검색 돋보기 등): `src/ui.js`의 `icon()` 함수 안 SVG 경로

아이콘을 교체할 때 파일 크기(180/192/512)와 `manifest.webmanifest`·`index.html`의 경로를 그대로 유지하세요.

## 업데이트 캐시

`sw.js`의:

```js
const CACHE = 'cove-v6';
```

`sw.js`를 고칠 때마다(캐시 목록, 캐시 전략 등) 이 값을 올리세요. 이전 버전을 쓰던 브라우저는 새 서비스 워커가 설치되면서 오래된 캐시를 지우고 새 버전을 받습니다.
