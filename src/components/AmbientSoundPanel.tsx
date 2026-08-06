import { useStore, AmbientSoundKind } from '../store/useStore';

const SOUND_OPTIONS: Array<{ value: AmbientSoundKind; label: string; icon: string; description: string }> = [
  {
    value: 'off',
    label: 'Off',
    icon: '🔇',
    description: 'No ambient sound',
  },
  {
    value: 'rain',
    label: 'Rain',
    icon: '🌧️',
    description: 'Steady rainfall for sustained focus',
  },
  {
    value: 'forest',
    label: 'Forest',
    icon: '🌲',
    description: 'Wind in the trees — softer, breathing rhythm',
  },
  {
    value: 'whiteNoise',
    label: 'White noise',
    icon: '🔊',
    description: 'Broadband noise for masking chatter',
  },
];

/**
 * AmbientSoundPanel
 * -----------------
 * Inline controls for the ambient sound scheduler. Renders inside the
 * TimerPanel so the user picks a sound next to the start/stop controls.
 *
 * Behaviour matches the issue #56 requirements:
 *   - 3 sound kinds (Rain / Forest / White noise) + Off
 *   - 0–100 volume slider
 *   - "Auto-start with timer" toggle
 *   - Remembers last selection in localStorage (handled by the store)
 */
export function AmbientSoundPanel() {
  const ambient = useStore((s) => s.ambient);
  const setAmbientKind = useStore((s) => s.setAmbientKind);
  const setAmbientVolume = useStore((s) => s.setAmbientVolume);
  const setAmbientAutoStart = useStore((s) => s.setAmbientAutoStart);

  return (
    <div
      className="metal-panel w-full max-w-md rounded-2xl border border-cyan-500/15 bg-slate-900/40 p-4 text-left"
      aria-label="Ambient sound scheduler"
    >
      <div className="mb-3 flex items-center justify-between">
        <p className="section-label text-xs font-semibold uppercase tracking-wider text-cyan-300">
          Ambient sound
        </p>
        <span className="text-xs text-cyan-400/70" aria-live="polite">
          {ambient.kind === 'off' ? 'Muted' : `${SOUND_OPTIONS.find((o) => o.value === ambient.kind)?.label} • ${ambient.volume}%`}
        </span>
      </div>

      <div
        role="radiogroup"
        aria-label="Ambient sound type"
        className="grid grid-cols-4 gap-2"
      >
        {SOUND_OPTIONS.map((option) => {
          const active = ambient.kind === option.value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setAmbientKind(option.value)}
              title={option.description}
              className={`flex flex-col items-center justify-center gap-1 rounded-xl border px-2 py-2 text-xs transition-all duration-200 ${
                active
                  ? 'border-cyan-400 bg-cyan-500/15 text-cyan-200 shadow-[0_0_10px_rgba(34,211,238,0.25)]'
                  : 'border-slate-700 bg-slate-900/30 text-slate-300 hover:border-cyan-500/40 hover:text-cyan-200'
              }`}
            >
              <span className="text-lg leading-none" aria-hidden="true">
                {option.icon}
              </span>
              <span className="font-medium leading-tight">{option.label}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-4 space-y-3">
        <div>
          <label
            htmlFor="ambient-volume"
            className="mb-1 flex items-center justify-between text-xs text-cyan-300/80"
          >
            <span>Volume</span>
            <span className="font-mono text-cyan-200">{ambient.volume}%</span>
          </label>
          <input
            id="ambient-volume"
            type="range"
            min={0}
            max={100}
            step={1}
            value={ambient.volume}
            onChange={(e) => setAmbientVolume(Number(e.target.value))}
            disabled={ambient.kind === 'off'}
            className="ambient-volume-slider w-full accent-cyan-400 disabled:opacity-40"
            aria-label="Ambient sound volume"
          />
        </div>

        <label className="flex cursor-pointer items-center justify-between gap-3 text-xs text-cyan-200">
          <span className="flex-1">
            Auto-start with timer
            <span className="mt-0.5 block text-[10px] font-normal text-cyan-400/70">
              Plays the selected sound whenever you start a study session.
            </span>
          </span>
          <span className="relative inline-flex shrink-0">
            <input
              type="checkbox"
              checked={ambient.autoStart}
              onChange={(e) => setAmbientAutoStart(e.target.checked)}
              className="peer sr-only"
              aria-label="Auto-start with timer"
            />
            <span
              className={`block h-5 w-9 rounded-full transition-colors duration-200 ${
                ambient.autoStart ? 'bg-cyan-400' : 'bg-slate-600'
              } peer-focus-visible:ring-2 peer-focus-visible:ring-cyan-400 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-slate-900`}
            />
            <span
              className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 ${
                ambient.autoStart ? 'translate-x-4' : ''
              }`}
            />
          </span>
        </label>
      </div>
    </div>
  );
}
