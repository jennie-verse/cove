# Cove

Cove는 나중에 읽을 주소를 모으고, 저장한 HTML 본문을 읽고, 하이라이트와 메모를 남기는 개인용 PWA입니다. 앱 화면은 영문이며 입력한 한글 제목·메모·태그·폴더 이름은 그대로 저장됩니다.

주요 기능은 `Inbox / Reading / Done`, 한 단계 폴더와 자유 태그, 검색·정렬·핀·Undo, HTML 가져오기, Reader 설정과 이어읽기, 5색 하이라이트, Markdown·JSON 내보내기, GitHub 동기화와 Daybook 기록입니다. 본문은 백업이나 동기화에 포함되지 않습니다.

## 공용 코드(shared) 참조 방식

cove는 `shared/v1`, `shared/v2` 파일을 저장소 안에 복사해 두지 않고, folio·tide와 같은 방식으로 배포된 공용 사이트(`https://<계정>.github.io/shared/v1/...`)를 상대 경로(`src/sync.js`·`src/journal.js`의 `../../shared/v1/sync.js`, `../../shared/v2/journal.js`)로 그대로 불러 씁니다 — 복사본을 두면 원본이 바뀌어도 모르고 계속 옛날 코드를 쓰게 되는(drift) 위험이 있고, `Published/shared/v1/`은 절대 수정하지 않는다는 고정 규칙과도 맞지 않기 때문입니다. `sw.js`의 오프라인 캐시 목록에도 같은 경로(`../shared/v1/sync.js`, `../shared/v2/journal.js`)로 등록되어 있고, 각 항목은 개별적으로 실패를 삼켜서 공용 사이트가 일시적으로 안 보여도 설치가 실패하지 않습니다. (테스트 코드 `tests/fixtures/`에만 CI 환경에서 sibling 저장소 없이도 돌아가도록 스냅샷 복사본을 별도로 두었습니다 — 배포되는 앱 코드와는 무관합니다.)
