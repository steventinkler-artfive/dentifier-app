import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Loader2 } from 'lucide-react';

export default function Home() {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to dashboard immediately on page load
    navigate(createPageUrl('Dashboard'), { replace: true });
  }, [navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-950">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-rose-600 mb-2" />
        <p className="text-white">Redirecting to Dashboard...</p>
      </div>
    </div>
  );
}