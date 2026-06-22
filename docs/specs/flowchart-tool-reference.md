# Flowchart Tool — 구현 레퍼런스

> 집에서 처음부터 다시 만들 때 참조하는 문서.  
> Next.js App Router + React 19 + Tailwind 없이 인라인 style만 사용.  
> 외부 라이브러리 없음 — SVG + React만으로 플로우차트 캔버스 구현.

---

## 파일 구조

```
src/
  lib/types/tool.ts                  — 공유 타입 (서버·클라이언트 공통)
  components/tool/FlowchartCanvas.tsx — SVG 캔버스 컴포넌트
  app/(tool)/flowchart/page.tsx       — 메인 페이지 (3패널 레이아웃)
  app/api/tool/flowcharts/
    route.ts                          — GET(목록) / POST(생성)
    [id]/route.ts                     — GET / PATCH / DELETE
public/
  flowchart-current.json              — Claude Code → 브라우저 파일 폴링용
```

---

## 1. 데이터 타입

```typescript
// src/lib/types/tool.ts

export interface FlowchartSession {
  id: string;
  title: string;
  data: FlowchartData;
  created_at: string;
  updated_at: string;
}

export interface FlowNode {
  id: string;
  label: string;
  type: "start" | "screen" | "decision" | "route" | "end";
  /** 가로 위치 — 플로우에서 몇 번째 단계 (0-based) */
  step: number;
  /** 세로 위치 — 같은 step 내 병렬 분기 위치 (0-based) */
  track: number;
}

export interface FlowEdge {
  from: string;
  to: string;
  label?: string;
  condition?: "yes" | "no";
}

export interface FlowchartData {
  nodes: FlowNode[];
  edges: FlowEdge[];
  edge_cases: string[];
  missing_cases: string[];
}
```

---

## 2. 캔버스 좌표 시스템

```typescript
const H_STRIDE = 280;   // step 간격 (px)
const V_STRIDE = 160;   // track 간격 (px)
const CANVAS_PAD = 80;  // 캔버스 여백

// 노드 크기 (타입별)
const NODE_DIMS = {
  start:    { w: 80,  h: 32 },
  screen:   { w: 160, h: 44 },
  decision: { w: 80,  h: 80 },
  route:    { w: 100, h: 48 },
  end:      { w: 100, h: 36 },
};

// 노드 중심 좌표
function getNodeRect(node: FlowNode) {
  const dims = NODE_DIMS[node.type];
  const cx = CANVAS_PAD + node.step * H_STRIDE;
  const cy = CANVAS_PAD + node.track * V_STRIDE;
  return {
    x: cx - dims.w / 2,  // top-left
    y: cy - dims.h / 2,
    w: dims.w,
    h: dims.h,
    cx,  // center
    cy,
  };
}

// 캔버스 크기 (노드에 따라 동적 계산)
const canvasW = CANVAS_PAD * 2 + maxStep  * H_STRIDE + 200;
const canvasH = CANVAS_PAD * 2 + maxTrack * V_STRIDE + 120;
```

---

## 3. 엣지 — Cubic Bezier + 화살표

```typescript
function getEdgePath(src, tgt) {
  const adx = Math.abs(tgt.cx - src.cx);
  const ady = Math.abs(tgt.cy - src.cy);

  // 가로/세로 중 더 긴 방향으로 연결
  if (adx >= ady) {
    // 좌→우 (또는 우→좌)
    const right = tgt.cx >= src.cx;
    const x1 = right ? src.x + src.w : src.x;  y1 = src.cy;
    const x2 = right ? tgt.x : tgt.x + tgt.w;  y2 = tgt.cy;
    const dx = Math.abs(x2 - x1) * 0.45;
    // Cubic bezier control points 수평으로만 이동
    return `M ${x1} ${y1} C ${x1 + (right ? dx : -dx)} ${y1} ${x2 + (right ? -dx : dx)} ${y2} ${x2} ${y2}`;
  } else {
    // 위→아래 (또는 아래→위)
    const down = tgt.cy >= src.cy;
    const x1 = src.cx;  y1 = down ? src.y + src.h : src.y;
    const x2 = tgt.cx;  y2 = down ? tgt.y : tgt.y + tgt.h;
    const dy = Math.abs(y2 - y1) * 0.45;
    return `M ${x1} ${y1} C ${x1} ${y1 + (down ? dy : -dy)} ${x2} ${y2 + (down ? -dy : dy)} ${x2} ${y2}`;
  }
}

// 화살표 삼각형 — 도착 노드 방향에 따라
function getArrow(src, tgt): string /* SVG polygon points */ {
  // 가로 방향 화살표
  const ax = right ? tgt.x : tgt.x + tgt.w;
  if (right) return `${ax},${ay} ${ax-8},${ay-4} ${ax-8},${ay+4}`;
  
  // 세로 방향 화살표
  if (down) return `${ax},${ay} ${ax-4},${ay-8} ${ax+4},${ay-8}`;
}
```

---

## 4. 핵심 SVG 렌더 구조

```tsx
<div style={{ position: "relative" }}>
  <svg
    ref={svgRef}
    width={canvasW} height={canvasH}
    style={{ cursor: dragState ? "crosshair" : undefined }}
    onMouseMove={handleMouseMove}
    onMouseUp={handleSvgMouseUp}
    onDoubleClick={handleSvgDoubleClick}
  >
    {/* Layer 1: Edges */}
    {edges.map(edge => (
      <g onMouseEnter onMouseLeave onClick>
        <path d={d} fill="none" stroke="transparent" strokeWidth={12} /> {/* 히트 영역 */}
        <path d={d} fill="none" stroke={color} strokeWidth={...} strokeDasharray={...} />
        <polygon points={arrowPoints} fill={arrowColor} />
        {/* Yes/No 레이블 */}
      </g>
    ))}

    {/* 드래그 미리보기 선 */}
    {dragState && <line x1={src.cx} y1={src.cy} x2={dragState.mouseX} y2={dragState.mouseY}
      stroke="#df4d18" strokeWidth={1.5} strokeDasharray="6 3" pointerEvents="none" />}

    {/* Layer 2: Nodes */}
    {nodes.map(node => {
      // ─── 핵심 패턴: <g> wrapper + 큰 hit zone ──────────────
      // onMouseLeave on <g> does NOT fire when moving between sibling children
      // → 노드에서 ＋ 버튼으로 마우스 이동해도 hover 유지
      return (
        <g
          onMouseEnter={() => setHoveredNodeId(node.id)}
          onMouseLeave={() => setHoveredNodeId(null)}
        >
          {/* ① 큰 투명 hit zone — 노드 + 어포던스 전부 커버 */}
          {/* Right ＋: +36px, Below ＋: +36px, Left ＋: -44px */}
          <rect
            x={rect.x - 44} y={rect.y - 6}
            width={rect.w + 80} height={rect.h + 42}
            fill="rgba(0,0,0,0)"
            style={{ pointerEvents: "all", cursor: "pointer" }}
            onClick={() => onNodeClick(node.id)}
            onMouseUp={(e) => handleMouseUp(e, node.id)}
          />

          {/* ② 노드 시각 — 클릭은 hit zone에서 처리 */}
          <g style={{ pointerEvents: "none" }}>
            <NodeShape node={node} rect={rect} ... />
          </g>

          {/* ③ 호버 어포던스 */}
          {hovered && !dragState && (
            <g>
              {/* 연결 포인트 ● */}
              <circle cx={rect.x + rect.w} cy={rect.cy} r={5}
                fill="#df4d18" onMouseDown={(e) => handleConnectStart(e, node.id)} />
              <circle cx={rect.cx} cy={rect.y + rect.h} r={5}
                fill="#df4d18" onMouseDown={(e) => handleConnectStart(e, node.id)} />

              {/* ＋ 오른쪽 — 다음 step 노드 추가 */}
              <g onClick={() => onAddNodeRight(node.id)}>
                <circle cx={rect.x + rect.w + 24} cy={rect.cy} r={10} fill="#1a1a28" stroke="#df4d18" />
                <text x={rect.x + rect.w + 24} y={rect.cy} textAnchor="middle">+</text>
              </g>

              {/* ＋ 아래 — 같은 step 새 track 추가 */}
              <g onClick={() => onAddNodeBelow(node.id)}>
                <circle cx={rect.cx} cy={rect.y + rect.h + 24} r={10} />
                <text x={rect.cx} y={rect.y + rect.h + 24} textAnchor="middle">+</text>
              </g>

              {/* ＋ 왼쪽 — step 삽입 (step > 0일 때만) */}
              {node.step > 0 && (
                <g onClick={() => onAddNodeRight(node.id + "__insertBefore")}>
                  <line x1={rect.x - 32} y1={rect.y - 20} x2={rect.x - 32} y2={rect.y + rect.h + 20}
                    stroke="rgba(255,255,255,0.12)" strokeDasharray="3 3" />
                  <circle cx={rect.x - 32} cy={rect.cy} r={10} />
                  <text x={rect.x - 32} y={rect.cy} textAnchor="middle">+</text>
                </g>
              )}
            </g>
          )}
        </g>
      );
    })}

    {/* Decision 드래그 후 Yes/No 팝업 */}
    {conditionPopup && (
      <g>
        <rect x={conditionPopup.x - 60} y={conditionPopup.y - 16} width={120} height={32} rx={8} />
        <g onClick={() => { onAddEdge(from, to, "yes"); setConditionPopup(null); }}>
          <rect ... /><text fill="#4ade80">Yes</text>
        </g>
        <g onClick={() => { onAddEdge(from, to, "no"); setConditionPopup(null); }}>
          <rect ... /><text fill="#f87171">No</text>
        </g>
      </g>
    )}
  </svg>
</div>
```

---

## 5. 드래그 연결 (Drag-to-Connect)

```typescript
// ● onMouseDown → drag 시작
const handleConnectStart = (e: React.MouseEvent, fromNodeId: string) => {
  e.stopPropagation();
  e.preventDefault();
  const { x, y } = clientToSvg(e.clientX, e.clientY);
  setDragState({ fromNodeId, mouseX: x, mouseY: y });
};

// SVG onMouseMove → 미리보기 선 업데이트
const handleMouseMove = (e: React.MouseEvent) => {
  if (!dragState) return;
  const { x, y } = clientToSvg(e.clientX, e.clientY);
  setDragState(d => d ? { ...d, mouseX: x, mouseY: y } : null);
};

// 타겟 노드의 hit zone onMouseUp → 엣지 생성
const handleMouseUp = (e: React.MouseEvent, toNodeId?: string) => {
  if (!dragState) return;
  e.stopPropagation();
  if (toNodeId && toNodeId !== dragState.fromNodeId) {
    const fromNode = nodeMap.get(dragState.fromNodeId);
    if (fromNode?.type === "decision") {
      // Yes/No 팝업 표시
      setConditionPopup({ from: dragState.fromNodeId, to: toNodeId, x, y });
    } else {
      onAddEdge?.(dragState.fromNodeId, toNodeId);
    }
  }
  setDragState(null);
};

// SVG 좌표 변환 (CSS transform/zoom 보정)
const clientToSvg = (clientX: number, clientY: number) => {
  const pt = svgRef.current!.createSVGPoint();
  pt.x = clientX; pt.y = clientY;
  return pt.matrixTransform(svgRef.current!.getScreenCTM()!.inverse());
  // ↑ getScreenCTM().inverse() — zoom/pan CSS transform까지 자동 보정
};
```

---

## 6. 엣지 Key 규칙

```typescript
// __ 더블 언더스코어 사용 — 노드 ID에 - 가 포함될 수 있어서
export function edgeKey(from: string, to: string) {
  return `${from}__${to}`;
}

export function parseEdgeKey(key: string): { from: string; to: string } {
  const idx = key.indexOf("__");
  return { from: key.slice(0, idx), to: key.slice(idx + 2) };
}

// 중복 엣지 방지
function hasDuplicateEdge(edges: FlowEdge[], from: string, to: string) {
  return edges.some(e => e.from === from && e.to === to);
}
```

---

## 7. Undo / Redo

```typescript
const MAX_HISTORY = 20;
const history = useRef<FlowchartData[]>([]);
const historyIdx = useRef(-1);

// 모든 데이터 변경 시 호출
const handleDataChange = useCallback((newData: FlowchartData, skipHistory = false) => {
  setData(newData);
  if (!skipHistory) {
    // 현재 위치 이후 redo 스택 날리고 새 상태 push
    const trimmed = history.current.slice(0, historyIdx.current + 1);
    history.current = [...trimmed, newData].slice(-MAX_HISTORY);
    historyIdx.current = history.current.length - 1;
  }
  // debounce Supabase 저장
  saveTimerRef.current = setTimeout(() => save(newData), 1000);
}, []);

const undo = () => {
  if (historyIdx.current <= 0) return;
  historyIdx.current -= 1;
  setData(history.current[historyIdx.current]);
};

const redo = () => {
  if (historyIdx.current >= history.current.length - 1) return;
  historyIdx.current += 1;
  setData(history.current[historyIdx.current]);
};

// 키보드
useEffect(() => {
  const handler = (e: KeyboardEvent) => {
    const meta = e.metaKey || e.ctrlKey;
    if (meta && e.key === "z" && !e.shiftKey) { e.preventDefault(); undo(); }
    if (meta && e.key === "z" && e.shiftKey)  { e.preventDefault(); redo(); }
  };
  window.addEventListener("keydown", handler);
  return () => window.removeEventListener("keydown", handler);
}, [undo, redo]);
```

---

## 8. Zoom / Pan

```typescript
const ZOOM_MIN = 0.25;
const ZOOM_MAX = 2.0;
const ZOOM_STEP = 0.1;

const [zoom, setZoom] = useState(1);
const [pan, setPan] = useState({ x: 0, y: 0 });
const isPanning = useRef(false);
const panStart = useRef({ x: 0, y: 0 });
const panOrigin = useRef({ x: 0, y: 0 });

// Ctrl+스크롤 → 줌
const handleWheel = (e: React.WheelEvent) => {
  if (!e.ctrlKey && !e.metaKey) return;
  e.preventDefault();
  const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
  setZoom(z => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN,
    parseFloat((z + delta).toFixed(2))
  )));
};

// 빈 영역 드래그 → 패닝
const handlePanMouseDown = (e: React.MouseEvent) => {
  // SVG 배경 or 캔버스 컨테이너 클릭만
  if (e.button === 0 && e.target !== canvasContainerRef.current && (e.target as Element).tagName !== "svg") return;
  isPanning.current = true;
  panStart.current = { x: e.clientX, y: e.clientY };
  panOrigin.current = { ...pan };
  e.preventDefault();
};

const handlePanMouseMove = (e: React.MouseEvent) => {
  if (!isPanning.current) return;
  setPan({
    x: panOrigin.current.x + (e.clientX - panStart.current.x),
    y: panOrigin.current.y + (e.clientY - panStart.current.y),
  });
};

// JSX에서 CSS transform 적용
<div
  style={{
    position: "absolute", top: 0, left: 0,
    transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
    transformOrigin: "0 0",
  }}
>
  <FlowchartCanvas ... />
</div>
```

---

## 9. 노드 추가 로직

```typescript
// ＋ 오른쪽: 다음 step에 노드 추가 + 엣지 자동 연결
const handleAddNodeRight = (signal: string) => {
  if (signal.endsWith("__insertBefore")) {
    // Step 삽입: 해당 step 이상 모든 노드 step +1 shift
    const nodeId = signal.replace("__insertBefore", "");
    const node = data.nodes.find(n => n.id === nodeId);
    const insertAt = node.step;
    const shiftedNodes = data.nodes.map(n =>
      n.step >= insertAt ? { ...n, step: n.step + 1 } : n
    );
    const newNode = { id: generateId(data.nodes), label: "새 화면", type: "screen", step: insertAt, track: node.track };
    handleDataChange({ ...data, nodes: [...shiftedNodes, newNode] });
  } else {
    // 다음 step에 추가
    const fromNode = data.nodes.find(n => n.id === signal);
    const newNode = { id: generateId(data.nodes), label: "새 화면", type: "screen", step: fromNode.step + 1, track: fromNode.track };
    handleDataChange({ ...data,
      nodes: [...data.nodes, newNode],
      edges: [...data.edges, { from: fromNode.id, to: newNode.id }],
    });
  }
};

// ＋ 아래: 같은 step 최하단 track + 1
const handleAddNodeBelow = (fromNodeId: string) => {
  const fromNode = data.nodes.find(n => n.id === fromNodeId);
  const maxTrackAtStep = Math.max(0, ...data.nodes.filter(n => n.step === fromNode.step).map(n => n.track));
  const newNode = { id: generateId(data.nodes), label: "새 화면", type: "screen", step: fromNode.step, track: maxTrackAtStep + 1 };
  handleDataChange({ ...data,
    nodes: [...data.nodes, newNode],
    edges: [...data.edges, { from: fromNode.id, to: newNode.id }],
  });
};

// ID 생성 (중복 없는 번호)
function generateId(nodes: FlowNode[], prefix = "node") {
  let i = 1;
  const ids = new Set(nodes.map(n => n.id));
  while (ids.has(`${prefix}-${i}`)) i++;
  return `${prefix}-${i}`;
}
```

---

## 10. 노드 삭제 로직

```typescript
type DeleteNodeMode = "cascade" | "edges-only" | "bridge";

const confirmDeleteNode = (mode: DeleteNodeMode) => {
  const id = deleteNodeTarget.id;
  const incoming = data.edges.filter(e => e.to === id);
  const outgoing = data.edges.filter(e => e.from === id);

  let newNodes = data.nodes.filter(n => n.id !== id);
  let newEdges = data.edges.filter(e => e.from !== id && e.to !== id);

  if (mode === "bridge" && incoming.length === 1 && outgoing.length === 1) {
    // 앞뒤 노드 직접 연결
    newEdges = [...newEdges, { from: incoming[0].from, to: outgoing[0].to }];

  } else if (mode === "cascade") {
    // BFS로 하위 분기 전부 수집
    const toDelete = new Set([id]);
    const queue = outgoing.map(e => e.to);
    while (queue.length > 0) {
      const curr = queue.shift()!;
      if (toDelete.has(curr)) continue;
      toDelete.add(curr);
      data.edges.filter(e => e.from === curr).forEach(e => queue.push(e.to));
    }
    newNodes = data.nodes.filter(n => !toDelete.has(n.id));
    newEdges = data.edges.filter(e => !toDelete.has(e.from) && !toDelete.has(e.to));
  }
  // "edges-only": newNodes/newEdges already filtered above

  handleDataChange({ ...data, nodes: newNodes, edges: newEdges });
};

// 삭제 조건별 모달 분기
// isLinear (in:1, out:1) → bridge 옵션 제공
// isJunction (out > 1) → cascade 옵션 제공
// start 노드 → 삭제 차단
// 연결 없는 노드 → 모달 없이 바로 삭제
```

---

## 11. 멀티 선택

```typescript
// Shift+클릭 → selectedNodeIds 배열 관리
onClick={(id) => {
  if (isShiftHeld) {
    setSelectedNodeIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  } else {
    setSelectedNodeId(id);
    setSelectedNodeIds([id]);
  }
}}

// Step/Track delta 이동 (min 0 보장)
const handleStepDelta = (delta: number) => {
  handleDataChange({
    ...data,
    nodes: data.nodes.map(n =>
      selectedNodeIds.includes(n.id)
        ? { ...n, step: Math.max(0, n.step + delta) }
        : n
    ),
  });
};
```

---

## 12. 파일 폴링 (Claude Code ↔ 브라우저 연동)

```typescript
// Claude Code가 public/flowchart-current.json을 덮어쓰면 브라우저에서 자동 감지
useEffect(() => {
  const poll = async () => {
    const res = await fetch(`/flowchart-current.json?t=${Date.now()}`);  // 캐시 방지
    if (!res.ok) return;
    const raw = await res.text();
    if (raw === prevFileRef.current) return;  // 변경 없으면 무시
    prevFileRef.current = raw;
    const parsed = JSON.parse(raw) as FlowchartData;
    if (!parsed.nodes || parsed.nodes.length === 0) return;
    setData(parsed);
    // debounce Supabase 저장
    saveTimerRef.current = setTimeout(() => scheduleAutoSave(parsed), 1200);
  };
  const id = setInterval(poll, 2000);
  poll();
  return () => clearInterval(id);
}, [activeId]);

// public/flowchart-current.json 예시
{
  "nodes": [
    { "id": "start", "label": "시작", "type": "start", "step": 0, "track": 0 },
    { "id": "home", "label": "홈", "type": "screen", "step": 1, "track": 0 }
  ],
  "edges": [
    { "from": "start", "to": "home" }
  ],
  "edge_cases": [],
  "missing_cases": []
}
```

---

## 13. 레이아웃 구조 (3패널)

```
┌─────────────────────────────────────────────────────┐
│  Header (52px) — 세션명 / Zoom / Undo+Redo / 버튼   │
├──────────┬──────────────────────────┬───────────────┤
│          │                          │               │
│ Sidebar  │   Canvas (zoom+pan)      │  Properties   │
│ 200px    │   ─ FlowchartCanvas      │  252px        │
│          │   ─ 줌 transform wrapper  │               │
│ 세션 목록│                          │ 노드/엣지 편집│
│ 검색     │                          │ 멀티선택 패널 │
│          ├──────────────────────────┤               │
│          │ Edge Cases / Missing     │               │
│          │ Cases (하단 inline 편집) │               │
└──────────┴──────────────────────────┴───────────────┘
```

---

## 14. 디자인 토큰 (다크 테마)

```typescript
const C = {
  bg:           "#0a0a0f",
  sidebar:      "#0d0d13",
  panel:        "#0d0d13",
  surface:      "#13131e",
  surfaceHover: "#18182a",
  border:       "rgba(255,255,255,0.06)",
  borderMid:    "rgba(255,255,255,0.1)",
  accent:       "#df4d18",   // 주 액션 색상
  accentBg:     "rgba(223,77,24,0.12)",
  text:         "rgba(255,255,255,0.88)",
  textMid:      "rgba(255,255,255,0.5)",
  textDim:      "rgba(255,255,255,0.28)",
  textMute:     "rgba(255,255,255,0.14)",
  yes:          "#4ade80",   // decision yes 엣지
  no:           "#f87171",   // decision no 엣지
};
```

---

## 15. Supabase 테이블 스키마 (참고)

```sql
create table tool_flowcharts (
  id         uuid primary key default gen_random_uuid(),
  title      text not null default 'Untitled',
  data       jsonb not null default '{"nodes":[],"edges":[],"edge_cases":[],"missing_cases":[]}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS: 인증 없이 read/write 가능 (내부 툴)
alter table tool_flowcharts enable row level security;
create policy "tool_flowcharts_all" on tool_flowcharts for all using (true);
```

---

## 16. 핵심 패턴 요약 (가장 중요한 것들)

| 패턴 | 이유 |
|---|---|
| `<g> onMouseEnter/Leave` + 큰 투명 rect | SVG mouseleave는 같은 g의 형제 이동 시 발동 안 함 → hover zone 확장 가능 |
| `edgeKey = ${from}__${to}` | 노드 ID에 `-` 포함될 수 있어 싱글 대시로는 파싱 불가 |
| `svg.getScreenCTM().inverse()` | CSS zoom/pan transform이 걸려있어도 SVG 좌표 정확히 변환 |
| `history` ref (not state) | Undo 스택이 state면 매번 리렌더 → ref로 사이드이펙트 없이 관리 |
| `transformOrigin: "0 0"` | zoom scale이 캔버스 좌상단 기준으로 확대되어야 패닝과 자연스럽게 조합됨 |
| `skipHistory` param | 파일 폴링으로 데이터 들어올 때 undo 스택에 쌓이면 안 됨 |
| `__insertBefore` suffix signal | Canvas → Page 간 "step 삽입" 신호를 onAddNodeRight 콜백 하나로 처리 |
