import React, { useState, useEffect } from 'react';
import { 
  Search, 
  RefreshCw,
  ChevronRight
} from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import type { AuditEntry } from '@/lib/api/types';
import { formatDateTimeIST } from '@/lib/format/date';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export const AuditScreen: React.FC = () => {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<AuditEntry | null>(null);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    apiClient.getAudit(50)
      .then(res => {
        setEntries(res);
        if (res.length > 0 && !selectedEntry) {
          setSelectedEntry(res[0]);
        }
      })
      .finally(() => setIsLoading(false));
  }, []);

  const filtered = entries.filter(e => {
    if (categoryFilter !== 'all' && e.category !== categoryFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        e.summary.toLowerCase().includes(q) ||
        e.actor?.name?.toLowerCase().includes(q) ||
        e.action.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200/90 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-base font-bold text-slate-900 tracking-tight">Official Operations Audit Log</h1>
          <p className="text-xs text-slate-500 mt-0.5">Immutable, chronological record of system mutations, proposals, and decisions</p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            apiClient.getAudit(50).then(res => setEntries(res));
          }}
          className="text-xs"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Audit Stream</span>
        </Button>
      </div>

      {/* Filters Bar */}
      <Card className="p-3 flex gap-3 flex-wrap items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search audit actions, actors, or summaries..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-hidden focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <select
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
          className="text-xs bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg px-3 py-1.5 font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500 cursor-pointer"
        >
          <option value="all">All Categories</option>
          <option value="company">Company & Criteria</option>
          <option value="capacity">Capacity Allocation</option>
          <option value="schedule">Schedule Releases</option>
          <option value="live">Live Operations</option>
          <option value="recovery">Recovery Proposals</option>
          <option value="approval">Officer Approvals</option>
          <option value="auth">Security & Roles</option>
        </select>
      </Card>

      {/* Main Table + Detail Drawer */}
      <div className="flex flex-col xl:flex-row gap-6 items-start">
        {/* Table */}
        <Card className="flex-1 w-full overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Timestamp (IST)</th>
                  <th className="py-3 px-3">Category</th>
                  <th className="py-3 px-3">Actor</th>
                  <th className="py-3 px-4">Event Summary</th>
                  <th className="py-3 px-3 text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(entry => {
                  const isSelected = selectedEntry?.id === entry.id;

                  return (
                    <tr
                      key={entry.id}
                      onClick={() => setSelectedEntry(entry)}
                      className={`cursor-pointer transition-colors ${
                        isSelected ? 'bg-blue-50/80 font-medium' : 'hover:bg-slate-50/80'
                      }`}
                    >
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-500 tabular-nums">
                        {formatDateTimeIST(entry.timestamp)}
                      </td>

                      <td className="py-3 px-3">
                        <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider py-0">
                          {entry.category}
                        </Badge>
                      </td>

                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-900">{entry.actor?.name ?? '—'}</div>
                        <div className="text-[10px] text-slate-500 uppercase">{entry.actor?.role?.replace('_', ' ') ?? ''}</div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="text-slate-900 font-semibold">{entry.summary}</div>
                        <div className="font-mono text-[11px] text-slate-500">{entry.action}</div>
                      </td>

                      <td className="py-3 px-3 text-right">
                        <ChevronRight className="w-4 h-4 text-slate-400 inline" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Selected Entry Detail Rail */}
        {selectedEntry && (
          <Card className="w-full xl:w-96 shrink-0 p-5 space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">Audit Record</span>
              <h3 className="text-base font-bold text-slate-900 mt-0.5">{selectedEntry.summary}</h3>
              <div className="font-mono text-xs text-blue-600 font-semibold">{selectedEntry.action}</div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Record ID:</span>
                  <span className="font-mono text-slate-900">{selectedEntry.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Timestamp:</span>
                  <span className="font-mono text-slate-900">{formatDateTimeIST(selectedEntry.timestamp)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Actor Name:</span>
                  <span className="font-semibold text-slate-900">{selectedEntry.actor?.name ?? '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Actor Role:</span>
                  <span className="capitalize font-semibold text-blue-700">{selectedEntry.actor?.role?.replace('_', ' ') ?? '—'}</span>
                </div>
              </div>

              {/* JSON Metadata Payload */}
              <div>
                <span className="text-[11px] font-semibold text-slate-500 block mb-1">Payload Metadata:</span>
                <pre className="p-3 bg-slate-900 text-slate-100 rounded-lg text-[11px] font-mono overflow-x-auto leading-relaxed">
                  {JSON.stringify(selectedEntry.details, null, 2)}
                </pre>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};
