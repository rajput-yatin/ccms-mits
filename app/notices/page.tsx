'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Megaphone, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Notice } from '@/types/database';

export default function NoticesPage() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'campus' | 'club'>('all');

  useEffect(() => {
    const fetchNotices = async () => {
      const { data } = await supabase
        .from('notices')
        .select('*, clubs(name, slug)')
        .order('created_at', { ascending: false });

      if (data) setNotices(data as Notice[]);
      setLoading(false);
    };
    fetchNotices();
  }, []);

  const filtered = notices.filter((n) => {
    if (filter === 'campus') return n.club_id === null;
    if (filter === 'club') return n.club_id !== null;
    return true;
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
            Broadcast Feed
          </span>
          <h1 className="mt-1 text-3xl font-extrabold text-slate-900">
            Campus Notice Board
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Official announcements from MITS-DU administration and student clubs.
          </p>
        </div>

        <div className="flex items-center gap-1.5 rounded-xl bg-slate-200/70 p-1">
          {(['all', 'campus', 'club'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition ${
                filter === tab
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab === 'all' ? 'All' : tab === 'campus' ? 'Campus-Wide' : 'Club Notices'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-500">
          <Loader2 className="mr-2 h-5 w-5 animate-spin text-indigo-600" />
          Loading notices...
        </div>
      ) : filtered.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-sm text-slate-500">
          No notices available in this category.
        </div>
      ) : (
        <div className="mt-8 space-y-4">
          {filtered.map((notice) => {
            const isCampusWide = !notice.club_id;
            return (
              <div
                key={notice.id}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  {isCampusWide ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-700">
                      <Megaphone className="h-3.5 w-3.5" />
                      Campus-Wide • MITS-DU
                    </span>
                  ) : (
                    <Link
                      href={`/clubs/${notice.clubs?.slug}`}
                      className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
                    >
                      <Megaphone className="h-3.5 w-3.5" />
                      {notice.clubs?.name}
                    </Link>
                  )}

                  <span className="text-xs text-slate-400">
                    {new Date(notice.created_at).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                </div>

                <h2 className="mt-3 text-lg font-bold text-slate-900">
                  {notice.title}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  {notice.content}
                </p>

                <div className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-400">
                  Posted by <span className="font-medium text-slate-600">{notice.posted_by}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}