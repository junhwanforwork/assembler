OPINION 하루 마감 루틴을 실행한다. CLAUDE.md의 End-of-Day Review를 따른다.

## Step 1 — CLAUDE.md 준수 확인

오늘 수정된 파일들을 git diff로 확인하고 아래를 점검한다:

- CSS 네이밍 규칙 (semantic class + Tailwind)
- 색상 하드코딩 없이 design-tokens 사용
- 새 컴포넌트가 index.ts에 export 추가됐는지
- 코드 작성 규칙 (네이밍, 타입 안전성 등)

## Step 2 — CLAUDE.md 업데이트

오늘 발견한 내용 중 아래에 해당하면 Known Issues에 추가한다:

- 새로 발견한 실수 패턴
- 새로 정한 규칙
- 삽질한 내용 (다음번에 피할 수 있도록)
  형식: `- [YYYY-MM-DD] 내용`

## Step 3 — 빌드 확인

```bash
npx tsc --noEmit
npm run build
```

빌드 실패 시 수정 후 다시 확인한다.

## Step 4 — 커밋 + 푸시

`/commit` 스킬을 실행한다.
변경사항이 있으면 커밋 후 `git push origin main`을 실행한다.
