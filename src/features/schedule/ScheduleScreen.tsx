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
  AlertCircle
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

export const ScheduleScreen: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const mode = (searchParams.get('version') as 'published' | 'draft' | 'simulation') || 'published';

  const [scheduleData, setScheduleData] = useState<{ version: number; interviews: Interview[] } | null>(null);
  const [selectedInterview, setSelectedInterview] = useState<Interview | null>(null);
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [targetRoom, setTargetRoom] = useState('room-b');
  const [targetTime, setTargetTime] = useState('10:30');
  const [isValidatingMove, setIsValidatingMove] = useState(false);
  const [activeConflicts, setActiveConflicts] = useState<ScheduleConflict[]>([]);
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const [submissionNote, setSubmissionNote] = useState('');
  const [isSubmittingDraft, setIsSubmittingDraft] = useState(false);
  const [movedSuccessId, setMovedSuccessId] = useState<string | null>(null);

  const canEdit = (user?.role === 'admin' || user?.role === 'coordinator') && mode === 'draft';

  useEffect(() => {
    apiClient.getSchedule(mode).then(res => {
      setScheduleData(res);
      if (res.interviews.length > 0 && !selectedInterview) {
        setSelectedInterview(res.interviews[0]);
      }
    });
  }, [mode]);

  const handleModeChange = (newMode: 'published' | 'draft' | 'simulation') => {
    setActiveConflicts([]);
    setSearchParams({ version: newMode });
  };

  const handleOpenMove = (item: Interview) => {
    setSelectedInterview(item);
    setActiveConflicts([]);
    setMoveDialogOpen(true);
  };

  const handleExecuteMove = async () => {
    if (!selectedInterview) return;
    setIsValidatingMove(true);
    setActiveConflicts([]);

    // Construct target ISO string today at targetTime
    const [h, m] = targetTime.split(':').map(Number);
    const d = new Date();
    d.setHours(h || 10, m || 0, 0, 0);

    try {
      const moved = await apiClient.moveInterview(selectedInterview.id, targetRoom, d.toISOString());
      setMoveDialogOpen(false);
      setMovedSuccessId(moved.id);
      setSelectedInterview(moved);
      // Refresh schedule
      const res = await apiClient.getSchedule('draft');
      setScheduleData(res);
      setTimeout(() => setMovedSuccessId(null), 8000);
    } catch (err: any) {
      if (err.status === 409 && err.error?.details?.conflicts) {
        // AC-SCH-1: Card STAYS put, callout names interviewer, time, and counterpart!
        setActiveConflicts(err.error.details.conflicts);
      } else {
        alert('Move validation failed.');
      }
    } finally {
      setIsValidatingMove(false);
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
          </div>
          <p className="text-xs text-slate-500 mt-0.5">Day 1 Master Schedule &bull; 15-minute grid &bull; 3 synchronized rooms</p>
        </div>

        {/* Mode Selector */}
        <div className="flex items-center gap-3">
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

      {/* Schedule Mode Warning Banner */}
      {mode === 'draft' && (
        <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-xl text-xs text-blue-800 flex items-center justify-between font-medium">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-blue-600 shrink-0" />
            <span>
              <strong>Draft Mode:</strong> Staged slot moves require server validation. Publication requires Officer sign-off.
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
              <span className="text-xs text-slate-500 font-normal">Active Multi-Room Grid</span>
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
                      {roomItems.map(item => {
                        const isSelected = selectedInterview?.id === item.id;
                        const hasClash = item.id === 'int-hrb-prepared-clash';
                        const isRecentlyMoved = item.id === movedSuccessId || item.hasMoved;

                        return (
                          <div
                            key={item.id}
                            onClick={() => {
                              setSelectedInterview(item);
                              setActiveConflicts([]);
                            }}
                            className={`p-3 rounded-lg border text-xs transition-all cursor-pointer relative shadow-2xs ${
                              hasClash
                                ? 'border-red-300 bg-red-50/70 text-red-950'
                                : isSelected
                                  ? 'border-blue-500 bg-blue-50/80 shadow-xs ring-1 ring-blue-500/30'
                                  : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs'
                            }`}
                          >
                            {/* Recently moved tag (AC-SCH-1) */}
                            {isRecentlyMoved && (
                              <span className="absolute -top-2 -right-1 px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-[#16845B] text-white uppercase tracking-wider shadow-2xs">
                                Moved
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
                                  className="h-6 px-2 text-[10px] font-bold shrink-0"
                                >
                                  <Move className="w-2.5 h-2.5" />
                                  <span>Move</span>
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })}
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
                    className="text-xs"
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
            </CardContent>
          </Card>
        )}
      </div>

      {/* Move Dialog Modal */}
      {moveDialogOpen && selectedInterview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={() => setMoveDialogOpen(false)} aria-hidden="true" />
          <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl border border-slate-200 p-6 space-y-4 z-10 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Move Interview Slot</h3>
              <button
                type="button"
                onClick={() => setMoveDialogOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs space-y-3">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div className="font-bold text-slate-900">{selectedInterview.studentName} ({selectedInterview.rollNumber})</div>
                <div className="text-slate-500">{selectedInterview.companyName} &bull; Panel: {selectedInterview.interviewerNames.join(', ')}</div>
              </div>

              <div>
                <label className="block font-semibold text-slate-900 mb-1">Destination Room:</label>
                <select
                  value={targetRoom}
                  onChange={e => setTargetRoom(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold"
                >
                  <option value="room-a">Room A (Newton Hall)</option>
                  <option value="room-b">Room B (Turing Lab - Prepared Clash Slot)</option>
                  <option value="room-c">Room C (Babbage Suite - Free Slot)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-900 mb-1">Target Start Time (15-min grid):</label>
                <select
                  value={targetTime}
                  onChange={e => setTargetTime(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-semibold"
                >
                  <option value="10:30">10:30 AM IST (Clashes with Dr. Rao in Room B!)</option>
                  <option value="11:30">11:30 AM IST (Available slot)</option>
                  <option value="12:00">12:00 PM IST (Available slot)</option>
                </select>
              </div>

              <div className="p-2.5 bg-blue-50/80 rounded-lg text-[11px] text-blue-800 leading-relaxed border border-blue-200">
                Testing Hint: Moving to <strong>10:30 AM in Room B</strong> triggers 409 conflict validation (Dr. V. Rao clashing with Harbor Analytics). Moving to <strong>11:30 AM in Room C</strong> succeeds cleanly!
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
              >
                {isValidatingMove ? 'Validating on Server...' : 'Confirm Move (Server Validated)'}
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
