현재 브랜치의 변경사항을 기반으로 GitHub Pull Request를 생성한다.

## 실행 순서

1. `git status`와 `git log --oneline origin/main..HEAD`로 변경 범위 파악
2. `git diff origin/main...HEAD`로 전체 변경 내용 검토
3. 아직 커밋되지 않은 변경사항이 있으면 먼저 `/commit` 실행
4. 브랜치가 origin에 없으면 `git push -u origin <branch>` 실행
5. 아래 형식으로 PR 생성:

```
gh pr create --title "<제목>" --body "$(cat <<'EOF'
## 변경 내용
-

## 테스트 방법
- [ ]

## 관련 이슈
-

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

PR 제목은 conventional commits 형식을 따른다: `feat:`, `fix:`, `refactor:`, `chore:`
본문은 한국어로 작성한다.
완료 후 PR URL을 출력한다.
