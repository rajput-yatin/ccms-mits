'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Users,
  Trophy,
  MapPin,
  Clock,
  Megaphone,
  Upload,
  FileText,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Code2,
  Music,
  Flag,
  PenTool,
  Rocket,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Club, ClubCategory, ClubEvent, Notice } from '@/types/database';

function ClubBannerIcon({ category }: { category: ClubCategory }) {
  const cls = 'h-7 w-7 text-indigo-600';
  switch (category) {
    case 'Technical':
      return <Code2 className={cls} />;
    case 'Cultural':
      return <Music className={cls} />;
    case 'Sports':
      return <Flag className={cls} />;
    case 'Literary':
      return <PenTool className={cls} />;
    case 'Entrepreneurship':
      return <Rocket className={cls} />;
  }
}

export default function ClubProfilePage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const { user, profile } = useAuth();

  const [club, setClub] = useState<Club | null>(null);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [events, setEvents] = useState<ClubEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'about' | 'announcements' | 'events'>('about');

  // Application Modal State
  const [showModal, setShowModal] = useState(false);
  const [alreadyApplied, setAlreadyApplied] = useState(false);
  const [applicantName, setApplicantName] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [branch, setBranch] = useState('Computer Science');
  const [year, setYear] = useState('2nd Year');
  const [statement, setStatement] = useState('');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  useEffect(() => {
    const fetchClubData = async () => {
      setLoading(true);
      const { data: clubData, error } = await supabase
        .from('clubs')
        .select('*')
        .eq('slug', slug)
        .single();

      if (error || !clubData) {
        setLoading(false);
        return;
      }

      const fetchedClub = clubData as Club;
      setClub(fetchedClub);

      const [noticesRes, eventsRes] = await Promise.all([
        supabase
          .from('notices')
          .select('*')
          .eq('club_id', fetchedClub.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('events')
          .select('*')
          .eq('club_id', fetchedClub.id)
          .order('event_date', { ascending: true }),
      ]);

      if (noticesRes.data) setNotices(noticesRes.data as Notice[]);
      if (eventsRes.data) setEvents(eventsRes.data as ClubEvent[]);

      if (user) {
        const { data: existing } = await supabase
          .from('applications')
          .select('id')
          .eq('club_id', fetchedClub.id)
          .eq('student_id', user.id)
          .maybeSingle();

        if (existing) setAlreadyApplied(true);
      }

      setLoading(false);
    };

    if (slug) fetchClubData();
  }, [slug, user]);

  // Pre-fill modal fields from logged-in profile
  useEffect(() => {
    if (profile) {
      setApplicantName(profile.full_name || '');
      setRollNumber(profile.roll_number || '');
      setBranch(profile.branch || 'Computer Science');
      setYear(profile.year || '2nd Year');
    }
  }, [profile]);

  const handleOpenApply = () => {
    if (!user) {
      router.push('/auth');
      return;
    }
    setSubmitError(null);
    setSubmitSuccess(false);
    setShowModal(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSubmitError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setSubmitError('Only PDF files (.pdf) are allowed.');
      setPdfFile(null);
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setSubmitError('PDF file must be smaller than 5 MB.');
      setPdfFile(null);
      return;
    }

    setPdfFile(file);
  };

  const handleApplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !club) return;

    if (!pdfFile) {
      setSubmitError('Please upload your Resume / Portfolio in PDF format.');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      // 1. Upload PDF to Supabase Storage ("resumes" bucket)
      const filePath = `${user.id}/${club.slug}-${Date.now()}.pdf`;
      const { error: uploadError } = await supabase.storage
        .from('resumes')
        .upload(filePath, pdfFile, {
          contentType: 'application/pdf',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from('resumes').getPublicUrl(filePath);

      // 2. Insert Application Record
      const { error: insertError } = await supabase.from('applications').insert({
        club_id: club.id,
        student_id: user.id,
        applicant_name: applicantName,
        roll_number: rollNumber,
        branch,
        year,
        email: profile?.email || user.email || '',
        statement,
        resume_url: publicUrl,
        status: 'Applied',
      });

      if (insertError) throw insertError;

      setSubmitSuccess(true);
      setAlreadyApplied(true);
      setPdfFile(null);
      setStatement('');
} catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : typeof err === 'object' && err !== null && 'message' in err
          ? String((err as { message: unknown }).message)
          : 'Failed to submit application. Please try again.';
      setSubmitError(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-slate-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin text-indigo-600" />
        Loading club profile...
      </div>
    );
  }

  if (!club) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <h1 className="text-2xl font-bold text-slate-900">Club not found</h1>
        <p className="mt-2 text-sm text-slate-500">
          The club you are looking for does not exist or was removed.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Explore
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-16">
      {/* Top Back Strip */}
      <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition hover:text-indigo-600"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to all clubs
        </Link>
      </div>

      {/* Purple Club Header Banner (Matches Milestone 2 UI) */}
      <div className="mx-auto mt-4 max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 p-7 text-white shadow-sm sm:p-9">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
            <div className="flex items-start gap-5">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm">
                <ClubBannerIcon category={club.category} />
              </div>

              <div>
                {/* Tags */}
                <div className="mb-2 flex flex-wrap gap-1.5">
                  <span className="rounded-md bg-white/20 px-2.5 py-0.5 text-xs font-medium backdrop-blur-sm">
                    {club.category}
                  </span>
                  {(club.tags || []).map((tag) => (
                    <span
                      key={tag}
                      className="rounded-md bg-white/15 px-2.5 py-0.5 text-xs font-medium backdrop-blur-sm"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
                  {club.name}
                </h1>

                <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-indigo-100">
                  <span>Led by {club.lead_name}</span>
                  <span className="flex items-center gap-1.5">
                    <Users className="h-4 w-4" />
                    {club.member_count} members
                  </span>
                </div>
              </div>
            </div>

            {/* Right CTA */}
            <div className="flex flex-col items-start gap-2 md:items-end">
              {club.is_recruiting ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/20 px-3 py-1 text-xs font-semibold text-emerald-100 ring-1 ring-inset ring-emerald-300/40">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
                  Recruiting Now
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white/80">
                  Recruitment Closed
                </span>
              )}

              {club.is_recruiting ? (
                alreadyApplied ? (
                  <Link
                    href="/my-applications"
                    className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-emerald-700 shadow-sm transition hover:bg-emerald-50"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Applied — View Status
                  </Link>
                ) : (
                  <button
                    onClick={handleOpenApply}
                    className="rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-indigo-700 shadow-sm transition hover:bg-indigo-50"
                  >
                    Apply for Membership
                  </button>
                )
              ) : (
                <button
                  disabled
                  className="cursor-not-allowed rounded-xl bg-white/20 px-5 py-2.5 text-sm font-semibold text-white/70"
                >
                  Applications Closed
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Unified Tabbed Navigation */}
        <div className="mt-6 flex items-center gap-2 border-b border-slate-200 pb-3">
          <button
            onClick={() => setActiveTab('about')}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
              activeTab === 'about'
                ? 'bg-white text-indigo-700 shadow-sm ring-1 ring-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            About
          </button>
          <button
            onClick={() => setActiveTab('announcements')}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
              activeTab === 'announcements'
                ? 'bg-white text-indigo-700 shadow-sm ring-1 ring-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Announcements ({notices.length})
          </button>
          <button
            onClick={() => setActiveTab('events')}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
              activeTab === 'events'
                ? 'bg-white text-indigo-700 shadow-sm ring-1 ring-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Events ({events.length})
          </button>
        </div>

        {/* TAB 1: ABOUT */}
        {activeTab === 'about' && (
          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-base font-bold text-slate-900">Vision</h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  {club.vision}
                </p>
                <p className="mt-3 text-sm leading-relaxed text-slate-500">
                  {club.description}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-base font-bold text-slate-900">
                  Past achievements
                </h2>
                {club.achievements && club.achievements.length > 0 ? (
                  <ul className="mt-4 space-y-3">
                    {club.achievements.map((ach, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-3 text-sm text-slate-700"
                      >
                        <Trophy className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" />
                        <span>{ach}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-sm text-slate-500">
                    No achievements listed yet.
                  </p>
                )}
              </div>
            </div>

            {/* Right Sidebar: Executive Board */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-base font-bold text-slate-900">
                Executive board
              </h2>
              <div className="mt-4 space-y-4">
                {(club.exec_board || []).map((member, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-xs font-bold text-indigo-700">
                      {member.initials}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-900">
                        {member.name}
                      </div>
                      <div className="text-xs text-slate-500">{member.role}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: ANNOUNCEMENTS */}
        {activeTab === 'announcements' && (
          <div className="mt-6 space-y-4">
            {notices.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
                No announcements posted by {club.name} yet.
              </div>
            ) : (
              notices.map((notice) => (
                <div
                  key={notice.id}
                  className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600">
                      <Megaphone className="h-4 w-4" />
                      Club Notice
                    </div>
                    <span className="text-xs text-slate-400">
                      {new Date(notice.created_at).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                  <h3 className="mt-2 text-base font-bold text-slate-900">
                    {notice.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                    {notice.content}
                  </p>
                  <div className="mt-3 text-xs text-slate-400">
                    Posted by {notice.posted_by}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB 3: EVENTS */}
        {activeTab === 'events' && (
          <div className="mt-6 grid gap-5 md:grid-cols-2">
            {events.length === 0 ? (
              <div className="col-span-full rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
                No upcoming events scheduled by {club.name}.
              </div>
            ) : (
              events.map((ev) => {
                const dt = new Date(ev.event_date);
                return (
                  <div
                    key={ev.id}
                    className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-indigo-50 text-indigo-700">
                        <span className="text-[11px] font-bold uppercase">
                          {dt.toLocaleDateString('en-IN', { month: 'short' })}
                        </span>
                        <span className="text-lg font-extrabold leading-none">
                          {dt.getDate()}
                        </span>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-base font-bold text-slate-900">
                          {ev.title}
                        </h3>
                        <p className="mt-1 text-sm text-slate-600">
                          {ev.description}
                        </p>
                        <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-500">
                          <span className="flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 text-indigo-500" />
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
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* APPLY FOR MEMBERSHIP MODAL (With PDF Resume Upload) */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl sm:p-7">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Apply to {club.name}
                </h2>
                <p className="text-xs text-slate-500">
                  MITS-DU Gwalior Recruitment Form
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {submitSuccess ? (
              <div className="py-8 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-lg font-bold text-slate-900">
                  Application Submitted!
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Your details and PDF resume have been sent to {club.name}. You can
                  track your status anytime.
                </p>
                <div className="mt-6 flex justify-center gap-3">
                  <button
                    onClick={() => setShowModal(false)}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Close
                  </button>
                  <Link
                    href="/my-applications"
                    className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                  >
                    View My Applications
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={handleApplySubmit} className="mt-5 space-y-4">
                {submitError && (
                  <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{submitError}</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={applicantName}
                      onChange={(e) => setApplicantName(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">
                      Roll Number
                    </label>
                    <input
                      type="text"
                      required
                      value={rollNumber}
                      onChange={(e) => setRollNumber(e.target.value)}
                      placeholder="0901CS231045"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">
                      Branch
                    </label>
                    <input
                      type="text"
                      required
                      value={branch}
                      onChange={(e) => setBranch(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">
                      Year
                    </label>
                    <select
                      value={year}
                      onChange={(e) => setYear(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                    >
                      <option value="1st Year">1st Year</option>
                      <option value="2nd Year">2nd Year</option>
                      <option value="3rd Year">3rd Year</option>
                      <option value="4th Year">4th Year</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Why do you want to join {club.name}?
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={statement}
                    onChange={(e) => setStatement(e.target.value)}
                    placeholder="Share your skills, projects, or interest in this club..."
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                {/* PDF Upload Input */}
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Resume / Portfolio (PDF only, max 5MB) *
                  </label>
                  <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center transition hover:border-indigo-400 hover:bg-indigo-50/40">
                    {pdfFile ? (
                      <div className="flex items-center gap-2 text-sm font-semibold text-indigo-700">
                        <FileText className="h-5 w-5" />
                        <span className="max-w-[260px] truncate">{pdfFile.name}</span>
                        <span className="text-xs font-normal text-slate-500">
                          ({(pdfFile.size / 1024).toFixed(0)} KB)
                        </span>
                      </div>
                    ) : (
                      <>
                        <Upload className="h-6 w-6 text-slate-400" />
                        <span className="mt-2 text-sm font-medium text-slate-700">
                          Click to upload PDF file
                        </span>
                        <span className="mt-0.5 text-xs text-slate-400">
                          PDF format only up to 5MB
                        </span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="application/pdf,.pdf"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-60"
                  >
                    {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    Submit Application
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}