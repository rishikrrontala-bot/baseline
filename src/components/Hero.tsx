import Aperture from './Aperture';

export default function Hero({ onEnter }: { onEnter: () => void }) {
  return (
    <section
      className="gutter relative flex w-full flex-col justify-between pb-[clamp(22px,3.5vh,40px)] pt-[clamp(72px,10vh,112px)]"
      style={{ minHeight: 'calc(var(--vh, 1vh) * 100)' }}
    >
      {/* ── The claim, set wide ──────────────────────────────────────────── */}
      <div>
        <h1 className="t-display" style={{ fontSize: 'clamp(44px, 7.3vw, 116px)' }}>
          <span className="line-mask">
            <span className="word">A concussion hides.</span>
          </span>
          <span className="line-mask">
            <span className="word">
              Your eyes <em className="t-display-it">don’t</em>.
            </span>
          </span>
        </h1>
      </div>

      {/* ── The reason, with the instrument alongside ─────────────────────── */}
      <div className="mt-[clamp(28px,5vh,56px)] grid grid-cols-1 items-center gap-y-10 md:grid-cols-[1fr_auto] md:gap-x-[5vw]">
        <div className="max-w-[44ch]">
          <p className="t-lead text-ink">
            Symptoms are self-reported, and people under-report them to get back on the field, back in
            class, back to normal. Eye movement is harder to talk yourself out of.
          </p>

          <button type="button" onClick={onEnter} className="group mt-9 flex items-center gap-4">
            <span className="t-action text-ink transition-opacity duration-500 group-hover:opacity-60">
              Begin screening
            </span>
            <span className="grid h-12 w-12 place-items-center rounded-full border border-[var(--line-strong)] transition-colors duration-500 group-hover:border-terra group-hover:bg-terra">
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
                <path
                  d="M1 12L12 1M12 1H4M12 1v8"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  className="transition-colors duration-500 group-hover:stroke-paper"
                />
              </svg>
            </span>
          </button>
        </div>

        <div className="flex items-center justify-center text-ink md:justify-end">
          <Aperture className="aspect-square w-[min(62vw,clamp(200px,26vw,320px))]" />
        </div>
      </div>

      {/* ── The ledger ───────────────────────────────────────────────────── */}
      <div className="mt-[clamp(30px,5vh,60px)]">
        <p className="t-mono mb-4 text-ash">
          Vestibular &amp; ocular-motor screening — Baseline v0.1
        </p>
        <div className="rule mb-6 text-ink" />
        <div className="grid grid-cols-1 gap-x-[5vw] gap-y-7 lg:grid-cols-[1fr_auto] lg:items-start">
          <p className="t-body max-w-[58ch]">
            Baseline runs a seven-task screening adapted from VOMS in your browser. The camera feed is
            read by a model on your own machine and discarded frame by frame. There is no account, no
            upload, and no server that could leak it, because there is no server.
          </p>

          <dl className="t-mono grid grid-cols-2 gap-x-8 gap-y-4 text-ash sm:grid-cols-4 lg:gap-x-10">
            {[
              ['Runs on', 'Your device'],
              ['Frames sent', 'Zero'],
              ['Duration', '~6 min'],
              ['Replaces a clinician', 'No'],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="opacity-60">{k}</dt>
                <dd className="mt-1 text-ink">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
