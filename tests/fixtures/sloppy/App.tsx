export function App() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-500 via-blue-500 to-cyan-400 py-32 text-center">
      <section className="mx-auto flex max-w-5xl flex-col items-center justify-center gap-8 rounded-3xl border border-white/20 bg-white/40 p-16 text-center shadow-2xl shadow-purple-500/40 backdrop-blur-xl">
        <p className="eyebrow uppercase tracking-widest text-white/80">NEXT-GENERATION CLARITY</p>
        <h1 className="bg-gradient-to-r from-white to-cyan-100 bg-clip-text text-6xl font-bold text-transparent">
          Unlock seamless workflows with effortless precision
        </h1>
        <p className="max-w-2xl text-center text-lg text-white">
          Designed to help teams transform the way they ship powerful experiences without the hassle.
        </p>
        <a href="#" className="rounded-full bg-white px-12 py-6 shadow-xl">Get started</a>
      </section>
      <section className="mx-auto grid max-w-5xl grid-cols-3 gap-6 py-24">
        <article className="card rounded-2xl border bg-white/50 p-12 shadow-xl">Powerful analytics</article>
        <article className="card rounded-2xl border bg-white/50 p-12 shadow-xl">Powerful analytics</article>
        <article className="card rounded-2xl border bg-white/50 p-12 shadow-xl">Powerful analytics</article>
      </section>
      <div className="fake-chart">
        <div className="chart-bar h-8 w-20 rounded-full bg-white/50" />
      </div>
      <button className="rounded-full p-4 shadow-cyan-500/50">
        <svg />
      </button>
      <img src="/hero.png" />
    </main>
  );
}
