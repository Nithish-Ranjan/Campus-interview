import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Activity, 
  Building2, 
  Play, 
  CheckCircle2, 
  AlertTriangle, 
  FlaskConical, 
  UserCheck
} from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { DelayChip } from '@/components/domain/DelayChip';
import { formatTimeIST } from '@/lib/format/date';
import { useAuth } from '@/lib/auth/authContext';
import { useRealtime } from '@/lib/realtime/realtimeContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export const LiveOpsScreen: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { updatedItems, markUpdated } = useRealtime();

  const [liveData, setLiveData] = useState<any | null>(null);
  const [delayDialogOpen, setDelayDialogOpen] = useState(false);
  const [delayInterviewId, setDelayInterviewId] = useState<string | null>(null);
  const [delayMinutes, setDelayMinutes] = useState(30);
  const [delayReason, setDelayReason] = useState('Extended technical system design round');
  const [isUpdating, setIsUpdating] = useState(false);

  // Panel filter: Panel Coordinator restricted to assigned panels (Section 4.3)
  const isPanelCoord = user?.role === 'panel_coordinator';
  const panelFilter = isPanelCoord ? 'room-a' : (searchParams.get('panel') || 'all');

  useEffect(() => {
    apiClient.getLiveOperations().then(res => setLiveData(res));
  }, []);

  const handleStatusChange = async (interviewId: string, status: string) => {
    setIsUpdating(true);
    try {
      await apiClient.updateInterviewStatus(interviewId, status);
      markUpdated(interviewId);
      const res = await apiClient.getLiveOperations();
      setLiveData(res);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleMarkDelayed = async () => {
    if (!delayInterviewId) return;
    setIsUpdating(true);
    try {
      await apiClient.markInterviewDelayed(delayInterviewId, delayMinutes, delayReason);
      markUpdated(delayInterviewId);
      setDelayDialogOpen(false);
      const res = await apiClient.getLiveOperations();
      setLiveData(res);
    } finally {
      setIsUpdating(false);
    }
  };

  if (!liveData) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-14 bg-slate-200/80 rounded-xl" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-96 bg-slate-200/80 rounded-xl" />
          <div className="h-96 bg-slate-200/80 rounded-xl" />
        </div>
      </div>
    );
  }

  const filteredRooms = panelFilter === 'all'
    ? liveData.rooms
    : liveData.rooms.filter((r: any) => r.room.id === panelFilter);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200/90 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-base font-bold text-slate-900 tracking-tight">Live Interview Operations Console</h1>
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#16845B] opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#16845B]" />
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">Real-time room occupancy, status telemetry &bull; Downstream delay propagation</p>
        </div>

        {/* Panel Filter */}
        {!isPanelCoord && (
          <div className="flex items-center gap-3">
            <label htmlFor="panel-select" className="text-xs font-medium text-slate-600">Filter Panel / Room:</label>
            <select
              id="panel-select"
              value={panelFilter}
              onChange={e => setSearchParams({ panel: e.target.value })}
              className="text-xs bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg px-3 py-1.5 font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500 transition-colors cursor-pointer"
            >
              <option value="all">All Rooms (3)</option>
              <option value="room-a">Room A (Newton Hall)</option>
              <option value="room-b">Room B (Turing Lab)</option>
              <option value="room-c">Room C (Babbage Suite)</option>
            </select>
          </div>
        )}
      </div>

      {/* Main Grid: Room Lanes + Downstream Ripple Impact */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Room Lanes (2 columns) */}
        <div className="lg:col-span-2 space-y-4">
          {filteredRooms.map((r: any) => {
            const current = r.currentInterview;
            const next = r.nextInterview;
            const isUpdated = current && updatedItems.has(current.id);

            return (
              <Card 
                key={r.room.id}
                className={`transition-all ${
                  isUpdated ? 'border-blue-500 bg-blue-50/20 shadow-md ring-1 ring-blue-500/20' : ''
                }`}
              >
                {/* Room Header */}
                <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-blue-600" />
                    <CardTitle className="text-sm font-semibold">{r.room.name}</CardTitle>
                    <span className="text-xs text-slate-500 font-normal">({r.room.building})</span>
                  </div>

                  {isUpdated && (
                    <Badge variant="success" className="text-[10px]">
                      Updated live
                    </Badge>
                  )}
                </CardHeader>

                <CardContent className="pt-4">
                  {/* Current & Next Split */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Current In-Room Interview */}
                    <div className="p-4 bg-slate-50/70 rounded-xl border border-slate-200 space-y-3">
                      <div className="flex items-center justify-between text-xs">
                        <Badge variant="default" className="text-[10px] font-semibold bg-blue-600">
                          Current Interview
                        </Badge>
                        {current && <DelayChip minutes={current.delayMinutes} reason={current.delayReason} />}
                      </div>

                      {current ? (
                        <div>
                          <div className="text-base font-bold text-slate-900">{current.studentName}</div>
                          <div className="font-mono text-xs text-slate-500">{current.rollNumber} &bull; {current.companyName}</div>

                          <div className="mt-2.5 text-xs text-slate-600 space-y-1 bg-white p-2.5 rounded-lg border border-slate-200/70">
                            <div className="flex justify-between">
                              <span className="text-slate-500">Scheduled:</span>
                              <span className="font-mono font-semibold">{formatTimeIST(current.scheduledStart)} - {formatTimeIST(current.scheduledEnd)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500">Panel:</span>
                              <span className="font-medium text-slate-800">{current.interviewerNames.join(', ')}</span>
                            </div>
                          </div>

                          {/* Status Actions */}
                          <div className="pt-3 mt-3 border-t border-slate-200 flex items-center gap-2 flex-wrap">
                            {current.allowedActions.includes('start') && (
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => handleStatusChange(current.id, 'in_progress')}
                                className="bg-[#16845B] hover:bg-[#126B49] text-xs h-7"
                              >
                                <Play className="w-3 h-3 fill-current" />
                                <span>Start Interview</span>
                              </Button>
                            )}

                            {current.allowedActions.includes('complete') && (
                              <Button
                                variant="navy"
                                size="sm"
                                onClick={() => handleStatusChange(current.id, 'completed')}
                                className="text-xs h-7"
                              >
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Mark Complete</span>
                              </Button>
                            )}

                            {current.allowedActions.includes('mark_delayed') && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setDelayInterviewId(current.id);
                                  setDelayDialogOpen(true);
                                }}
                                className="text-xs h-7 text-[#D97706] bg-amber-50/60 hover:bg-amber-100/60 border-amber-200"
                              >
                                <AlertTriangle className="w-3 h-3" />
                                <span>Mark Delayed</span>
                              </Button>
                            )}

                            {/* Simulate disruption trigger */}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigate(`/recovery?interviewId=${current.id}`)}
                              className="text-xs h-7 text-purple-700 hover:bg-purple-50 border-purple-200"
                              title="Simulate recovery options for this interview"
                            >
                              <FlaskConical className="w-3 h-3 text-purple-600" />
                              <span>Simulate Recovery</span>
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 py-6 text-center">Room currently idle.</p>
                      )}
                    </div>

                    {/* Next Up in Room */}
                    <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-3">
                      <div className="flex items-center justify-between text-xs">
                        <Badge variant="secondary" className="text-[10px] font-semibold text-slate-600">
                          Next Up
                        </Badge>
                        {next?.estimatedStart && (
                          <Badge variant="warning" className="text-[10px] font-mono">
                            Estimated Time
                          </Badge>
                        )}
                      </div>

                      {next ? (
                        <div>
                          <div className="text-base font-bold text-slate-900">{next.studentName}</div>
                          <div className="font-mono text-xs text-slate-500">{next.rollNumber} &bull; {next.companyName}</div>

                          <div className="mt-2.5 text-xs text-slate-600 space-y-1 bg-slate-50 p-2.5 rounded-lg border border-slate-200/70">
                            <div className="flex justify-between">
                              <span className="text-slate-500">Scheduled:</span>
                              <span className="font-mono">{formatTimeIST(next.scheduledStart)}</span>
                            </div>
                            {next.estimatedStart ? (
                              <div className="flex justify-between text-[#D97706] font-semibold">
                                <span>Estimated Start:</span>
                                <span className="font-mono">{formatTimeIST(next.estimatedStart)} (Late)</span>
                              </div>
                            ) : (
                              <div className="flex justify-between text-[#16845B]">
                                <span>Status:</span>
                                <span>On Time</span>
                              </div>
                            )}
                          </div>

                          {next.allowedActions.includes('check_in') && (
                            <div className="pt-3 mt-3 border-t border-slate-100">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleStatusChange(next.id, 'checked_in')}
                                className="w-full text-xs h-7"
                              >
                                <UserCheck className="w-3.5 h-3.5" />
                                <span>Check In Candidate</span>
                              </Button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 py-6 text-center">No further interviews scheduled.</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Right Column: Downstream Impact & Timeline */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Activity className="w-4 h-4 text-blue-600" />
                  <span>Downstream Impact Monitor</span>
                </CardTitle>
                <CardDescription>
                  Real-time ripple delays calculated downstream
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent className="pt-4 space-y-3">
              <p className="text-xs text-slate-500 leading-relaxed">
                When an interview runs over schedule, subsequent slots in that room inherit server-estimated start times.
              </p>

              <div className="space-y-2.5">
                {filteredRooms.flatMap((r: any) => r.allInterviews.filter((i: any) => i.estimatedStart)).map((aff: any) => (
                  <div key={aff.id} className="p-3 bg-amber-50/70 rounded-lg border border-amber-200/80 text-xs space-y-1">
                    <div className="flex justify-between font-bold text-[#D97706]">
                      <span>{aff.studentName} ({aff.rollNumber})</span>
                      <span className="font-mono">{aff.roomName}</span>
                    </div>
                    <div className="text-[11px] text-slate-600 flex justify-between">
                      <span>Scheduled: {formatTimeIST(aff.scheduledStart)}</span>
                      <span className="font-bold text-[#D97706]">Estimated: {formatTimeIST(aff.estimatedStart)}</span>
                    </div>
                  </div>
                ))}

                {filteredRooms.flatMap((r: any) => r.allInterviews.filter((i: any) => i.estimatedStart)).length === 0 && (
                  <div className="p-4 text-center text-xs text-slate-500 bg-slate-50 rounded-lg border border-slate-200">
                    All downstream interviews are currently tracking on schedule.
                  </div>
                )}
              </div>

              <div className="pt-2">
                <Button
                  variant="navy"
                  size="sm"
                  onClick={() => navigate('/recovery')}
                  className="w-full text-xs font-semibold"
                >
                  <FlaskConical className="w-3.5 h-3.5 mr-1 text-purple-300" />
                  <span>Open Recovery Workspace</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Delay Recording Dialog */}
      {delayDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={() => setDelayDialogOpen(false)} aria-hidden="true" />
          <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl border border-slate-200 p-6 space-y-4 z-10 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-base font-bold text-slate-900">Record Interview Delay</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Recording a delay adjusts downstream estimated starts without modifying the locked, published schedule.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-900 mb-1">Delay Duration (minutes):</label>
                <select
                  value={delayMinutes}
                  onChange={e => setDelayMinutes(Number(e.target.value))}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold"
                >
                  <option value={15}>15 minutes</option>
                  <option value={30}>30 minutes (Standard demo delay)</option>
                  <option value={45}>45 minutes</option>
                  <option value={60}>60 minutes</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-900 mb-1">Reason for Delay:</label>
                <input
                  type="text"
                  value={delayReason}
                  onChange={e => setDelayReason(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDelayDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                isLoading={isUpdating}
                onClick={handleMarkDelayed}
              >
                Confirm Delay
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
