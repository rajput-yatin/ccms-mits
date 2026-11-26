'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  Building2,
  Users,
  Megaphone,
  Plus,
  Trash2,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Club, ClubCategory, Notice, Profile, UserRole } from '@/types/database';

const CATEGORIES: ClubCategory[] = [
  'Technical',
  'Cultural',
  'Sports',
  'Literary',
  'Entrepreneurship',
];

export default function SuperAdminPage() {
  const { user, profile, loading: authLoading } = useAuth();

  const [clubs, setClubs] = useState<Club[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [campusNotices, setCampusNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'clubs' | 'notices' | 'roles'>('clubs');

  // New Club Form
  const [name, setName] = useState('');
  const [category, setCategory] = useState<ClubCategory>('Technical');
  const [leadName, setLeadName] = useState('');
  const [description, setDescription] = useState('');
  const [vision, setVision] = useState('');
  const [tagsText, setTagsText] = useState('');
  const [creatingClub, setCreatingClub] = useState(false);

  // Campus Notice Form
  const [noticeTitle, setNoticeTitle] = useState('');
  const [noticeContent, setNoticeContent] = useState('');
  const [postingNotice, setPostingNotice] = useState(false);

  useEffect(() => {
    const loadAdminData = async () => {
      const [clubsRes, profilesRes, noticesRes] = await Promise.all([
        supabase.from('clubs').select('*').order('created_at', { ascending: false }),
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
        supabase
          .from('notices')
          .select('*')
          .is('club_id', null)
          .order('created_at', { ascending: false }),
      ]);

      if (clubsRes.data) setClubs(clubsRes.data as Club[]);
      if (profilesRes.data) setProfiles(profilesRes.data as Profile[]);
      if (noticesRes.data) setCampusNotices(noticesRes.data as Notice[]);
      setLoading(false);
    };

    if (!authLoading && profile?.role === 'super_admin') {
      loadAdminData();
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [authLoading, profile]);

  const handleCreateClub = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingClub(true);

    const slug =
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') +
      '-' +
      Math.floor(100 + Math.random() * 900);

    const tags = tagsText
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const initials = leadName
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

    const { data, error } = await supabase
      .from('clubs')
      .insert({
        slug,
        name,
        category,
        lead_name: leadName,
        description,
        vision,
        tags,
        achievements: ['Recognized Student Organization — MITS-DU Gwalior'],
        is_recruiting: true,
        member_count: 1,
        exec_board: [{ name: leadName, role: 'Club Lead', initials }],
      })
      .select()
      .single();

    if (!error && data) {
      setClubs((prev) => [data as Club, ...prev]);
      setName('');
      setLeadName('');
      setDescription('');
      setVision('');
      setTagsText('');
    }
    setCreatingClub(false);
  };

  const handleDeleteClub = async (id: string) => {
    const { error } = await supabase.from('clubs').delete().eq('id', id);
    if (!error) {
      setClubs((prev) => prev.filter((c) => c.id !== id));
    }
  };

  const handlePostCampusNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    setPostingNotice(true);

    const { data, error } = await supabase
      .from('notices')
      .insert({
        club_id: null,
        title: noticeTitle,
        content: noticeContent,
        posted_by: `${profile?.full_name || 'Admin'} (MITS-DU Administration)`,
      })
      .select()
      .single();

    if (!error && data) {
      setCampusNotices((prev) => [data as Notice, ...prev]);
      setNoticeTitle('');
      setNoticeContent('');
    }
    setPostingNotice(false);
  };

  const handleDeleteCampusNotice = async (id: string) => {
    const { error } = await supabase.from('notices').delete().eq('id', id);
    if (!error) {
      setCampusNotices((prev) => prev.filter((n) => n.id !== id));
    }
  };

  const handleRoleUpdate = async (
    targetUserId: string,
    newRole: UserRole,
    managedClubId?: string | null
  ) => {
    const payload: Partial<Profile> = { role: newRole };
    if (managedClubId !== undefined) {
      payload.managed_club_id = managedClubId || null;
    }

    const { error } = await supabase
      .from('profiles')
      .update(payload)
      .eq('id', targetUserId);

    if (!error) {
      setProfiles((prev) =>
        prev.map((p) => (p.id === targetUserId ? { ...p, ...payload } : p))
      );
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-slate-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin text-indigo-600" />
        Loading Super Admin Portal...
      </div>
    );
  }

  if (!user || profile?.role !== 'super_admin') {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <ShieldCheck className="mx-auto h-10 w-10 text-purple-600" />
        <h1 className="mt-3 text-2xl font-bold text-slate-900">
          Super Admin Access Required
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          This portal is restricted to MITS-DU Gwalior University Administrators.
        </p>
        <Link
          href="/auth"
          className="mt-5 inline-block rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          Sign In as Super Admin
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div>
        <span className="text-xs font-bold uppercase tracking-wider text-purple-600">
          University Governance
        </span>
        <h1 className="mt-1 text-3xl font-extrabold text-slate-900">
          MITS-DU Super Admin Portal
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Manage registered student clubs, semester leadership transitions, and campus-wide
          broadcasts.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <div className="text-2xl font-extrabold text-slate-900">{clubs.length}</div>
            <div className="text-xs font-medium text-slate-500">Registered Clubs</div>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <div className="text-2xl font-extrabold text-slate-900">{profiles.length}</div>
            <div className="text-xs font-medium text-slate-500">Registered Users</div>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <Megaphone className="h-5 w-5" />
          </div>
          <div>
            <div className="text-2xl font-extrabold text-slate-900">
              {campusNotices.length}
            </div>
            <div className="text-xs font-medium text-slate-500">
              Campus-Wide Notices
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-7 flex items-center gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setActiveTab('clubs')}
          className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
            activeTab === 'clubs'
              ? 'bg-white text-indigo-700 shadow-sm ring-1 ring-slate-200'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Manage Clubs ({clubs.length})
        </button>
        <button
          onClick={() => setActiveTab('notices')}
          className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
            activeTab === 'notices'
              ? 'bg-white text-indigo-700 shadow-sm ring-1 ring-slate-200'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Campus-Wide Notices
        </button>
        <button
          onClick={() => setActiveTab('roles')}
          className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
            activeTab === 'roles'
              ? 'bg-white text-indigo-700 shadow-sm ring-1 ring-slate-200'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Role Transitions & Users
        </button>
      </div>

      {/* TAB 1: MANAGE CLUBS */}
      {activeTab === 'clubs' && (
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <form
            onSubmit={handleCreateClub}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <h2 className="text-base font-bold text-slate-900">Register New Club</h2>
            <div className="mt-4 space-y-3.5">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Club Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. MITS Cybersecurity Club"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as ClubCategory)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Initial Club Lead
                  </label>
                  <input
                    type="text"
                    required
                    value={leadName}
                    onChange={(e) => setLeadName(e.target.value)}
                    placeholder="e.g. Rohan Verma"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Short Description
                </label>
                <textarea
                  rows={2}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Vision Statement
                </label>
                <input
                  type="text"
                  required
                  value={vision}
                  onChange={(e) => setVision(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Tags (comma-separated)
                </label>
                <input
                  type="text"
                  value={tagsText}
                  onChange={(e) => setTagsText(e.target.value)}
                  placeholder="CTF, Linux, Security"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={creatingClub}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
              >
                {creatingClub ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                Create Club
              </button>
            </div>
          </form>

          <div className="space-y-3 lg:col-span-2">
            {clubs.map((club) => (
              <div
                key={club.id}
                className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-900">{club.name}</h3>
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                      {club.category}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    Lead: {club.lead_name} • {club.member_count} members •{' '}
                    {club.is_recruiting ? 'Recruiting' : 'Closed'}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href={`/clubs/${club.slug}`}
                    className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50 hover:text-indigo-600"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                  <button
                    onClick={() => handleDeleteClub(club.id)}
                    title="Delete Club"
                    className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: CAMPUS-WIDE NOTICES */}
      {activeTab === 'notices' && (
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <form
            onSubmit={handlePostCampusNotice}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <h2 className="text-base font-bold text-slate-900">
              Broadcast Campus Notice
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Visible to all MITS-DU students with an official Campus-Wide badge.
            </p>
            <div className="mt-4 space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Title
                </label>
                <input
                  type="text"
                  required
                  value={noticeTitle}
                  onChange={(e) => setNoticeTitle(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Message
                </label>
                <textarea
                  rows={4}
                  required
                  value={noticeContent}
                  onChange={(e) => setNoticeContent(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={postingNotice}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-purple-600 py-2.5 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-60"
              >
                {postingNotice && <Loader2 className="h-4 w-4 animate-spin" />}
                Publish Broadcast
              </button>
            </div>
          </form>

          <div className="space-y-4 lg:col-span-2">
            {campusNotices.map((n) => (
              <div
                key={n.id}
                className="flex items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div>
                  <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-[11px] font-semibold text-purple-700">
                    Campus-Wide
                  </span>
                  <h3 className="mt-2 font-bold text-slate-900">{n.title}</h3>
                  <p className="mt-1 text-sm text-slate-600">{n.content}</p>
                </div>
                <button
                  onClick={() => handleDeleteCampusNotice(n.id)}
                  className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: ROLE TRANSITIONS & USERS */}
      {activeTab === 'roles' && (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-xs font-semibold text-slate-500">
                <th className="px-5 py-3.5">User</th>
                <th className="px-5 py-3.5">Branch / Year</th>
                <th className="px-5 py-3.5">System Role</th>
                <th className="px-5 py-3.5">Assigned Club (for Leads)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {profiles.map((p) => (
                <tr key={p.id}>
                  <td className="px-5 py-4">
                    <div className="font-semibold text-slate-900">{p.full_name}</div>
                    <div className="text-xs text-slate-400">
                      {p.email} • {p.roll_number}
                    </div>
                  </td>
                  <td className="px-5 py-4 text-xs text-slate-600">
                    {p.branch} ({p.year})
                  </td>
                  <td className="px-5 py-4">
                    <select
                      value={p.role}
                      onChange={(e) =>
                        handleRoleUpdate(p.id, e.target.value as UserRole, p.managed_club_id)
                      }
                      className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:border-indigo-500 focus:outline-none"
                    >
                      <option value="student">Student</option>
                      <option value="club_lead">Club Lead</option>
                      <option value="super_admin">Super Admin</option>
                    </select>
                  </td>
                  <td className="px-5 py-4">
                    {p.role === 'club_lead' ? (
                      <select
                        value={p.managed_club_id || ''}
                        onChange={(e) =>
                          handleRoleUpdate(p.id, p.role, e.target.value || null)
                        }
                        className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:border-indigo-500 focus:outline-none"
                      >
                        <option value="">None</option>
                        {clubs.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}