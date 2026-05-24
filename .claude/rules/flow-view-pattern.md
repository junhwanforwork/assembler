# Flow View — Zero-dependency React Flow Chart

React + Tailwind CSS만으로 구현한 플로우 다이어그램 패턴.  
별도 라이브러리 없음 (React Flow, D3, Cytoscape 불필요).

---

## 핵심 원리

```
┌─────────────────────────────────────────────────┐
│  div (position: relative)  ← 캔버스 컨테이너    │
│  ├── svg (position: absolute, inset: 0)          │
│  │   ├── <path>  ← 엣지 (cubic bezier)          │
│  │   └── <polygon>  ← 화살표                    │
│  └── div (position: absolute, left/top)          │
│       └── 노드 카드 × N                          │
└─────────────────────────────────────────────────┘
```

SVG는 노드 아래에 깔고 `pointerEvents: none` 처리.  
노드는 `absolute` div로 픽셀 좌표 직접 지정.

---

## 데이터 구조

```ts
// 노드 위치 (픽셀, top-left 기준)
const POSITIONS: Record<string, { x: number; y: number }> = {
  home: { x: 40, y: 178 },
  features: { x: 320, y: 40 },
  plan: { x: 600, y: 178 },
};

// 엣지 연결
const EDGES = [
  { from: "home", to: "features" },
  { from: "home", to: "plan" },
  { from: "features", to: "plan" },
];

// 캔버스 크기
const CANVAS_W = 800;
const CANVAS_H = 360;
const CARD_W = 160;
const CARD_H = 44;
```

---

## 엣지 — Cubic Bezier Path

```tsx
function edgePath(fromId: string, toId: string) {
  const x1 = POSITIONS[fromId].x + CARD_W; // 출발: 오른쪽 중앙
  const y1 = POSITIONS[fromId].y + CARD_H / 2;
  const x2 = POSITIONS[toId].x; // 도착: 왼쪽 중앙
  const y2 = POSITIONS[toId].y + CARD_H / 2;
  const dx = (x2 - x1) * 0.45; // control point 거리 (45%)
  return `M ${x1} ${y1} C ${x1 + dx} ${y1} ${x2 - dx} ${y2} ${x2} ${y2}`;
}
```

- `dx = 거리 * 0.45` → 자연스러운 S자 곡선
- control point를 수평 방향으로만 움직이면 왼→오른쪽 흐름에 적합
- 대각선 엣지도 깔끔하게 처리됨

---

## 화살표 — SVG Polygon

```tsx
// 도착 노드의 왼쪽 중앙에 삼각형
<polygon
  points={`${x2},${y2} ${x2 - 8},${y2 - 4} ${x2 - 8},${y2 + 4}`}
  fill="rgba(255,255,255,0.15)"
/>
```

---

## 전체 렌더 구조

```tsx
const CANVAS_STYLE = { width: CANVAS_W, height: CANVAS_H, position: "relative" as const };

export function FlowView() {
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <div style={CANVAS_STYLE}>
      {/* Layer 1: 엣지 (SVG) */}
      <svg
        width={CANVAS_W}
        height={CANVAS_H}
        style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
      >
        {EDGES.map(({ from, to }) => {
          const active = hovered === from || hovered === to;
          return (
            <g key={`${from}-${to}`}>
              <path
                d={edgePath(from, to)}
                fill="none"
                stroke={active ? "#df4d18" : "rgba(255,255,255,0.12)"}
                strokeWidth={active ? 1.5 : 1}
                strokeDasharray={active ? undefined : "4 3"}
              />
              {/* 화살표 */}
              <polygon
                points={arrowPoints(to)}
                fill={active ? "#df4d18" : "rgba(255,255,255,0.15)"}
              />
            </g>
          );
        })}
      </svg>

      {/* Layer 2: 노드 */}
      {NODES.map((node) => {
        const pos = POSITIONS[node.id];
        return (
          <div
            key={node.id}
            onMouseEnter={() => setHovered(node.id)}
            onMouseLeave={() => setHovered(null)}
            style={{
              position: "absolute",
              left: pos.x,
              top: pos.y,
              width: CARD_W,
              height: CARD_H,
            }}
            className="flex items-center gap-2 px-3 rounded-xl border bg-[#111115]
                       border-white/10 hover:border-white/30 transition-all cursor-pointer"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-sm text-white">{node.label}</span>
          </div>
        );
      })}
    </div>
  );
}
```

---

## Hover 강조 패턴

```tsx
// 연결된 노드 + 엣지를 같이 강조
const active = hovered === from || hovered === to

stroke={active ? '#df4d18' : 'rgba(255,255,255,0.12)'}
strokeWidth={active ? 1.5 : 1}
strokeDasharray={active ? undefined : '4 3'}  // 기본: 점선, hover: 실선
```

---

## 레이아웃 설계 팁

| 상황                  | 권장 배치                                  |
| --------------------- | ------------------------------------------ |
| 왼→오른쪽 선형 흐름   | col 단위로 x 좌표 균등 분배                |
| 한 노드에서 여러 갈래 | 목적지 y를 균등 분산                       |
| 중앙 정렬 노드        | `y = (min_y + max_y) / 2 - CARD_H / 2`     |
| 그룹 레이블           | `position: absolute`, `top: CANVAS_H + 16` |

```ts
// 예: 4개 노드를 세로로 균등 배치
const NODE_IDS = ["a", "b", "c", "d"];
const V_GAP = 20;
NODE_IDS.forEach((id, i) => {
  POSITIONS[id] = { x: 320, y: 40 + i * (CARD_H + V_GAP) };
});
```

---

## 화살표 방향 규칙

화살표는 항상 **도착 노드의 왼쪽 중앙**에 붙는 삼각형.  
"엣지가 왼→오른쪽으로 흐른다"는 전제를 시각적으로 강제함.

```
출발 노드                    도착 노드
┌──────────┐                ◀┌──────────┐
│  from    │ ─────────────── │  to      │
└──────────┘    cubic bezier └──────────┘
 오른쪽 중앙에서 출발         왼쪽 중앙에 화살표
```

```ts
// 출발점: 노드 오른쪽 중앙
const x1 = POSITIONS[from].x + CARD_W;
const y1 = POSITIONS[from].y + CARD_H / 2;

// 도착점: 노드 왼쪽 중앙
const x2 = POSITIONS[to].x;
const y2 = POSITIONS[to].y + CARD_H / 2;

// 화살표 삼각형 (x2, y2 기준 왼쪽으로 8px)
// points: "tip, top-left, bottom-left"
const arrowPoints = `${x2},${y2} ${x2 - 8},${y2 - 4} ${x2 - 8},${y2 + 4}`;
```

### 방향이 바뀌는 경우

| 흐름 방향        | 출발점           | 도착점           | 화살표 위치      |
| ---------------- | ---------------- | ---------------- | ---------------- |
| 왼→오른 (기본)   | 노드 오른쪽 중앙 | 노드 왼쪽 중앙   | 도착 노드 왼쪽   |
| 위→아래          | 노드 아래 중앙   | 노드 위 중앙     | 도착 노드 위     |
| 오른→왼 (역방향) | 노드 왼쪽 중앙   | 노드 오른쪽 중앙 | 도착 노드 오른쪽 |

```ts
// 위→아래 화살표
const arrowPointsDown = `${cx},${y2} ${cx - 4},${y2 - 8} ${cx + 4},${y2 - 8}`;

// 오른→왼 역방향 화살표
const arrowPointsLeft = `${x2 + CARD_W},${y2} ${x2 + CARD_W + 8},${y2 - 4} ${x2 + CARD_W + 8},${y2 + 4}`;
```

### Control Point 방향도 맞춰야 함

흐름 방향이 바뀌면 cubic bezier의 control point도 같이 바꿔야 자연스러운 곡선이 나옴.

```ts
// 왼→오른: control point를 수평으로
`M ${x1} ${y1} C ${x1 + dx} ${y1} ${x2 - dx} ${y2} ${x2} ${y2}`
// 위→아래: control point를 수직으로
`M ${x1} ${y1} C ${x1} ${y1 + dy} ${x2} ${y2 - dy} ${x2} ${y2}`;
```

---

## 선 스타일 — stroke 속성

```tsx
<path
  d={edgePath(from, to)}
  fill="none"
  stroke={active ? "#df4d18" : "rgba(255,255,255,0.12)"} // 색상
  strokeWidth={active ? 1.5 : 1} // 굵기
  strokeDasharray={active ? undefined : "4 3"} // 점선 패턴
/>
```

### strokeDasharray 규칙

```
"4 3"   →  ████ ···  ████ ···    선 4px, 공백 3px
"6 2"   →  ██████ ·· ██████ ··  선 6px, 공백 2px (여유로운 점선)
"2 4"   →  ·· ···· ·· ····       촘촘한 점선
없음    →  ──────────────────    실선
```

### 상태별 조합

| 상태  | stroke                   | strokeWidth | strokeDasharray | 의미        |
| ----- | ------------------------ | ----------- | --------------- | ----------- |
| 기본  | `rgba(255,255,255,0.12)` | `1`         | `"4 3"`         | 비활성 연결 |
| hover | `#df4d18`                | `1.5`       | 없음            | 활성 강조   |

hover 시 **점선 → 실선** 전환이 "활성화" 느낌을 줌.  
굵기도 1 → 1.5로 올려서 강조 효과를 더함.

```tsx
// 커스텀 예시
strokeWidth={2}          // 더 굵게
strokeDasharray="8 4"    // 더 긴 점선
strokeOpacity={0.4}      // 투명도 별도 조절 (stroke 색상과 별개)
```

---

## 의존성

```
React       ✓ (useState)
Tailwind    ✓ (카드 스타일)
SVG         ✓ (브라우저 내장)
```

추가 패키지 없음. Vanilla React + Tailwind 환경이면 어디든 그대로 이식 가능.

---

## 드래그/줌이 필요한 경우

이 패턴으로 커버 안 되면 그때 라이브러리 도입 검토:

| 라이브러리                   | 적합한 상황                   |
| ---------------------------- | ----------------------------- |
| `@xyflow/react` (React Flow) | 드래그 이동, 줌, 노드 편집    |
| `d3-force`                   | 자동 레이아웃, 물리 기반 배치 |
| `elkjs`                      | 계층형 자동 라우팅            |
