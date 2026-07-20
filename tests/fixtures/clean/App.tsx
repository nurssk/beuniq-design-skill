export function App() {
  return (
    <main className="min-h-screen bg-white text-slate-950">
      <section className="mx-auto grid max-w-5xl grid-cols-[1.1fr_0.9fr] gap-10 px-6 py-14">
        <div>
          <h1 className="text-4xl font-semibold">Review checkout risk before release</h1>
          <p className="mt-4 max-w-xl text-base text-slate-700">
            BeUniq compares source changes against product UI rules and shows the exact files that need attention.
          </p>
          <a href="/docs" className="mt-6 inline-flex rounded-lg bg-slate-950 px-5 py-3 text-white">
            Read docs
          </a>
        </div>
        <aside className="rounded-lg border border-slate-200 p-6 shadow-sm">
          <h2 className="text-lg font-medium">Release checklist</h2>
          <ul className="mt-4 space-y-2 text-sm text-slate-700">
            <li>Design score passed</li>
            <li>Copy reviewed</li>
            <li>Accessibility labels present</li>
          </ul>
        </aside>
      </section>
      <img src="/hero.png" alt="BeUniq report preview" />
      <button aria-label="Open navigation" className="rounded-lg p-3">
        <svg />
      </button>
    </main>
  );
}
