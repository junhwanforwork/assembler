안전 모드로 진입한다. 이 세션에서 파괴적인 명령을 실행하기 전에 반드시 사용자에게 확인을 구한다.

## 보호 대상 명령

아래 패턴을 포함한 Bash 명령은 실행 전에 반드시 경고하고 확인을 받는다:

**파일 삭제**

- `rm -rf`, `rm -r` (빌드 아티팩트 제외)
- 빌드 아티팩트 예외: `node_modules`, `.next`, `dist`, `build`, `.turbo`, `coverage`, `__pycache__`, `.cache`

**데이터베이스**

- `DROP TABLE`, `DROP DATABASE`, `TRUNCATE`
- 마이그레이션 롤백 명령

**Git 위험 명령**

- `git push --force`, `git push -f`
- `git reset --hard`
- `git checkout -- .` (전체 변경사항 버림)
- `git clean -f`, `git clean -fd`

**인프라**

- `kubectl delete`
- Docker 컨테이너/볼륨 삭제

## 경고 형식

위험 명령 감지 시:

```
⚠️  위험한 명령 감지됨

명령: [명령어]
위험: [어떤 데이터/파일이 삭제/변경되는지]
영향: [되돌릴 수 없는 이유]

계속하시겠습니까? (yes/no)
```

## 안전 팁

- DB 변경 전에는 반드시 마이그레이션 파일을 먼저 확인
- `git reset --hard` 대신 `git stash` 사용 권장
- 프로덕션 Supabase 조작 시 특히 신중하게

이 세션의 작업: $ARGUMENTS
