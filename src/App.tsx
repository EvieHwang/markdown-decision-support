import { CustomizationView } from '@/components/CustomizationView';

// The starting seed for the interactive surface. The buyer can edit the seed or
// regenerate from here (Feature 2 — Live Customization).
const SEED = 42;

export default function App() {
  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100">
      <CustomizationView initialSeed={SEED} />
    </main>
  );
}
