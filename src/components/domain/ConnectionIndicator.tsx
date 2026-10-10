import React from 'react';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { useRealtime } from '@/lib/realtime/realtimeContext';
import { formatTimeIST, TIMEZONE_LABEL } from '@/lib/format/date';

export const ConnectionIndicator: React.FC = () => {
  const { status, lastUpdated, simulateDisconnect, simulateReconnect } = useRealtime();

  return (
    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-slate-200 text-xs shadow-2xs">
      {status === 'live' && (
        <div className="flex items-center gap-1.5 text-[#16845B]" title="Connected to Supabase Realtime channel">
          <span className="w-2 h-2 rounded-full bg-[#16845B] animate-pulse" />
          <Wifi className="w-3.5 h-3.5" />
          <span className="font-semibold text-xs">Live</span>
        </div>
      )}

      {status === 'reconnecting' && (
        <div className="flex items-center gap-1.5 text-[#D97706]" title="Connection lost. Reconnecting with exponential backoff; polling every 15s">
          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          <span className="font-semibold text-xs">Reconnecting (15s poll)</span>
        </div>
      )}

      {status === 'offline' && (
        <div className="flex items-center gap-1.5 text-[#DC2626]" title="Browser offline. Live changes paused.">
          <WifiOff className="w-3.5 h-3.5" />
          <span className="font-semibold text-xs">Offline</span>
        </div>
      )}

      <span className="text-slate-300" aria-hidden="true">|</span>

      <span className="text-slate-500 text-[11px] tabular-nums">
        Updated {formatTimeIST(lastUpdated)} {TIMEZONE_LABEL}
      </span>

      {/* Demo testing toggle */}
      <button
        type="button"
        onClick={status === 'live' ? simulateDisconnect : simulateReconnect}
        className="ml-0.5 text-[10px] text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
        title="Simulate network loss / reconnect for demo"
      >
        [{status === 'live' ? 'Test drop' : 'Reconnect'}]
      </button>
    </div>
  );
};
