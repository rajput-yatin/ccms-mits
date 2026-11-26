'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Users,
  UserCheck,
  Calendar,
  Megaphone,
  Search,
  Eye,
  FileText,
  ExternalLink,
  Trash2,
  Plus,
  Loader2,
  X,
  MapPin,
  Clock,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import {
  Application,
  ApplicationStatus,
  Club,
  ClubEvent,
  Notice,
} from '@/types/database';

const STATUS_OPTIONS: ApplicationStatus[] = [
  'Applied',
  'Shortlisted',
  'Interview Scheduled',
  'Accepted',
  'Rejected',
];

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

export default function ClubLeadDashboardPage() {
  const { user, profile, loading: authLoading } = useAuth();

  const [clubs, setClubs] = useState<Club[]>([]);
  const [selectedClubId, setSelectedClubId] = useState<string>('');
  const [applications, setApplications] = useState<Application[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [events, setEvents] = useState<ClubEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<'ats' | 'notices' | 'events'>('ats');

  // ATS Filters & Modal
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | ApplicationStatus>('All');
  const [viewingApp, setViewingApp] = useState<Application | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Notice Form
  const [noticeTitle, setNoticeTitle] = useState('');
  const [noticeContent, setNoticeContent] = useState('');
  const [postingNotice, setPostingNotice] = useState(false);

  // Event Form
  const [eventTitle, setEventTitle] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventVenue, setEventVenue] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [postingEvent, setPostingEvent] = useState(false);

  const activeClub = useMemo(
    () => clubs.find((c) => c.id === selectedClubId) || null,
    [clubs, selectedClubId]
  );

  // Load all clubs initially
  useEffect(() => {
    const loadClubs = async () => {
      const { data } = await supabase.from('clubs').select('*').order('name');
      if (data && data.length > 0) {
        const clubList = data as Club[];
        setClubs(clubList);

        if (profile?.managed_club_id && clubList.some((c) => c.id === profile.managed_club_id)) {
          setSelectedClubId(profile.managed_club_id);
        } else {
          // Default to MLRC if present, else first club
          const mlrc = clubList.find((c) => c.slug === 'mlrc');
          setSelectedClubId(mlrc ? mlrc.id : clubList[0].id);
        }
      }
      setLoading(false);
    };

    if (!authLoading && profile && (profile.role === 'club_lead' || profile.role === 'super_admin')) {
      loadClubs();
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [authLoading, profile]);

  // Load club-specific ATS, Notices, Events whenever selectedClubId changes
  useEffect(() => {
    const loadClubWorkspace = async () => {
      if (!selectedClubId) return;

      const [appsRes, noticesRes, eventsRes] = await Promise.all([
        supabase
          .from('applications')
          .select('*')
          .eq('club_id', selectedClubId)
          .order('created_at', { ascending: false }),
        supabase
          .from('notices')
          .select('*')
          .eq('club_id', selectedClubId)
          .order('created_at', { ascending: false }),
        supabase
          .from('events')
          .select('*')
          .eq('club_id', selectedClubId)
          .order('event_date', { ascending: true }),
      ]);

      if (appsRes.data) setApplications(appsRes.data as Application[]);
      if (noticesRes.data) setNotices(noticesRes.data as Notice[]);
      if (eventsRes.data) setEvents(eventsRes.data as ClubEvent[]);
    };

    loadClubWorkspace();
  }, [selectedClubId]);

  const filteredApps = useMemo(() => {
    return applications.filter((app) => {
      const matchesStatus = statusFilter === 'All' || app.status === statusFilter;
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        app.applicant_name.toLowerCase().includes(q) ||
        app.roll_number.toLowerCase().includes(q) ||
        app.branch.toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [applications, searchQuery, statusFilter]);

  const pendingCount = useMemo(
    () =>
      applications.filter(
        (a) =>
          a.status === 'Applied' ||
          a.status === 'Shortlisted' ||
          a.status === 'Interview Scheduled'
      ).length,
    [applications]
  );

  const handleStatusChange = async (app: Application, newStatus: ApplicationStatus) => {
    setUpdatingId(app.id);
    const prevStatus = app.status;

    const { error } = await supabase
      .from('applications')
      .update({ status: newStatus })
      .eq('id', app.id);

    if (!error) {
      setApplications((prev) =>
        prev.map((a) => (a.id === app.id ? { ...a, status: newStatus } : a))
      );

      if (viewingApp && viewingApp.id === app.id) {
        setViewingApp({ ...viewingApp, status: newStatus });
      }

      // Auto-increment member_count if newly Accepted
      if (activeClub && prevStatus !== 'Accepted' && newStatus === 'Accepted') {
        const nextCount = activeClub.member_count + 1;
        await supabase
          .from('clubs')
          .update({ member_count: nextCount })
          .eq('id', activeClub.id);
        setClubs((prev) =>
          prev.map((c) => (c.id === activeClub.id ? { ...c, member_count: nextCount } : c))
        );
      }
    }
    setUpdatingId(null);
  };

  const handleToggleRecruiting = async () => {
    if (!activeClub) return;
    const nextVal = !activeClub.is_recruiting;

    const { error } = await supabase
      .from('clubs')
      .update({ is_recruiting: nextVal })
      .eq('id', activeClub.id);

    if (!error) {
      setClubs((prev) =>
        prev.map((c) => (c.id === activeClub.id ? { ...c, is_recruiting: nextVal } : c))
      );
    }
  };

  const handlePostNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeClub || !profile) return;
    setPostingNotice(true);

    const { data, error } = await supabase
      .from('notices')
      .insert({
        club_id: activeClub.id,
        title: noticeTitle,
        content: noticeContent,
        posted_by: `${profile.full_name} (${activeClub.name})`,
      })
      .select()
      .single();

    if (!error && data) {
      setNotices((prev) => [data as Notice, ...prev]);
      setNoticeTitle('');
      setNoticeContent('');
    }
    setPostingNotice(false);
  };

  const handleDeleteNotice = async (id: string) => {
    const { error } = await supabase.from('notices').delete().eq('id', id);
    if (!error) {
      setNotices((prev) => prev.filter((n) => n.id !== id));
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeClub) return;
    setPostingEvent(true);

    const { data, error } = await supabase
      .from('events')
      .insert({
        club_id: activeClub.id,
        title: eventTitle,
        description: eventDescription,
        event_date: new Date(eventDate).toISOString(),
        venue: eventVenue,
      })
      .select()
      .single();

    if (!error && data) {
      setEvents((prev) =>
        [...prev, data as ClubEvent].sort(
          (a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime()
        )
      );
      setEventTitle('');
      setEventDate('');
      setEventVenue('');
      setEventDescription('');
    }
    setPostingEvent(false);
  };

  const handleDeleteEvent = async (id: string) => {
    const { error } = await supabase.from('events').delete().eq('id', id);
    if (!error) {
      setEvents((prev) => prev.filter((ev) => ev.id !== id));
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-slate-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin text-indigo-600" />
        Loading Club Lead Dashboard...
      </div>
    );
  }

  if (!user || !profile || (profile.role !== 'club_lead' && profile.role !== 'super_admin')) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <h1 className="text-2xl font-bold text-slate-900">Club Lead Access Required</h1>
        <p className="mt-2 text-sm text-slate-500">
          Sign in with a Club Lead or Super Admin account to access the Applicant Tracking
          System and club operations.
        </p>
        <Link
          href="/auth"
          className="mt-5 inline-block rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          Sign In as Club Lead
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header Row */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
            Club Lead Dashboard
          </span>
          <h1 className="mt-1 text-2xl font-extrabold text-slate-900 sm:text-3xl">
            {activeClub?.name || 'Select a Club'}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Switch Club Selector */}
          <select
            value={selectedClubId}
            onChange={(e) => setSelectedClubId(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm focus:border-indigo-500 focus:outline-none"
          >
            {clubs.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Toggle Recruiting Status */}
          {activeClub && (
            <button
              onClick={handleToggleRecruiting}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold shadow-sm transition ${
                activeClub.is_recruiting
                  ? 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200 hover:bg-emerald-100'
                  : 'bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200 hover:bg-slate-200'
              }`}
            >
              {activeClub.is_recruiting ? (
                <ToggleRight className="h-4 w-4 text-emerald-600" />
              ) : (
                <ToggleLeft className="h-4 w-4 text-slate-400" />
              )}
              {activeClub.is_recruiting ? 'Recruiting: Open' : 'Recruiting: Closed'}
            </button>
          )}
        </div>
      </div>

      {/* KPI Metric Cards (Matches Milestone 2 Slide 5) */}
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <div className="text-2xl font-extrabold text-slate-900">
              {activeClub?.member_count ?? 0}
            </div>
            <div className="text-xs font-medium text-slate-500">Total Members</div>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <UserCheck className="h-5 w-5" />
          </div>
          <div>
            <div className="text-2xl font-extrabold text-slate-900">{pendingCount}</div>
            <div className="text-xs font-medium text-slate-500">Pending Applicants</div>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <Calendar className="h-5 w-5" />
          </div>
          <div>
            <div className="text-2xl font-extrabold text-slate-900">{events.length}</div>
            <div className="text-xs font-medium text-slate-500">Upcoming Events</div>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <Megaphone className="h-5 w-5" />
          </div>
          <div>
            <div className="text-2xl font-extrabold text-slate-900">{notices.length}</div>
            <div className="text-xs font-medium text-slate-500">Total Notices</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-7 flex items-center gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setActiveTab('ats')}
          className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
            activeTab === 'ats'
              ? 'bg-white text-indigo-700 shadow-sm ring-1 ring-slate-200'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Applicant Tracking
        </button>
        <button
          onClick={() => setActiveTab('notices')}
          className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
            activeTab === 'notices'
              ? 'bg-white text-indigo-700 shadow-sm ring-1 ring-slate-200'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Notice Board
        </button>
        <button
          onClick={() => setActiveTab('events')}
          className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
            activeTab === 'events'
              ? 'bg-white text-indigo-700 shadow-sm ring-1 ring-slate-200'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Event Scheduler
        </button>
      </div>

      {/* TAB 1: APPLICANT TRACKING SYSTEM (ATS) */}
      {activeTab === 'ats' && (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
          {/* Table Header Controls */}
          <div className="flex flex-col justify-between gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center">
            <h2 className="text-base font-bold text-slate-900">
              Applicants ({filteredApps.length})
            </h2>

            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search..."
                  className="w-52 rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as 'All' | ApplicationStatus)
                }
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none"
              >
                <option value="All">All statuses</option>
                {STATUS_OPTIONS.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* ATS Table */}
          <div className="overflow-x-auto">
            {filteredApps.length === 0 ? (
              <div className="p-12 text-center text-sm text-slate-500">
                No applicants match your current filter.
              </div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/60 text-xs font-semibold text-slate-500">
                    <th className="px-5 py-3.5">Name</th>
                    <th className="px-5 py-3.5">Branch / Year</th>
                    <th className="px-5 py-3.5">Applied</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5">Update</th>
                    <th className="px-5 py-3.5 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredApps.map((app) => (
                    <tr key={app.id} className="transition hover:bg-slate-50/70">
                      <td className="px-5 py-4">
                        <div className="font-semibold text-slate-900">
                          {app.applicant_name}
                        </div>
                        <div className="text-xs text-slate-400">{app.roll_number}</div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="text-slate-700">{app.branch}</div>
                        <div className="text-xs text-slate-400">{app.year}</div>
                      </td>
                      <td className="px-5 py-4 text-xs text-slate-600">
                        {new Date(app.created_at).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${statusBadgeClass(
                            app.status
                          )}`}
                        >
                          {app.status}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <select
                          value={app.status}
                          disabled={updatingId === app.id}
                          onChange={(e) =>
                            handleStatusChange(app, e.target.value as ApplicationStatus)
                          }
                          className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:border-indigo-500 focus:outline-none disabled:opacity-50"
                        >
                          {STATUS_OPTIONS.map((st) => (
                            <option key={st} value={st}>
                              {st}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={() => setViewingApp(app)}
                          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-indigo-50 hover:text-indigo-700"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: NOTICE BOARD PUBLISHER */}
      {activeTab === 'notices' && (
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <form
            onSubmit={handlePostNotice}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <h2 className="text-base font-bold text-slate-900">Post Club Notice</h2>
            <p className="mt-1 text-xs text-slate-500">
              Appears on your club profile and the campus notice board.
            </p>

            <div className="mt-4 space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Notice Title
                </label>
                <input
                  type="text"
                  required
                  value={noticeTitle}
                  onChange={(e) => setNoticeTitle(e.target.value)}
                  placeholder="e.g. Interview Shortlist Announced"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Announcement Details
                </label>
                <textarea
                  rows={4}
                  required
                  value={noticeContent}
                  onChange={(e) => setNoticeContent(e.target.value)}
                  placeholder="Write venue, timings, or important instructions..."
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={postingNotice}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-60"
              >
                {postingNotice ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                Publish Notice
              </button>
            </div>
          </form>

          <div className="space-y-4 lg:col-span-2">
            {notices.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
                No notices published for this club yet.
              </div>
            ) : (
              notices.map((n) => (
                <div
                  key={n.id}
                  className="flex items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div>
                    <div className="text-xs text-slate-400">
                      {new Date(n.created_at).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </div>
                    <h3 className="mt-1 text-base font-bold text-slate-900">{n.title}</h3>
                    <p className="mt-1 text-sm text-slate-600">{n.content}</p>
                  </div>
                  <button
                    onClick={() => handleDeleteNotice(n.id)}
                    title="Delete Notice"
                    className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 3: EVENT SCHEDULER */}
      {activeTab === 'events' && (
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <form
            onSubmit={handleCreateEvent}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <h2 className="text-base font-bold text-slate-900">Schedule New Event</h2>
            <p className="mt-1 text-xs text-slate-500">
              Displayed immediately on the MITS-DU Events calendar.
            </p>

            <div className="mt-4 space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Event Title
                </label>
                <input
                  type="text"
                  required
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  placeholder="e.g. Intro to GenAI Workshop"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Date & Time
                </label>
                <input
                  type="datetime-local"
                  required
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Campus Venue
                </label>
                <input
                  type="text"
                  required
                  value={eventVenue}
                  onChange={(e) => setEventVenue(e.target.value)}
                  placeholder="e.g. Seminar Hall 2, Diamond Jubilee Block"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Description
                </label>
                <textarea
                  rows={3}
                  required
                  value={eventDescription}
                  onChange={(e) => setEventDescription(e.target.value)}
                  placeholder="What will students learn or experience?"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={postingEvent}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-60"
              >
                {postingEvent ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                Add Event
              </button>
            </div>
          </form>

          <div className="space-y-4 lg:col-span-2">
            {events.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
                No events scheduled for this club yet.
              </div>
            ) : (
              events.map((ev) => {
                const dt = new Date(ev.event_date);
                return (
                  <div
                    key={ev.id}
                    className="flex items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                  >
                    <div>
                      <h3 className="text-base font-bold text-slate-900">{ev.title}</h3>
                      <p className="mt-1 text-sm text-slate-600">{ev.description}</p>
                      <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-500">
                        <span className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-indigo-500" />
                          {dt.toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}{' '}
                          at{' '}
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
                    <button
                      onClick={() => handleDeleteEvent(ev.id)}
                      title="Delete Event"
                      className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* APPLICANT DETAIL MODAL (With PDF Resume Viewer Link) */}
      {viewingApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {viewingApp.applicant_name}
                </h3>
                <p className="text-xs text-slate-500">
                  {viewingApp.roll_number} • {viewingApp.branch} ({viewingApp.year})
                </p>
              </div>
              <button
                onClick={() => setViewingApp(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Email</span>
                <span className="font-medium text-slate-800">{viewingApp.email}</span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Current Status</span>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${statusBadgeClass(
                    viewingApp.status
                  )}`}
                >
                  {viewingApp.status}
                </span>
              </div>

              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Statement of Purpose
                </div>
                <p className="mt-1.5 rounded-xl bg-slate-50 p-3.5 text-sm leading-relaxed text-slate-700">
                  {viewingApp.statement || 'No statement provided.'}
                </p>
              </div>

              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Uploaded Resume / Portfolio (PDF)
                </div>
                {viewingApp.resume_url ? (
                  <a
                    href={viewingApp.resume_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 flex items-center justify-between rounded-xl border border-indigo-200 bg-indigo-50/70 px-4 py-3 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100"
                  >
                    <span className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Open Applicant PDF
                    </span>
                    <ExternalLink className="h-4 w-4" />
                  </a>
                ) : (
                  <p className="mt-1.5 text-xs text-slate-400">
                    No PDF uploaded (mock seed record).
                  </p>
                )}
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
              <select
                value={viewingApp.status}
                onChange={(e) =>
                  handleStatusChange(viewingApp, e.target.value as ApplicationStatus)
                }
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 focus:border-indigo-500 focus:outline-none"
              >
                {STATUS_OPTIONS.map((st) => (
                  <option key={st} value={st}>
                    Set Status: {st}
                  </option>
                ))}
              </select>

              <button
                onClick={() => setViewingApp(null)}
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}