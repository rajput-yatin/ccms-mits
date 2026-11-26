'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Club, UserRole } from '@/types/database';
import { useAuth } from '@/context/AuthContext';
const MITS_BRANCHES = [
  'Computer Science',
  'Information Technology',
  'Artificial Intelligence & Data Science',
  'Electronics',
  'Mechanical',
  'Civil',
  'Mathematics & Computing',
];

const YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year'];

export default function AuthPage() {
  const router = useRouter();
  const { refreshProfile } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clubs, setClubs] = useState<Club[]>([]);

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [branch, setBranch] = useState(MITS_BRANCHES[0]);
  const [year, setYear] = useState(YEARS[1]);
  const [role, setRole] = useState<UserRole>('student');
  const [managedClubId, setManagedClubId] = useState('');

  useEffect(() => {
    const loadClubs = async () => {
      const { data } = await supabase.from('clubs').select('*').order('name');
      if (data) {
        setClubs(data as Club[]);
        if (data.length > 0) setManagedClubId(data[0].id);
      }
    };
    loadClubs();
  }, []);

  const isSuperAdmin = role === 'super_admin';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isSignUp) {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              roll_number: isSuperAdmin ? null : rollNumber,
              branch: isSuperAdmin ? 'Administration' : branch,
              year: isSuperAdmin ? 'N/A' : year,
              role,
            },
          },
        });

        if (signUpError) throw signUpError;

        // Ensure an active session exists immediately
        if (!data.session) {
          const { error: loginErr } = await supabase.auth.signInWithPassword({
            email,
            password,
          });
          if (loginErr) throw loginErr;
        }

        // If Club Lead, link the selected club to their profile
        if (data.user && role === 'club_lead' && managedClubId) {
          await supabase
            .from('profiles')
            .update({ managed_club_id: managedClubId })
            .eq('id', data.user.id);
        }

        await refreshProfile();
        if (role === 'club_lead') router.push('/dashboard');
        else if (role === 'super_admin') router.push('/admin');
        else router.push('/');
      } else {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) throw signInError;

        await refreshProfile();

        if (data.user) {
          const { data: prof } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', data.user.id)
            .maybeSingle();

          const userRole =
            prof?.role || (data.user.user_metadata?.role as UserRole) || 'student';

          if (userRole === 'club_lead') router.push('/dashboard');
          else if (userRole === 'super_admin') router.push('/admin');
          else router.push('/');
        }
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : typeof err === 'object' && err !== null && 'message' in err
          ? String((err as { message: unknown }).message)
          : 'Authentication failed. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
<div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 text-center">
          <div
            style={{ backgroundColor: '#ffffff' }}
            className="mx-auto mb-3 flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 p-1 shadow-sm"
          >
            <Image
              src="/mits-logo.png"
              alt="MITS-DU Gwalior"
              width={56}
              height={56}
              className="h-full w-full object-contain"
              priority
            />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            {isSignUp ? 'Create MITS-DU Account' : 'Welcome back to CCMS'}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            MITS-DU Gwalior College Club Management Portal
          </p>
        </div>

        {/* Toggle Tabs */}
        <div className="mb-6 grid grid-cols-2 rounded-xl bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => {
              setIsSignUp(false);
              setError(null);
            }}
            className={`rounded-lg py-2 text-sm font-semibold transition ${
              !isSignUp
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setIsSignUp(true);
              setError(null);
            }}
            className={`rounded-lg py-2 text-sm font-semibold transition ${
              isSignUp
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Sign Up
          </button>
        </div>

        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Account Role
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium focus:border-indigo-500 focus:outline-none"
                >
                  <option value="student">Student</option>
                  <option value="club_lead">Club Lead</option>
                  <option value="super_admin">Super Admin (University)</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder={isSuperAdmin ? 'e.g. Dr. Rajesh Sharma' : 'e.g. Aarav Mehta'}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              {/* Student / Club Lead Academic Fields — Hidden for Super Admin */}
              {!isSuperAdmin && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-700">
                        Enrollment / Roll No.
                      </label>
                      <input
                        type="text"
                        required
                        value={rollNumber}
                        onChange={(e) => setRollNumber(e.target.value)}
                        placeholder="0901CS231045"
                        className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-700">
                        Year
                      </label>
                      <select
                        value={year}
                        onChange={(e) => setYear(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none"
                      >
                        {YEARS.map((y) => (
                          <option key={y} value={y}>
                            {y}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">
                      Branch
                    </label>
                    <select
                      value={branch}
                      onChange={(e) => setBranch(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none"
                    >
                      {MITS_BRANCHES.map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {role === 'club_lead' && clubs.length > 0 && (
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Select Club You Lead
                  </label>
                  <select
                    value={managedClubId}
                    onChange={(e) => setManagedClubId(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none"
                  >
                    {clubs.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </>
          )}

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={isSuperAdmin ? 'admin@mitsgwl.ac.in' : 'student@mitsgwl.ac.in'}
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              Password
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 6 characters"
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-60"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {isSignUp ? 'Create Account' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}