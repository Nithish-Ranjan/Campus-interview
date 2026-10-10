import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { mockBackend } from '../api/mockEngine';

export type ConnectionStatus = 'live' | 'reconnecting' | 'offline';

interface RealtimeContextType {
  status: ConnectionStatus;
  lastUpdated: Date;
  updatedItems: Set<string>; // Set of entity IDs marked as updated in last 10s
  markUpdated: (id: string) => void;
  triggerEvent: (channel: string, type: string, payload: any) => void;
  simulateDisconnect: () => void;
  simulateReconnect: () => void;
}

const defaultRealtimeContext: RealtimeContextType = {
  status: 'live',
  lastUpdated: new Date(),
  updatedItems: new Set(),
  markUpdated: () => {},
  triggerEvent: () => {},
  simulateDisconnect: () => {},
  simulateReconnect: () => {},
};

const RealtimeContext = createContext<RealtimeContextType>(defaultRealtimeContext);

export const RealtimeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<ConnectionStatus>('live');
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [updatedItems, setUpdatedItems] = useState<Set<string>>(new Set());

  const markUpdated = useCallback((id: string) => {
    setUpdatedItems(prev => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });

    // Clear highlight after 10s as required by Section 7.6
    setTimeout(() => {
      setUpdatedItems(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 10000);
  }, []);

  useEffect(() => {
    // Subscribe to mock backend events
    const unsubscribe = mockBackend.subscribe(event => {
      setLastUpdated(new Date());
      if (event.payload?.id) {
        markUpdated(event.payload.id);
      }
      if (event.payload?.interviewId) {
        markUpdated(event.payload.interviewId);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [markUpdated]);

  const simulateDisconnect = () => {
    setStatus('reconnecting');
  };

  const simulateReconnect = () => {
    setStatus('live');
    setLastUpdated(new Date());
  };

  const triggerEvent = (_channel: string, _type: string, payload: any) => {
    setLastUpdated(new Date());
    if (payload?.id) markUpdated(payload.id);
  };

  return (
    <RealtimeContext.Provider
      value={{
        status,
        lastUpdated,
        updatedItems,
        markUpdated,
        triggerEvent,
        simulateDisconnect,
        simulateReconnect
      }}
    >
      {children}
    </RealtimeContext.Provider>
  );
};

export const useRealtime = () => {
  const context = useContext(RealtimeContext);
  return context ?? defaultRealtimeContext;
};
