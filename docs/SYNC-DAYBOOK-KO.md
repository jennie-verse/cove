# Sync — Safari와 Home Screen 앱 기록 맞추기

iPhone/iPad에서 Safari로 연 Cove와 "Add to Home Screen"으로 추가한 Cove는 저장공간이
서로 완전히 분리되어 있어, 한쪽에서 저장한 링크가 다른 쪽에는 보이지 않습니다.
Sync를 켜면 비공개 GitHub 저장소를 통해 두 쪽의 기록을 자동으로 맞춰줍니다.

## 0 · 준비물 — 토큰

1. 저에게(Claude Code) 받은 fine-grained Personal Access Token 문자열을 채팅에서 복사해 둡니다.
   이 토큰은 `cove-sync-store` 저장소 **하나에만**, 그것도 Contents 읽기/쓰기 권한만 가진
   전용 토큰입니다. 다른 앱(Tide 등)의 토큰과는 다른 값입니다.
2. 토큰은 비밀번호와 같습니다. 다른 사람과 공유하지 말고, 메모 앱 등 다른 곳에 옮겨 적지
   마세요. 잊어버리면 Settings에서 새로 발급을 요청하면 됩니다 — 이전 토큰은 GitHub에서
   폐기(revoke)하면 됩니다.
3. 이 토큰은 기기의 브라우저 저장공간(localStorage)에만 저장됩니다. Cove 데이터 자체와
   마찬가지로 Safari와 Home Screen 앱에 각각 따로 붙여넣어야 합니다 (아래 1·2단계).

## 1 · Safari에서 켜기

1. Safari로 Cove를 엽니다.
2. 오른쪽 위 설정(Settings) 아이콘 → **Connections** 아래 **Sync** 항목을 누릅니다.
3. **Token (GitHub Personal Access Token)** 칸에 0단계의 토큰을 붙여넣고 **Save token**을 누릅니다.
4. **This device/app's name** 칸에 `Safari`처럼 알아볼 수 있는 이름을 입력하고 **Save name**을 누릅니다.
   (비워 두면 자동으로 이름이 생성됩니다.)
5. 오른쪽 위 토글을 눌러 **Turn on Sync**를 켭니다.
6. **Sync now**를 눌러 지금 바로 한 번 동기화합니다.

## 2 · Home Screen 아이콘에서 켜기

1. 홈 화면의 Cove 아이콘으로 앱을 엽니다 (Safari 탭이 아닌 별도 앱처럼 열리는 것입니다).
2. 설정 아이콘 → **Sync** 항목을 누릅니다.
3. **같은 토큰**을 다시 붙여넣고 **Save token**을 누릅니다. (Safari와 저장공간이 분리되어
   있어 토큰도 다시 넣어야 합니다.)
4. 이름 칸에는 `Home Screen`처럼 Safari와 다른 이름을 입력하고 **Save name**을 누릅니다.
5. 토글을 켜서 **Turn on Sync**.
6. **Sync now**를 눌러 지금 바로 한 번 동기화합니다.

## 3 · 두 화면이 맞는지 확인하기

1. 아무 쪽에서나 링크를 하나 저장하고 **Sync now**를 누릅니다.
2. 반대쪽(Safari ↔ Home Screen)을 열고, 역시 Settings → Sync → **Sync now**를 누릅니다.
3. 라이브러리로 돌아가 방금 저장한 링크가 보이는지 확인합니다.
4. 이후로는 앱을 열 때마다 자동으로 한 번씩 최신 기록을 받아옵니다(pull). 새로 저장하거나
   바뀐 내용을 다른 기기로 보내려면 **Sync now**를 눌러야 합니다 — 자동으로 올라가지는
   않습니다.

## 참고

- 링크 주소·제목·상태·폴더·태그·메모·하이라이트만 동기화됩니다. **저장한 기사 본문은
  업로드되지 않습니다.**
- 토큰을 지우면(**Clear token**) Sync도 함께 꺼집니다.
- **Journal**(Daybook 연동) 기능은 Cove의 Sync와 별개로 공용 저장소(`webapp-data`)에
  씁니다. 이 문서의 Sync 전용 토큰은 그 저장소에는 접근 권한이 없으므로, Journal을
  쓰려면 별도로 안내를 요청하세요 — 지금은 꺼져 있어도 문제가 없습니다.
