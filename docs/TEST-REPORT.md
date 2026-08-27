# 테스트 보고서

작성일: 2026-08-27

## 자동 검사

- Cove 7/7 통과: URL 정규화, 위험 프로토콜 차단, 태그 정규화, Markdown 머리말·주석 개수, Cove Journal 레코드 계약
- Shared 19/19 통과: Cove가 열 번째 Journal 앱으로 등록되고 기존 계약 유지
- Daybook 27/27 통과: Cove가 열 번째 소스로 등록되고 기존 요약·보안·PWA 검사 유지

## 브라우저 검사

- 인앱 Browser: Library → Add link → Detail → Reading 전환 → Settings 흐름 통과
- 로컬 Chrome: 1440×900, 390×844 렌더 캡처. 항목 2개 표시, 콘솔 오류 0건, 모바일 가로 오버플로 없음
- 탭 터치 영역 높이 44px 확인. Safe Area 하단 Add link 버튼과 모바일 줄바꿈 확인
- 이미지·favicon 외부 요청 없음. 저장 본문은 DOMPurify 정제 후 스크립트·폼·iframe·원격 이미지를 제거

## 실기기 Pending

1. iOS 공유 시트 단축어와 홈 화면 앱 인테이크
2. 한글 URL 파라미터와 HTML 인코딩
3. iOS 저장 공간 부족 시 IndexedDB 유지
4. 실제 비공개 `webapp-data` 저장소 Sync와 Daybook 날짜별 표시
