import React from 'react';
import { useRouteError, isRouteErrorResponse, useNavigate } from 'react-router-dom';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const ErrorPage: React.FC = () => {
  const error = useRouteError();
  const navigate = useNavigate();

  let errorMessage = 'An unexpected error occurred in Placement Command.';
  let statusCode = '500';
  const correlationId = `ERR-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

  if (isRouteErrorResponse(error)) {
    statusCode = String(error.status);
    errorMessage = error.statusText || error.data?.message || errorMessage;
  } else if (error instanceof Error) {
    errorMessage = error.message;
  }

  const handleReset = () => {
    window.location.href = '/overview';
  };

  const handleReload = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-[#F4F7FB] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-red-50 text-[#DC2626] flex items-center justify-center mb-4 border border-red-200 shadow-xs">
        <AlertTriangle className="w-8 h-8" />
      </div>

      <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-red-50 text-[#DC2626] border border-red-200 mb-2">
        Error {statusCode}
      </div>

      <h1 className="text-2xl font-bold text-[#142C4E] mb-2">Application Error Encountered</h1>
      <p className="text-sm text-[#64748B] max-w-lg mb-4 leading-relaxed">
        {errorMessage}
      </p>

      <div className="bg-white border border-[#E2E8F0] rounded-lg p-3 max-w-md w-full mb-6 text-left shadow-2xs">
        <div className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider mb-1">
          Diagnostics & Correlation
        </div>
        <div className="font-mono text-xs text-[#172033] break-all select-all">
          ID: {correlationId}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={handleReload}
          className="gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Reload View</span>
        </Button>

        <Button
          variant="default"
          size="sm"
          onClick={handleReset}
          className="gap-2"
        >
          <Home className="w-4 h-4" />
          <span>Reset to Overview</span>
        </Button>
      </div>
    </div>
  );
};
