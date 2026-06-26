// 백지 리셋(C) 후 임시 홈 — 새 기조·디자인이 정해지면 여기서부터 다시 짓는다.
export default function Home() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        padding: 24,
        textAlign: "center",
      }}
    >
      <h1 style={{ fontSize: 28, fontWeight: 600, margin: 0, letterSpacing: "-0.01em" }}>Assembler</h1>
      <p style={{ fontSize: 15, color: "var(--muted)", margin: 0 }}>백지에서 다시 시작합니다.</p>
    </main>
  )
}
