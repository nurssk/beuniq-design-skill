export function Dashboard() {
  return (
    <main className="grid min-h-screen grid-cols-[240px_1fr] bg-slate-50 text-slate-950">
      <nav className="border-r bg-white p-5">
        <a href="/dashboard" className="block rounded-lg px-3 py-2 font-medium">Dashboard</a>
      </nav>
      <section className="p-8">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Orders</h1>
          <button className="rounded-lg bg-slate-950 px-4 py-2 text-white">Export</button>
        </header>
        <table className="mt-6 w-full border-collapse bg-white text-sm">
          <thead>
            <tr>
              <th className="border p-3 text-left">Order</th>
              <th className="border p-3 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border p-3">#1042</td>
              <td className="border p-3">Paid</td>
            </tr>
          </tbody>
        </table>
      </section>
    </main>
  );
}
