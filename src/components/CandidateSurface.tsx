import type { Candidate } from '@/types';

/**
 * The single read-only screen: a ranked list of markdown candidates, one row
 * each, in the order given. Rows are real list items (semantic structure, not
 * div soup). All candidate text is rendered as text content — React escapes it,
 * so markup-like characters in a name or explanation appear literally and can't
 * inject markup.
 */
export function CandidateSurface({ candidates }: { candidates: Candidate[] }) {
  return (
    <section className="mx-auto max-w-3xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight">Markdown candidates</h1>
        <p className="text-sm text-neutral-400">
          Ranked by urgency. Each row is the engine's read — the decision stays with you.
        </p>
      </header>

      <ul className="flex flex-col gap-px">
        {candidates.map((c) => (
          <li
            key={c.id}
            data-testid="candidate-row"
            className="flex flex-col gap-1 border-b border-neutral-800 py-3 sm:flex-row sm:items-baseline sm:justify-between"
          >
            <div className="flex items-baseline gap-2">
              <span className="font-medium">{c.name}</span>
              <span className="rounded bg-neutral-800 px-1.5 py-0.5 text-xs text-neutral-200">
                {c.tier} ({c.discountPct}% off)
              </span>
            </div>
            <p className="text-sm text-neutral-400">{c.explanation}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
