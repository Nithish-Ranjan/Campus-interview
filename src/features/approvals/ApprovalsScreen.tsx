import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Clock, 
  CheckCircle2, 
  ArrowRight, 
  User
} from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import type { RecoveryProposal } from '@/lib/api/types';
import { formatDateTimeIST } from '@/lib/format/date';
import { useAuth } from '@/lib/auth/authContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export const ApprovalsScreen: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [proposals, setProposals] = useState<RecoveryProposal[]>([]);
  const [activeTab, setActiveTab] = useState<'pending' | 'decided'>('pending');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    apiClient.getProposals()
      .then(res => setProposals(res))
      .finally(() => setIsLoading(false));
  }, []);

  const pending = proposals.filter(p => p.status === 'pending_approval');
  const decided = proposals.filter(p => p.status === 'approved' || p.status === 'rejected');

  const isOfficerOrAdmin = user?.role === 'officer' || user?.role === 'admin';

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-14 bg-slate-200/80 rounded-xl" />
        <div className="h-44 bg-slate-200/80 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200/90 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-base font-bold text-slate-900 tracking-tight">Schedule Change Approvals Queue</h1>
            <Badge variant="outline" className="font-mono text-xs">
              {pending.length} Pending Decision
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {isOfficerOrAdmin 
              ? 'Authorized to review diffs and publish schedule versions' 
              : 'Coordinator View (Read-only approval queue)'}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-slate-200 text-xs font-semibold">
        <button
          type="button"
          onClick={() => setActiveTab('pending')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
            activeTab === 'pending'
              ? 'border-blue-600 text-blue-700 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Pending Decisions ({pending.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('decided')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
            activeTab === 'decided'
              ? 'border-blue-600 text-blue-700 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>Decided Proposals ({decided.length})</span>
        </button>
      </div>

      {/* Proposals List */}
      <div className="space-y-3">
        {(activeTab === 'pending' ? pending : decided).length === 0 ? (
          <Card className="p-12 text-center text-xs text-slate-500">
            No proposals found in this queue.
          </Card>
        ) : (
          (activeTab === 'pending' ? pending : decided).map(prop => {
            const isApproved = prop.status === 'approved';
            const isRejected = prop.status === 'rejected';

            return (
              <Card
                key={prop.id}
                onClick={() => navigate(`/approvals/${prop.id}`)}
                className="hover:border-blue-500/80 hover:shadow-md transition-all cursor-pointer p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 group"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="font-mono text-xs font-bold">
                      {prop.id}
                    </Badge>
                    <h2 className="text-sm font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
                      {prop.title}
                    </h2>
                    {prop.status === 'pending_approval' && (
                      <Badge variant="warning" className="text-[10px]">
                        Awaiting Officer Decision
                      </Badge>
                    )}
                    {isApproved && (
                      <Badge variant="success" className="text-[10px]">
                        Approved & Published (v{prop.proposedScheduleVersion})
                      </Badge>
                    )}
                    {isRejected && (
                      <Badge variant="destructive" className="text-[10px]">
                        Rejected
                      </Badge>
                    )}
                  </div>

                  <p className="text-xs text-slate-600 line-clamp-1">{prop.description}</p>

                  <div className="flex items-center gap-4 text-[11px] text-slate-500 pt-1">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3 text-slate-400" />
                      <span>Created by {prop.createdByUserName}</span>
                    </span>
                    <span>&bull;</span>
                    <span>{formatDateTimeIST(prop.createdAt)}</span>
                    <span>&bull;</span>
                    <span className="font-mono font-semibold text-slate-800">{(prop.diffItems ?? []).length} slot adjustments</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/approvals/${prop.id}`);
                    }}
                    className="text-xs text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors"
                  >
                    <span>Inspect Before/After Diff</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};
