'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FileText, ExternalLink, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Application, ApplicationStatus } from '@/types/database';

function statusBadgeClass(status: ApplicationStatus) {
  switch (status) {
    case 'Applied':
      return 'bg-sky-50 text-sky-700 ring-sky-200';
    case 'Shortlisted':
      return 'bg-indigo-50 text-indigo-700 ring-indigo-200';
    case 'Interview Scheduled':
      return 'bg-amber-50 text-amber-700 ring-amber-200';
    case 'Accepted':
      return 'bg-emerald-50 text-emerald-700 ring-emerald-200';
    case 'Rejected':
      return 'bg-rose-50 text-rose-700 ring-rose-200';
  }
}

export default function MyApplicationsPage() {
  const { user, loading: authLoading } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadApps = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from('applications')
        .select('*, clubs(name, slug, category)')
        .eq('student_id', user.id)
        .order('created_at', { ascending: false });

      if (data) setApplications(data as Application[]);
      setLoading(false);
    };

    if (!authLoading) loadApps();
  }, [user, authLoading]);

  if (authLoading || loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-slate-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin text-indigo-600" />
        Loading your applications...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <h1 className="text-2xl font-bold text-slate-900">Sign in required</h1>
        <p className="mt-2 text-sm text-slate-500">
          Please sign in to view and track your MITS-DU club applications.
        </p>
        <Link
          href="/auth"
          className="mt-5 inline-block rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          Go to Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex items-end justify-between">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
            Student Portal
          </span>
          <h1 className="mt-1 text-3xl font-extrabold text-slate-900">
            My Applications
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Track live updates as club leads review your application and resume.
          </p>
        </div>
        <Link
          href="/"
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Explore More Clubs
        </Link>
      </div>

      {applications.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <FileText className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-3 text-base font-semibold text-slate-800">
            You haven&apos;t applied to any clubs yet
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Browse MITS-DU clubs and submit your application with a PDF resume.
          </p>
          <Link
            href="/"
            className="mt-5 inline-block rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            Browse Clubs
          </Link>
        </div>
      ) : (
        <div className="mt-8 space-y-4">
          {applications.map((app) => (
            <div
              key={app.id}
              className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <Link
                    href={`/clubs/${app.clubs?.slug}`}
                    className="text-lg font-bold text-slate-900 hover:text-indigo-600"
                  >
                    {app.clubs?.name}
                  </Link>
                  <span
                    className={`rounded-full px-3 py-0.5 text-xs font-semibold ring-1 ring-inset ${statusBadgeClass(
                      app.status
                    )}`}
                  >
                    {app.status}
                  </span>
                </div>

                {app.statement && (
                  <p className="mt-2 line-clamp-2 max-w-2xl text-sm text-slate-600">
                    {app.statement}
                  </p>
                )}

                <div className="mt-2 text-xs text-slate-400">
                  Applied on{' '}
                  {new Date(app.created_at).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}{' '}
                  • {app.roll_number} ({app.branch})
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-3">
                {app.resume_url && (
                  <a
                    href={app.resume_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    <FileText className="h-3.5 w-3.5 text-indigo-600" />
                    Uploaded PDF
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}