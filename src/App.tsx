import { useState } from 'react';
import Hero from './components/Hero';
import { useViewportUnit } from './lib/motion';

export default function App() {
  useViewportUnit();
  const [, setEntered] = useState(false);

  return (
    <>
      <div className="grain" aria-hidden="true" />
      <div className="vignette" aria-hidden="true" />
      <main>
        <Hero onEnter={() => setEntered(true)} />
      </main>
    </>
  );
}
