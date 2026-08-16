import BackgroundMusic from "./components/BackgroundMusic";

function App() {
  return (
    <main className="hero min-h-screen bg-[#140d09] text-white">
      {/* ==============================
          YOUR HOME PAGE
      ============================== */}

      <section className="relative min-h-screen">
        <header className="px-6 py-6">
          <h1 className="text-2xl font-bold">Arijit Singh</h1>
        </header>

        <div className="flex min-h-[80vh] items-center justify-center">
          <div className="text-center">
            <p className="mb-3 text-sm uppercase tracking-[0.3em] text-amber-300">
              Welcome
            </p>

            <h2 className="text-5xl font-bold sm:text-7xl">Music</h2>

            <p className="mx-auto mt-5 max-w-lg text-white/60">
              Listen to your favorite Arijit Singh songs while exploring the
              website.
            </p>
          </div>
        </div>
      </section>

      {/* ==============================
          BACKGROUND MUSIC

          KEEP THIS HERE
      ============================== */}

      <BackgroundMusic />
    </main>
  );
}

export default App;
