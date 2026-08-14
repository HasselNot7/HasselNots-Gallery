export default function AnimatedBackground() {
  return (
    <>
      <div className="fixed inset-0 pointer-events-none" aria-hidden="true" style={{ zIndex: -1 }}>
        <div className="absolute inset-0" style={{ background: "#c5ebd4", opacity: 0.15 }} />
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(to right, rgba(45,79,62,0.1) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(45,79,62,0.1) 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
          opacity: 0.12,
        }} />
      </div>
    </>
  );
}
