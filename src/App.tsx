import { useState } from 'react';
import Hero from './components/Hero';
import Threshold from './components/Threshold';
import Prepare from './rooms/Prepare';
import Screen from './rooms/Screen';
import Findings from './rooms/Findings';
import { useRoom } from './lib/room';
import { useViewportUnit } from './lib/motion';
import type { VomsRatings } from './lib/clinical/voms';
import type { VomsTaskResult } from './lib/clinical/voms';

export default function App() {
  useViewportUnit();
  const { room, go } = useRoom();
  const [crossing, setCrossing] = useState(false);
  const [baseline, setBaseline] = useState<VomsRatings | null>(null);
  const [results, setResults] = useState<VomsTaskResult[]>([]);

  const leave = () => {
    setCrossing(false);
    go('landing');
  };

  return (
    <>
      {room === 'landing' && (
        <>
          <div className="grain" aria-hidden="true" />
          <div className="vignette" aria-hidden="true" />
        </>
      )}

      <main>
        {room === 'landing' && !crossing && <Hero onEnter={() => setCrossing(true)} />}

        {crossing && room === 'landing' && (
          <Threshold
            onDone={() => {
              setCrossing(false);
              go('prepare');
            }}
          />
        )}

        {room === 'prepare' && (
          <Prepare
            onLeave={leave}
            onContinue={(b) => {
              setBaseline(b);
              go('screen');
            }}
          />
        )}

        {room === 'screen' && baseline && (
          <Screen
            baseline={baseline}
            onLeave={leave}
            onComplete={(r) => {
              setResults(r);
              go('findings');
            }}
          />
        )}

        {room === 'findings' && baseline && (
          <Findings baseline={baseline} results={results} onLeave={leave} />
        )}
      </main>
    </>
  );
}
