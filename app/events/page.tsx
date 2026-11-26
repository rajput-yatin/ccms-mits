'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Calendar, Clock, MapPin, Search, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { ClubEvent } from '@/types/database';

export default function EventsPage() {
  const [events, setEvents] = useState<ClubEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  useEffect(() => {
    const fetchEvents = async () => {
      const { data } = await supabase
        .from('events')
        .select('*, clubs(name, slug, category)')
        .order('event_date', { ascending: true });

      if (data) setEvents(data as ClubEvent[]);
      setLoading(false);
    };
    fetchEvents();
  }, []);

  const filtered = events.filter((ev) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      ev.title.toLowerCase().includes(q) ||
      ev.venue.toLowerCase().includes(q) ||
      ev.description.toLowerCase().includes(q) ||
      (ev.clubs?.name || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
            Campus Calendar
          </span>
          <h1 className="mt-1 text-3xl font-extrabold text-slate-900">
            Upcoming Events at MITS-DU
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Workshops, competitions, auditions, and talks hosted by campus clubs.
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search events or venues..."
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm focus:border-indigo-500 focus:outline-none"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-500">
          <Loader2 className="mr-2 h-5 w-5 animate-spin text-indigo-600" />
          Loading events...
        </div>
      ) : filtered.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <Calendar className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-3 text-sm font-semibold text-slate-700">
            No upcoming events found
          </p>
        </div>
      ) : (
        <div className="mt-8 grid gap-5 md:grid-cols-2">
          {filtered.map((ev) => {
            const dt = new Date(ev.event_date);
            return (
              <div
                key={ev.id}
                className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-indigo-200 hover:shadow-md"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700">
                    <span className="text-xs font-bold uppercase">
                      {dt.toLocaleDateString('en-IN', { month: 'short' })}
                    </span>
                    <span className="text-2xl font-extrabold leading-none">
                      {dt.getDate()}
                    </span>
                  </div>

                  <div className="flex-1">
                    {ev.clubs && (
                      <Link
                        href={`/clubs/${ev.clubs.slug}`}
                        className="inline-block rounded-full bg-indigo-50 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-100"
                      >
                        {ev.clubs.name}
                      </Link>
                    )}
                    <h2 className="mt-2 text-lg font-bold text-slate-900">
                      {ev.title}
                    </h2>
                    <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                      {ev.description}
                    </p>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 text-xs text-slate-500">
                  <div className="flex flex-wrap items-center gap-4">
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-indigo-500" />
                      {dt.toLocaleDateString('en-IN', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                      })}{' '}
                      •{' '}
                      {dt.toLocaleTimeString('en-IN', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-indigo-500" />
                      {ev.venue}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}