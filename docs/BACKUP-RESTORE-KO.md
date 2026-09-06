# 백업과 복원

`Settings → Export backup`은 `cove-backup-YYYY-MM-DD.json`을 만듭니다. 주소·상태·폴더·태그·메모·하이라이트는 포함하지만 저작권이 있는 저장 본문은 제외합니다.

`Settings → Restore backup`에서 Merge는 같은 주소를 합치고, Replace는 두 번 확인한 뒤 기존 로컬 데이터를 바꿉니다. 중요한 변경 전에는 먼저 백업하세요.

## 백업 schema

백업 파일은 optional Journal 세션 원장(in-app Reader 읽기 세션)을 포함하는 schema 3 형식입니다.
