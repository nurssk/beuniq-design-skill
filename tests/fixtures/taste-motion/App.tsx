export default function App() {
  return (
    <main>
      <button className="transition-all duration-700 ease-in">
        Save changes
      </button>
      <div className="popover origin-center scale-0 transition-all duration-500 ease-in">
        Menu
      </div>
      <div className="toast animate-toast" />
    </main>
  );
}
