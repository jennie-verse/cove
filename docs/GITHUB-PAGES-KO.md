# GitHub Pages 배포

1. GitHub에서 공개 저장소 `cove`를 만듭니다.
2. 이 폴더의 내용이 저장소 최상위에 오도록 업로드합니다.
3. `Settings → Pages`에서 `Deploy from a branch`, `main`, `/ (root)`를 선택합니다.
4. `https://jennie-verse.github.io/cove/`가 열린 뒤 Safari의 `공유(Share) → 홈 화면에 추가(Add to Home Screen)`를 누릅니다.

업데이트가 보이지 않으면 앱을 완전히 종료하고 다시 열거나 Safari 웹사이트 데이터를 새로고침합니다. Service Worker 캐시는 `cove-v18`입니다.

## Custom domain에서 Journal(Daybook 연동)이 꺼짐

Journal은 `*.github.io` 호스트에서만 동작하도록 강화되었습니다. `*.github.io`가 아닌 custom domain이나 `localhost`에서 열면 `journalConfig()`가 예외를 던지고 Journal 전송은 조용히 꺼집니다(이전에는 `jennie-verse` 계정으로 fallback했지만, 의도하지 않은 계정에 쓰는 것을 막기 위해 이번에 되돌리지 않고 그대로 유지했습니다). Journal을 쓰려면 `https://<계정>.github.io/cove/` 주소로 접속하세요. 이 동작은 앱의 다른 기능(저장·읽기·백업)에는 영향을 주지 않습니다.
