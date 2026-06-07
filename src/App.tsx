import { useMemo } from 'react';
import { buildCandidates } from '@/pipeline';
import { CandidateSurface } from '@/components/CandidateSurface';

// Fixed seed for the walking skeleton: data generates once on load. The
// seedable "regenerate sample" control is Roadmap #2.
const SEED = 42;

export default function App() {
  const candidates = useMemo(() => buildCandidates(SEED), []);
  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100">
      <CandidateSurface candidates={candidates} />
    </main>
  );
}
