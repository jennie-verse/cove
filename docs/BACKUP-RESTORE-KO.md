# 백업과 복원

`Settings → Export backup`은 `cove-backup-YYYY-MM-DD.json`을 만듭니다. 주소·상태·폴더·태그·메모·하이라이트는 포함하지만 저작권이 있는 저장 본문은 제외합니다.

`Settings → Restore backup`에서 Merge는 같은 주소를 합치고, Replace는 두 번 확인한 뒤 기존 로컬 데이터를 바꿉니다. 중요한 변경 전에는 먼저 백업하세요.

## 백업 schema와 버전 호환

2026-09-01부터 백업 파일에 optional Journal 세션 원장(in-app Reader 읽기 세션)이 포함되며 schema가 3으로 올라갔습니다. **schema 3으로 저장된 새 백업 파일은 2026-09-01 이후 버전의 Cove에서만 복원됩니다.** 구버전 Cove는 schema 1·2만 인식합니다. 다른 기기를 아직 업데이트하지 않았다면 그 기기에서 백업을 복원하기 전에 먼저 앱을 업데이트하세요. schema 1·2로 만들어진 예전 백업 파일은 새 버전에서도 계속 정상적으로 복원됩니다.
