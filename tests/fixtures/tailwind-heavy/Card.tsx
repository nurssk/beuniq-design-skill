export function CardGrid() {
  const cards = ["Audit", "Fix", "Verify"];
  return (
    <section className="grid gap-4 p-8">
      {cards.map((card) => (
        <article key={card} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">{card}</h2>
          <p className="mt-2 text-sm text-slate-600">Rule-based checks with stable evidence.</p>
        </article>
      ))}
    </section>
  );
}
