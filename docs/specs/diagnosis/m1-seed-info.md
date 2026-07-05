# ASM-032 시드 메타 (2026-07-05)

점검용 실데이터 — **삭제 금지**. 재시드 시 m1-seed-design.json을 PUT design으로 재사용(생성 재호출 금지).

- session_id (x-session-id / localStorage `assembler_session_id`): `677261d9-633a-460c-9a28-e4e41e1517e2`
- product: `eec86064-e0e1-40ee-8430-71532947735a` — "Assembler (시드)"
- workspace(스펙): `31c36a59-4e04-4154-87e9-92729de797f8` — "메인 (시드)"
- 시드 구성: 경로 B 싱크-인 API 25개 + DB 테이블 7개(source: code, 이 레포 실측) → 경로 C 생성(opus 1회, 재시도 1회 — 1회차 120s 타임아웃 502) → PUT design 저장
- 그래프(시드 직후): 요구사항 6 · 기능 6 · 페이지 3 · 플로우 1 · 와이어프레임 3 · 엘리먼트 13
- 잔존 재검증(2026-07-05 레인 1 QA, dev 3132 + 실 DB curl): products에 "Assembler (시드)" 잔존 · apis 25 · dbTables 7 · design = 요구사항 7(점검 중 인라인 추가 1 포함) · 기능 6 · 페이지 3 · 플로우 1 · 와이어 3 · 요소 13
