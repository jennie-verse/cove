# iOS 단축어

## Save to cove

1. 단축어(Shortcuts)에서 새 단축어를 만들고 공유 시트에 표시(Show in Share Sheet)를 켭니다. 입력은 URL과 Safari 웹페이지입니다.
2. Safari 웹페이지 세부사항 가져오기(Get Details of Safari Web Page)로 이름(Name)을 가져옵니다.
3. 이름과 입력 URL을 각각 URL 인코딩(URL Encode)합니다.
4. 텍스트(Text)에 `https://jennie-verse.github.io/cove/?add=[URL]&title=[TITLE]`을 만듭니다.
5. URL 열기(Open URLs)를 추가하고 이름을 `Save to cove`로 저장합니다.

본문까지 저장할 때는 웹 페이지 콘텐츠 가져오기(Get Contents of Web Page)와 파일 저장(Save File)을 사용해 `iCloud Drive/cove-inbox/`에 HTML을 저장합니다. 외부 업체를 거치는 기사 가져오기(Get Article from Web Page)는 사용하지 않습니다.
