---
paths:
  - "src/lib/prompts/**"
  - "src/app/api/generate/**"
---

# Assembler Generation Rules

## Origin

AI 생성이 객체를 일부만 만들거나(예: Page만, Mapping 없이) 연결을 빠뜨리면 그래프가 끊겨
"다음에 뭐가?"에 답할 수 없다. 이 파일은 **각 객체 생성 시 반드시 함께 만들어야 할 것**의 계약이다.
`src/lib/prompts/assembler.ts` 와 `/api/generate` 검증 로직이 이 계약을 강제한다.

---

## 생성 계약 (항상 함께)

### Page 생성 시
- Description
- Wireframe (UI Elements 포함)
- 연결된 Features
- PageFlow (Page 내부)
- 사용 APIs
- 사용 Database
- Mappings (각 UI Element)

### Feature 생성 시
- Description
- Related Pages
- Related APIs
- Related Database
- Business Rules

### Wireframe 생성 시
- UI Elements (≥1)
- **각 UI Element마다**: States · Action · API Mappings · Database Mappings · Result

---

## 출력 규칙

- 출력은 **연결된 그래프 JSON** — 객체는 `id`를 갖고 서로 **id 참조**(객체 중첩 금지).
- **고립 객체 금지**: 새로 만든 모든 객체는 최소 1개 연결을 가진다.
- 참조 무결성: 생성한 id만 참조한다(dangling 금지). 누락 시 `/api/generate` 정규화 단계가 보정(ASS-019).
- `navigate` Result는 대응 UserFlow edge를 함께 생성(flow.md).
- 추정·가정은 명시한다. 모르면 비워두지 말고 합리적 기본값 + "확인 필요" 표시.

## 범위 (점진 생성)

- 1차(MVP): 프롬프트 → **Requirements + Features + Pages + (Page별 Wireframe/UI Element)**.
- API/Database/UserFlow는 Page·Element 생성 시 파생 객체로 함께 뽑되, 깊이는 단계적으로.
- 탭별/객체별 부분 재생성은 같은 계약을 부분 적용.

## 문체

- 명사구·직접 동작·관계 명시. 마케팅·장황 금지. 상세: `content-style.md`.
