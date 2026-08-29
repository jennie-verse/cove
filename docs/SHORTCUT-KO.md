# iOS 단축어

## Save to cove

1. 단축어(Shortcuts)에서 새 단축어를 만들고 공유 시트에 표시(Show in Share Sheet)를 켭니다. 입력은 URL과 Safari 웹페이지입니다.
2. Safari 웹페이지 세부사항 가져오기(Get Details of Safari Web Page)로 이름(Name)을 가져옵니다.
3. 이름과 입력 URL을 각각 URL 인코딩(URL Encode)합니다.
4. 텍스트(Text)에 `https://jennie-verse.github.io/cove/?add=[URL]&title=[TITLE]`을 만듭니다.
5. URL 열기(Open URLs)를 추가하고 이름을 `Save to cove`로 저장합니다.

본문까지 저장할 때는 웹 페이지 콘텐츠 가져오기(Get Contents of Web Page)와 파일 저장(Save File)을 사용해 `iCloud Drive/cove-inbox/`에 HTML을 저장합니다. 외부 업체를 거치는 기사 가져오기(Get Article from Web Page)는 사용하지 않습니다.

## Mac 단축어 — Mac에서 보내고 iPhone/iPad에서 보기

Mac에서는 Cove를 직접 열어서 쓰지 않고, 링크를 iPhone/iPad로 "보내기"만 하고 싶을 때의 설정입니다.
Cove는 서버 없이 브라우저 저장공간 + 공유 GitHub 저장소로만 동기화되므로, Mac도 Safari/Home
Screen 앱과 똑같이 **별도의 저장 컨텍스트** 하나로 취급됩니다 — Mac에서 한 번 Sync를 켜 두면
그다음부터는 단축어만 실행해도 iPhone/iPad로 자동으로 넘어갑니다.

### 0 · Mac에서 Sync를 한 번 켜기 (최초 1회만)

1. Mac에서 Safari(또는 아무 브라우저)로 `https://jennie-verse.github.io/cove/`를 엽니다.
2. 설정 아이콘 → **Sync** 항목에서 iPhone/iPad와 같은 `webapp-data-rw` 토큰을 붙여넣고
   **Save token**을 누릅니다.
3. 이름 칸에 `Mac`처럼 알아볼 수 있는 이름을 입력하고 **Save name** → 토글을 켜서
   **Turn on Sync**를 켭니다.
4. 이 탭은 이후로 다시 열 필요 없습니다. (평소에 Cove를 직접 보거나 관리하는 용도가 아니라,
   단축어가 링크를 넘겨주는 통로로만 씁니다.)

### 1 · 단축어(Shortcuts) 앱에서 만들기 (macOS 단축어 앱, Monterey 이상)

1. 단축어 앱에서 새 단축어를 만들고, 오른쪽 정보(ⓘ) 패널에서 **공유 시트에서 사용(Use as
   Quick Action)** → **공유 시트(Share Sheet)**를 켭니다. 입력 종류는 URL, 텍스트를 받도록
   둡니다.
   - Safari 주소창 옆 공유 메뉴에 바로 띄우고 싶다면 Safari → 설정(Settings) → 확장 프로그램
     (Extensions) 에서 **Shortcuts**를 켜 두세요.
2. **Safari 웹페이지 세부사항 가져오기(Get Details of Web Page)** 로 제목(Name)을 가져옵니다.
   (Safari 공유 메뉴로 실행하면 입력이 자동으로 현재 탭 URL이 됩니다.)
3. 제목과 URL을 각각 **URL 인코딩(URL Encode)** 합니다.
4. **텍스트(Text)** 동작으로 `https://jennie-verse.github.io/cove/?add=[URL]&title=[TITLE]`를
   만듭니다.
5. **URL 열기(Open URLs)** 를 추가해 위 텍스트를 엽니다. 단축어 이름을 `Save to cove`로
   저장합니다.
6. 독(Dock)에 놓고 쓰기보다는 **메뉴 막대(Menu Bar)**, **서비스(Services) 메뉴**, 또는
   Safari 공유 메뉴에 추가해 두면 브라우징 중 바로 실행하기 편합니다.

### 2 · 실행하면 벌어지는 일

- 위 URL을 열면 브라우저 탭이 하나 뜨면서 Cove가 그 링크를 저장하고, 곧바로 GitHub로
  자동 업로드(push)합니다 — **Sync now**를 따로 누를 필요는 없습니다.
- 서버가 없는 구조라 "탭이 아예 안 뜨게" 만들 방법은 없지만, `Saved to cove.` 토스트가
  보이면 업로드까지 끝난 것이니 탭은 바로 닫아도 됩니다.
- iPhone/iPad의 Home Screen Cove 앱을 열거나(백그라운드에서 다시 앞으로 가져오는 것 포함)
  Safari에서 Cove 탭을 열면, 최신 기록을 자동으로 받아옵니다(pull) — 여기서도 따로 누를
  것이 없습니다.
