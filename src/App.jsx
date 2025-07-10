import { useState } from 'react';
import JarvisAgent from './components/JarvisAgent.jsx';
import JarvisRealtimeAgent from './components/JarvisRealtimeAgent.jsx';
import { ToggleLeft, ToggleRight } from 'lucide-react';

function App() {
  const [useRealtime, setUseRealtime] = useState(false);

  return (
    <div className="relative">
      {/* Mode Toggle */}
      <div className="absolute top-4 right-4 z-50 bg-gray-800/90 backdrop-blur-sm rounded-lg p-3 border border-gray-700">
        <div className="flex items-center gap-3">
          <span className={`text-sm ${!useRealtime ? 'text-white' : 'text-gray-400'}`}>
            Assistant API
          </span>
          <button
            onClick={() => setUseRealtime(!useRealtime)}
            className="flex items-center"
          >
            {useRealtime ? (
              <ToggleRight size={24} className="text-green-400" />
            ) : (
              <ToggleLeft size={24} className="text-gray-400" />
            )}
          </button>
          <span className={`text-sm ${useRealtime ? 'text-white' : 'text-gray-400'}`}>
            Realtime API
          </span>
        </div>
        <div className="text-xs text-gray-500 mt-1 text-center">
          {useRealtime ? 'Real-time voice conversation' : 'Traditional chat interface'}
        </div>
      </div>

      {/* Render appropriate component */}
      {useRealtime ? <JarvisRealtimeAgent /> : <JarvisAgent />}
    </div>
  );
}

export default App;
