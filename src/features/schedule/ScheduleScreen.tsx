import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  Building2, 
  User, 
  Send, 
  X, 
  Move, 
  FlaskConical, 
  Clock, 
  AlertCircle, 
  Plus, 
  CheckCircle2, 
  AlertTriangle,
  Zap
} from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import type { Interview, ScheduleConflict } from '@/lib/api/types';
import { ConflictCallout } from '@/components/domain/ConflictCallout';
import { SimulationBanner } from '@/components/domain/SimulationBanner';
import { formatTimeIST } from '@/lib/format/date';
import { useAuth } from '@/lib/auth/authContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

/**
 * Converts a 24-hour time string in IST (e.g. "10:30") to an exact UTC ISO string
 * on the target date (defaults to baseIsoDate or 2026-10-11).
 * IST is UTC+05:30 (330 minutes).
 */
function istTimeToISO(timeStr: string, baseIsoDate?: string): string {
  const datePart = baseIsoDate ? baseIsoDate.split('T')[0] : '2026-10-11';
  const [hStr, mStr] = timeStr.split(':');
  const h = parseInt(hStr || '10', 10);
  const m = parseInt(mStr || '0', 10);

  // UTC minutes = IST minutes - 330
  let totalUtcMins = h * 60 + m - 330;
  let dateStr = datePart;
  if (totalUtcMins < 0) {
    totalUtcMins += 24 * 60;
    const d = new Date(datePart);
    d.setDate(d.getDate() - 1);
    dateStr = d.toISOString().split('T')[0];
  }
  const utcH = Math.floor(totalUtcMins / 60);
  const utcM = totalUtcMins % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${dateStr}T${pad(utcH)}:${pad(utcM)}:00.000Z`;
}

/**
 * Extracts 24-hour "HH:MM" string in Asia/Kolkata timezone from an ISO string.
 */
function isoToISTTime(isoStr: string): string {
  try {
    const d = new Date(isoStr);
    return new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'Asia/Kolkata'
    }).format(d);
  } catch {
    return '10:30';
  }
}

export const ScheduleScreen: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const mode = (searchParams.get('version') as 'published' | 'draft' | 'simulation') || 'published';

  const [scheduleData, setScheduleData] = useState<{ version: number; interviews: Interview[] } | null>(null);
  const [selectedInterview, setSelectedInterview] = useState<Interview | null>(null);
  
  // Move Dialog State
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [targetRoom, setTargetRoom] = useState('room-b');
  const [targetTime, setTargetTime] = useState('10:30');
  const [isValidatingMove, setIsValidatingMove] = useState(false);
  const [movedSuccessId, setMovedSuccessId] = useState<string | null>(null);
  const [moveSuccessMessage, setMoveSuccessMessage] = useState<string | null>(null);

  // Create/Schedule Dialog State
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createStudentId, setCreateStudentId] = useState('stu-001');
  const [createCompanyId, setCreateCompanyId] = useState('comp-ast');
  const [createRoomId, setCreateRoomId] = useState('room-b');
  const [createInterviewerId, setCreateInterviewerId] = useState('int-1');
  const [createTime, setCreateTime] = useState('10:30');
  const [createDuration, setCreateDuration] = useState(30);
  const [isCreatingSlot, setIsCreatingSlot] = useState(false);

  // Conflicts and Draft submission
  const [activeConflicts, setActiveConflicts] = useState<ScheduleConflict[]>([]);
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const [submissionNote, setSubmissionNote] = useState('');
  const [isSubmittingDraft, setIsSubmittingDraft] = useState(false);

  const canEdit = user?.role === 'admin' || user?.role === 'coordinator';

  const loadSchedule = async () => {
    try {
      const res = await apiClient.getSchedule(mode);
      setScheduleData(res);
      if (res.interviews.length > 0 && !selectedInterview) {
        setSelectedInterview(res.interviews[0]);
      }
    } catch (e) {
      console.error('Failed to load schedule:', e);
    }
  };

  useEffect(() => {
    loadSchedule();
  }, [mode]);

  const handleModeChange = (newMode: 'published' | 'draft' | 'simulation') => {
    setActiveConflicts([]);
    setSearchParams({ version: newMode });
  };

  const handleOpenMove = (item: Interview) => {
    setSelectedInterview(item);
    setActiveConflicts([]);
    setTargetRoom(item.roomId);
    setTargetTime(isoToISTTime(item.scheduledStart));
    setMoveDialogOpen(true);
  };

  const handleExecuteMove = async () => {
    if (!selectedInterview) return;
    setIsValidatingMove(true);
    setActiveConflicts([]);
    setMoveSuccessMessage(null);

    const targetIsoString = istTimeToISO(targetTime, selectedInterview.scheduledStart);

    try {
      const moved = await apiClient.moveInterview(selectedInterview.id, targetRoom, targetIsoString);
      setMoveDialogOpen(false);
      const movedId = moved.id || selectedInterview.id;
      setMovedSuccessId(movedId);
      setMoveSuccessMessage(`Moved ${selectedInterview.studentName} to ${targetRoom === 'room-a' ? 'Room A' : targetRoom === 'room-b' ? 'Room B' : 'Room C'} at ${targetTime} IST.`);

      // Refresh schedule and find updated interview to set as selected
      const res = await apiClient.getSchedule(mode);
      setScheduleData(res);
      const updatedInterview = res.interviews.find(i => i.id === movedId || i.id === selectedInterview.id + '-draft' || i.id === selectedInterview.id);
      if (updatedInterview) setSelectedInterview(updatedInterview);

      setTimeout(() => {
        setMovedSuccessId(null);
        setMoveSuccessMessage(null);
      }, 7000);
    } catch (err: any) {
      if (err.status === 409) {
        // Extract conflicts cleanly
        const conflictsList = err.error?.details?.conflicts || err.error?.conflicts;
        if (Array.isArray(conflictsList) && conflictsList.length > 0) {
          setActiveConflicts(conflictsList);
        } else {
          setActiveConflicts([
            {
              id: `conf-${Date.now()}`,
              type: 'interviewer',
              resource: 'Target Resource',
              timeRange: `${targetTime} IST`,
              counterpart: 'Conflicting Booking',
              message: err.error?.message || err.error?.error || 'A scheduling conflict was detected.'
            }
          ]);
        }
      } else {
        alert(err.message || 'Move validation failed on server.');
      }
    } finally {
      setIsValidatingMove(false);
    }
  };

  const handleExecuteCreate = async () => {
    setIsCreatingSlot(true);
    setActiveConflicts([]);
    setMoveSuccessMessage(null);

    const startIso = istTimeToISO(createTime, '2026-10-11');
    const startObj = new Date(startIso);
    const endObj = new Date(startObj.getTime() + createDuration * 60000);

    try {
      const created = await apiClient.createInterview({
        studentId: createStudentId,
        companyId: createCompanyId,
        roomId: createRoomId,
        scheduledStart: startIso,
        scheduledEnd: endObj.toISOString(),
        interviewerIds: [createInterviewerId],
        scheduleMode: mode === 'draft' ? 'draft' : 'published'
      });

      setCreateDialogOpen(false);
      setMovedSuccessId(created.id);
      setSelectedInterview(created);
      setMoveSuccessMessage(`Scheduled slot for ${created.studentName} in ${created.roomName} at ${createTime} IST.`);

      // Refresh schedule
      const res = await apiClient.getSchedule(mode);
      setScheduleData(res);

      setTimeout(() => {
        setMovedSuccessId(null);
        setMoveSuccessMessage(null);
      }, 7000);
    } catch (err: any) {
      if (err.status === 409) {
        const conflictsList = err.error?.details?.conflicts || err.error?.conflicts;
        if (Array.isArray(conflictsList) && conflictsList.length > 0) {
          setActiveConflicts(conflictsList);
        } else {
          setActiveConflicts([
            {
              id: `conf-create-${Date.now()}`,
              type: 'room',
              resource: 'Resource Overlap',
              timeRange: `${createTime} IST`,
              counterpart: 'Existing Booking',
              message: err.error?.message || err.error?.error || 'Conflict detected: room, student, or panel member is already occupied.'
            }
          ]);
        }
      } else {
        alert(err.message || 'Failed to schedule interview.');
      }
    } finally {
      setIsCreatingSlot(false);
    }
  };

  const handleSubmitDraft = async () => {
    if (!submissionNote) {
      alert('A required proposal note must be provided before submission.');
      return;
    }
    setIsSubmittingDraft(true);
    try {
      const prop = await apiClient.submitDraft(submissionNote);
      setSubmitDialogOpen(false);
      alert(`Schedule draft submitted as Proposal #${prop.id}! Navigating to Approvals.`);
      navigate(`/approvals/${prop.id}`);
    } finally {
      setIsSubmittingDraft(false);
    }
  };

  if (!scheduleData) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-14 bg-slate-200/80 rounded-xl" />
        <div className="h-96 bg-slate-200/80 rounded-xl" />
      </div>
    );
  }

  const rooms = [
    { id: 'room-a', name: 'Room A (Newton Hall)' },
    { id: 'room-b', name: 'Room B (Turing Lab)' },
    { id: 'room-c', name: 'Room C (Babbage Suite)' }
  ];

  return (
    <div className="space-y-6">
      {/* Simulation Banner when in simulation mode */}
      {mode === 'simulation' && <SimulationBanner version={scheduleData.version} />}

      {/* Top Header & Mode Toggle */}
      <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200/90 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-base font-bold text-slate-900 tracking-tight">Interview Master Timetable</h1>
            <Badge variant="outline" className="font-mono text-xs">
              Version {scheduleData.version}
            </Badge>
            <Badge variant="secondary" className="text-[11px] font-medium bg-slate-100 text-slate-700">
              {mode.toUpperCase()} MODE
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">Day 1 Master Schedule &bull; Deterministic conflict validation &bull; 3 synchronized rooms</p>
        </div>

        {/* Actions & Mode Selector */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-semibold">
            <button
              type="button"
              onClick={() => handleModeChange('published')}
              className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                mode === 'published' ? 'bg-white text-blue-700 font-bold shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Published (v{scheduleData.version})
            </button>
            <button
              type="button"
              onClick={() => handleModeChange('draft')}
              className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                mode === 'draft' ? 'bg-white text-blue-700 font-bold shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Draft Workspace
            </button>
            <button
              type="button"
              onClick={() => handleModeChange('simulation')}
              className={`px-3 py-1 rounded-md transition-all flex items-center gap-1 cursor-pointer ${
                mode === 'simulation' ? 'bg-purple-700 text-white font-bold shadow-2xs' : 'text-purple-700 hover:bg-purple-100/60'
              }`}
            >
              <FlaskConical className="w-3.5 h-3.5" />
              <span>Simulation</span>
            </button>
          </div>

          {canEdit && (
            <Button
              variant="default"
              size="sm"
              onClick={() => {
                setActiveConflicts([]);
                setCreateDialogOpen(true);
              }}
              className="text-xs bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Schedule Slot</span>
            </Button>
          )}

          {mode === 'draft' && canEdit && (
            <Button
              variant="default"
              size="sm"
              onClick={() => setSubmitDialogOpen(true)}
              className="text-xs"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Submit Draft</span>
            </Button>
          )}
        </div>
      </div>

      {/* Persistent 409 Conflict Callout if detected */}
      <ConflictCallout conflicts={activeConflicts} onDismiss={() => setActiveConflicts([])} />

      {/* Success Notification Banner */}
      {moveSuccessMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center justify-between font-medium animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{moveSuccessMessage}</span>
          </div>
          <button 
            type="button" 
            onClick={() => setMoveSuccessMessage(null)} 
            className="text-emerald-700 hover:text-emerald-900 text-xs font-bold px-2 py-0.5"
          >
            &times;
          </button>
        </div>
      )}

      {/* Schedule Mode Warning Banner */}
      {mode === 'draft' && (
        <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-xl text-xs text-blue-800 flex items-center justify-between font-medium">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-blue-600 shrink-0" />
            <span>
              <strong>Draft Workspace:</strong> Staged moves and newly scheduled slots run deterministic conflict checks. Submit draft to request Officer approval.
            </span>
          </div>
          <span className="text-[11px] font-mono font-bold bg-white px-2.5 py-0.5 rounded border border-blue-200">
            Based on v{scheduleData.version}
          </span>
        </div>
      )}

      {/* Main Grid + Inspector Rail */}
      <div className="flex flex-col xl:flex-row gap-6 items-start">
        {/* Rooms Grid */}
        <Card className="flex-1 w-full overflow-hidden">
          <CardHeader className="border-b border-slate-100 pb-3">
            <CardTitle className="text-sm font-semibold flex items-center justify-between">
              <span>Interview Rooms & Timetable</span>
              <span className="text-xs text-slate-500 font-normal">Deterministic Grid &bull; Click card to inspect or move</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {rooms.map(room => {
                const roomItems = scheduleData.interviews.filter(i => i.roomId === room.id);

                return (
                  <div key={room.id} className="bg-slate-50/70 rounded-xl border border-slate-200 p-3.5 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-200/90 pb-2.5 text-xs font-semibold text-slate-900">
                      <span className="flex items-center gap-1.5 truncate">
                        <Building2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span className="truncate">{room.name}</span>
                      </span>
                      <Badge variant="secondary" className="text-[10px] shrink-0 font-mono">
                        {roomItems.length} booked
                      </Badge>
                    </div>

                    <div className="space-y-2.5 min-h-[300px]">
                      {roomItems.length === 0 ? (
                        <div className="text-center py-12 text-slate-400 text-xs italic border border-dashed border-slate-200 rounded-lg">
                          No interviews scheduled in this room.
                        </div>
                      ) : (
                        roomItems.map(item => {
                          const isSelected = selectedInterview?.id === item.id;
                          const isRecentlyMoved = item.id === movedSuccessId || item.hasMoved;

                          return (
                            <div
                              key={item.id}
                              onClick={() => {
                                setSelectedInterview(item);
                                setActiveConflicts([]);
                              }}
                              className={`p-3 rounded-lg border text-xs transition-all cursor-pointer relative shadow-2xs ${
                                isSelected
                                  ? 'border-blue-500 bg-blue-50/80 shadow-xs ring-1 ring-blue-500/30'
                                  : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs'
                              }`}
                            >
                              {/* Recently moved / new tag */}
                              {isRecentlyMoved && (
                                <span className="absolute -top-2 -right-1 px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-[#16845B] text-white uppercase tracking-wider shadow-2xs">
                                  Updated
                                </span>
                              )}

                              <div className="flex items-center justify-between mb-1.5">
                                <span className="font-mono font-semibold text-slate-900 flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-slate-400" />
                                  {formatTimeIST(item.scheduledStart)} - {formatTimeIST(item.scheduledEnd)}
                                </span>
                                <Badge variant="outline" className="text-[10px] uppercase font-bold py-0">
                                  {item.companyName}
                                </Badge>
                              </div>

                              <div className="font-bold text-sm text-slate-900 mt-1">{item.studentName}</div>
                              <div className="font-mono text-[11px] text-slate-500">{item.rollNumber}</div>

                              <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                                <span className="text-slate-600 flex items-center gap-1 truncate pr-2">
                                  <User className="w-3 h-3 text-slate-400 shrink-0" />
                                  <span className="truncate">{item.interviewerNames.join(', ')}</span>
                                </span>

                                {canEdit && (
                                  <Button
                                    variant="navy"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenMove(item);
                                    }}
                                    className="h-6 px-2 text-[10px] font-bold shrink-0 bg-slate-800 hover:bg-slate-900 text-white"
                                  >
                                    <Move className="w-2.5 h-2.5 mr-1" />
                                    <span>Move</span>
                                  </Button>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Right Inspector Rail */}
        {selectedInterview && (
          <Card className="w-full xl:w-96 shrink-0">
            <CardHeader className="border-b border-slate-100 pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
                    Slot Inspector
                  </span>
                  <CardTitle className="text-base font-bold mt-0.5">
                    {selectedInterview.studentName}
                  </CardTitle>
                  <span className="font-mono text-xs text-blue-600 font-semibold">
                    {selectedInterview.rollNumber}
                  </span>
                </div>

                {canEdit && (
                  <Button
                    variant="navy"
                    size="sm"
                    onClick={() => handleOpenMove(selectedInterview)}
                    className="text-xs bg-slate-800 hover:bg-slate-900 text-white"
                  >
                    <Move className="w-3.5 h-3.5 mr-1" />
                    <span>Move</span>
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Target Company:</span>
                  <span className="font-semibold text-slate-900">{selectedInterview.companyName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Assigned Room:</span>
                  <span className="font-semibold text-slate-900">{selectedInterview.roomName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Scheduled Time:</span>
                  <span className="font-mono font-semibold text-slate-900">
                    {formatTimeIST(selectedInterview.scheduledStart)} - {formatTimeIST(selectedInterview.scheduledEnd)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Interview Panel:</span>
                  <span className="font-semibold text-slate-900">{selectedInterview.interviewerNames.join(', ')}</span>
                </div>
              </div>

              {/* Status */}
              <div className="p-3 bg-white rounded-lg border border-slate-200">
                <div className="text-[10px] text-slate-500 uppercase font-semibold mb-1">Current Status</div>
                <Badge variant="success" className="capitalize text-xs font-semibold">
                  {selectedInterview.status.replace('_', ' ')}
                </Badge>
              </div>

              {/* Quick Move Trigger inside Inspector */}
              {canEdit && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-2">
                  <div className="font-semibold text-slate-800">Quick Conflict Testing:</div>
                  <p className="text-[11px] text-slate-500">
                    Test how the deterministic engine rejects clashing slots with HTTP 409:
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedInterview(selectedInterview);
                      setTargetRoom('room-b');
                      setTargetTime('10:30');
                      setMoveDialogOpen(true);
                    }}
                    className="w-full text-[11px] border-red-200 text-red-700 hover:bg-red-50 flex items-center justify-center gap-1"
                  >
                    <AlertTriangle className="w-3 h-3 text-red-600" />
                    <span>Test Dr. Rao Conflict (Room B at 10:30 AM)</span>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Move / Reschedule Dialog Modal */}
      {moveDialogOpen && selectedInterview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={() => setMoveDialogOpen(false)} aria-hidden="true" />
          <div className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl border border-slate-200 p-6 space-y-4 z-10 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Move className="w-4 h-4 text-blue-600" />
                <span>Move / Reschedule Interview Slot</span>
              </h3>
              <button
                type="button"
                onClick={() => setMoveDialogOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs space-y-4">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div className="font-bold text-slate-900">{selectedInterview.studentName} ({selectedInterview.rollNumber})</div>
                <div className="text-slate-500 mt-0.5">{selectedInterview.companyName} &bull; Panel: {selectedInterview.interviewerNames.join(', ')}</div>
                <div className="font-mono text-slate-700 mt-1 text-[11px]">
                  Current: {selectedInterview.roomName} &bull; {formatTimeIST(selectedInterview.scheduledStart)} - {formatTimeIST(selectedInterview.scheduledEnd)}
                </div>
              </div>

              {/* Destination Room */}
              <div>
                <label className="block font-semibold text-slate-900 mb-1">Destination Room:</label>
                <select
                  value={targetRoom}
                  onChange={e => setTargetRoom(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold"
                >
                  <option value="room-a">Room A (Newton Hall)</option>
                  <option value="room-b">Room B (Turing Lab)</option>
                  <option value="room-c">Room C (Babbage Suite)</option>
                </select>
              </div>

              {/* Target Start Time - Free Input */}
              <div>
                <label className="block font-semibold text-slate-900 mb-1">
                  Target Start Time (IST):
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="time"
                    step="900"
                    value={targetTime}
                    onChange={e => setTargetTime(e.target.value)}
                    className="flex-1 p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-hidden"
                  />
                  <span className="text-slate-500 font-mono text-xs font-semibold px-2 py-1 bg-slate-100 rounded border border-slate-200">
                    IST
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">You can type or select any time (e.g. 09:30, 10:00, 10:30, 11:30).</p>
              </div>

              {/* 1-Click Test Presets */}
              <div className="p-3 bg-slate-50/90 rounded-lg border border-slate-200 space-y-2">
                <div className="font-semibold text-slate-800 text-[11px] flex items-center gap-1">
                  <Zap className="w-3 h-3 text-amber-500" />
                  <span>Conflict Testing Quick Presets:</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setTargetRoom('room-b');
                      setTargetTime('10:30');
                    }}
                    className="px-2.5 py-1 text-[11px] rounded bg-red-100 hover:bg-red-200 text-red-800 font-medium transition cursor-pointer"
                  >
                    🔴 Room B at 10:30 AM (Test Dr. Rao Panel Conflict)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTargetRoom('room-a');
                      setTargetTime('09:30');
                    }}
                    className="px-2.5 py-1 text-[11px] rounded bg-amber-100 hover:bg-amber-200 text-amber-800 font-medium transition cursor-pointer"
                  >
                    🟡 Room A at 09:30 AM (Test Room Overlap)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTargetRoom('room-c');
                      setTargetTime('11:30');
                    }}
                    className="px-2.5 py-1 text-[11px] rounded bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-medium transition cursor-pointer"
                  >
                    🟢 Room C at 11:30 AM (Clean Available Slot)
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setMoveDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="default"
                size="sm"
                isLoading={isValidatingMove}
                onClick={handleExecuteMove}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isValidatingMove ? 'Validating on Server...' : 'Confirm Move (Server Validated)'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Schedule New Slot Dialog Modal */}
      {createDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={() => setCreateDialogOpen(false)} aria-hidden="true" />
          <div className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl border border-slate-200 p-6 space-y-4 z-10 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Plus className="w-4 h-4 text-blue-600" />
                <span>Schedule New Interview Slot</span>
              </h3>
              <button
                type="button"
                onClick={() => setCreateDialogOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs space-y-3.5">
              <p className="text-slate-600 leading-relaxed">
                Add an interview to the timetable. The server runs real-time deterministic conflict detection against all rooms, interviewers, and student schedules.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Candidate Selection */}
                <div>
                  <label className="block font-semibold text-slate-900 mb-1">Candidate:</label>
                  <select
                    value={createStudentId}
                    onChange={e => setCreateStudentId(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  >
                    <option value="stu-001">Aarav Sharma (DEMO-0001)</option>
                    <option value="stu-002">Priya Patel (DEMO-0002)</option>
                    <option value="stu-003">Rohan Verma (DEMO-0003)</option>
                    <option value="stu-004">Sneha Iyer (DEMO-0004)</option>
                    <option value="stu-005">Vikram Malhotra (DEMO-0005)</option>
                    <option value="stu-006">Ananya Sen (DEMO-0006)</option>
                  </select>
                </div>

                {/* Company Selection */}
                <div>
                  <label className="block font-semibold text-slate-900 mb-1">Company:</label>
                  <select
                    value={createCompanyId}
                    onChange={e => setCreateCompanyId(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  >
                    <option value="comp-ast">Asteria Systems</option>
                    <option value="comp-har">Harbor Analytics</option>
                    <option value="comp-qnt">QuantumEdge Systems</option>
                  </select>
                </div>

                {/* Assigned Room */}
                <div>
                  <label className="block font-semibold text-slate-900 mb-1">Interview Room:</label>
                  <select
                    value={createRoomId}
                    onChange={e => setCreateRoomId(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  >
                    <option value="room-a">Room A (Newton Hall)</option>
                    <option value="room-b">Room B (Turing Lab)</option>
                    <option value="room-c">Room C (Babbage Suite)</option>
                  </select>
                </div>

                {/* Interviewer Panel */}
                <div>
                  <label className="block font-semibold text-slate-900 mb-1">Interviewer Panel:</label>
                  <select
                    value={createInterviewerId}
                    onChange={e => setCreateInterviewerId(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  >
                    <option value="int-1">Dr. V. Rao (Lead Faculty)</option>
                    <option value="int-2">Prof. A. Sharma (Technical Panel)</option>
                    <option value="int-4">Dr. N. Anand (Industry Expert)</option>
                    <option value="int-3">Dr. K. Iyer (Department Rep)</option>
                  </select>
                </div>

                {/* Start Time Input */}
                <div>
                  <label className="block font-semibold text-slate-900 mb-1">Start Time (IST):</label>
                  <input
                    type="time"
                    step="900"
                    value={createTime}
                    onChange={e => setCreateTime(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-hidden"
                  />
                </div>

                {/* Duration */}
                <div>
                  <label className="block font-semibold text-slate-900 mb-1">Duration:</label>
                  <select
                    value={createDuration}
                    onChange={e => setCreateDuration(Number(e.target.value))}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  >
                    <option value={30}>30 Minutes</option>
                    <option value={45}>45 Minutes</option>
                    <option value={60}>60 Minutes</option>
                  </select>
                </div>
              </div>

              {/* Conflict Presets for New Slots */}
              <div className="p-3 bg-slate-50/90 rounded-lg border border-slate-200 space-y-2">
                <div className="font-semibold text-slate-800 text-[11px] flex items-center gap-1">
                  <Zap className="w-3 h-3 text-amber-500" />
                  <span>Test Conflict Triggers:</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setCreateInterviewerId('int-1'); // Dr. Rao
                      setCreateRoomId('room-b');
                      setCreateTime('10:00'); // Clashes with Dr. Rao in Room A!
                    }}
                    className="px-2 py-1 text-[11px] rounded bg-red-100 hover:bg-red-200 text-red-800 font-medium cursor-pointer"
                  >
                    🔴 Test Panel Clash (Dr. Rao in Room B at 10:00 AM)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCreateRoomId('room-a');
                      setCreateTime('09:30'); // Room A occupied at 09:30
                    }}
                    className="px-2 py-1 text-[11px] rounded bg-amber-100 hover:bg-amber-200 text-amber-800 font-medium cursor-pointer"
                  >
                    🟡 Test Room Clash (Room A at 09:30 AM)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCreateStudentId('stu-001'); // Aarav Sharma
                      setCreateRoomId('room-c');
                      setCreateTime('09:30'); // Aarav already has interview at 09:30!
                    }}
                    className="px-2 py-1 text-[11px] rounded bg-purple-100 hover:bg-purple-200 text-purple-800 font-medium cursor-pointer"
                  >
                    🟣 Test Student Double-Booking (Aarav at 09:30 AM)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCreateRoomId('room-c');
                      setCreateTime('11:30');
                      setCreateStudentId('stu-005');
                      setCreateInterviewerId('int-4');
                    }}
                    className="px-2 py-1 text-[11px] rounded bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-medium cursor-pointer"
                  >
                    🟢 Clean Available Slot (Room C at 11:30 AM)
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCreateDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="default"
                size="sm"
                isLoading={isCreatingSlot}
                onClick={handleExecuteCreate}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isCreatingSlot ? 'Checking Conflicts...' : 'Check & Schedule Slot'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Submit Draft Dialog */}
      {submitDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={() => setSubmitDialogOpen(false)} aria-hidden="true" />
          <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl border border-slate-200 p-6 space-y-4 z-10 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-base font-bold text-slate-900">Submit Draft for Approval</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Submitting generates a formal recovery proposal with a before/after comparison. A Placement Officer or Administrator must review and approve before publication.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-900 mb-1">Proposal Note / Rationale:</label>
              <textarea
                rows={3}
                placeholder="Explain the changes made in this draft..."
                value={submissionNote}
                onChange={e => setSubmissionNote(e.target.value)}
                className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSubmitDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="default"
                size="sm"
                isLoading={isSubmittingDraft}
                onClick={handleSubmitDraft}
              >
                Submit Proposal
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
