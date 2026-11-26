'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  GraduationCap,
  LogOut,
  LogIn,
  LayoutDashboard,
  ShieldCheck,
  FileText,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { UserRole } from '@/types/database';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, signOut } = useAuth();

  const activeRole: UserRole =
    profile?.role ||
    (user?.user_metadata?.role as UserRole) ||
    'student';

  const displayName =
    profile?.full_name ||
    user?.user_metadata?.full_name ||
    user?.email?.split('@')[0] ||
    'User';

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  const getInitials = (name: string) =>
    name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

  const navLinkClass = (path: string) =>
    `text-sm font-medium transition-colors ${
      pathname === path
        ? 'text-indigo-600'
        : 'text-slate-600 hover:text-slate-900'
    }`;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left: Logo + Nav Links */}
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div className="leading-tight">
              <div className="text-base font-bold tracking-tight text-slate-900">
                CCMS
              </div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                MITS-DU Gwalior
              </div>
            </div>
          </Link>

          <nav className="hidden items-center gap-6 md:flex">
            <Link href="/" className={navLinkClass('/')}>
              Explore
            </Link>
            <Link href="/events" className={navLinkClass('/events')}>
              Events
            </Link>
            <Link href="/notices" className={navLinkClass('/notices')}>
              Notices
            </Link>

            {user && activeRole === 'student' && (
              <Link
                href="/my-applications"
                className={`flex items-center gap-1.5 ${navLinkClass('/my-applications')}`}
              >
                <FileText className="h-4 w-4" />
                My Applications
              </Link>
            )}

            {user && (activeRole === 'club_lead' || activeRole === 'super_admin') && (
              <Link
                href="/dashboard"
                className={`flex items-center gap-1.5 ${navLinkClass('/dashboard')}`}
              >
                <LayoutDashboard className="h-4 w-4" />
                Club Dashboard
              </Link>
            )}

            {user && activeRole === 'super_admin' && (
              <Link
                href="/admin"
                className={`flex items-center gap-1.5 ${navLinkClass('/admin')}`}
              >
                <ShieldCheck className="h-4 w-4" />
                Super Admin
              </Link>
            )}
          </nav>
        </div>

        {/* Right: Role Pill + Auth Controls */}
        <div className="flex items-center gap-3">
          {user ? (
            <>
              <span
                className={`hidden rounded-full px-3 py-1 text-xs font-semibold capitalize sm:inline-block ${
                  activeRole === 'super_admin'
                    ? 'bg-purple-100 text-purple-700'
                    : activeRole === 'club_lead'
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'bg-slate-100 text-slate-700'
                }`}
              >
                {activeRole === 'super_admin'
                  ? 'University Admin'
                  : activeRole.replace('_', ' ')}
              </span>

              <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 py-1 pl-1 pr-3">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
                  {getInitials(displayName)}
                </div>
                <span className="hidden max-w-[130px] truncate text-xs font-medium text-slate-700 sm:block">
                  {displayName}
                </span>
              </div>

              <button
                onClick={handleSignOut}
                title="Sign Out"
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </>
          ) : (
            <Link
              href="/auth"
              className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700"
            >
              <LogIn className="h-4 w-4" />
              Sign In
            </Link>
          )}
        </div>
      </div>

      {/* Mobile Nav Strip */}
      <div className="flex items-center gap-4 overflow-x-auto border-t border-slate-100 px-4 py-2 md:hidden">
        <Link href="/" className={navLinkClass('/')}>
          Explore
        </Link>
        <Link href="/events" className={navLinkClass('/events')}>
          Events
        </Link>
        <Link href="/notices" className={navLinkClass('/notices')}>
          Notices
        </Link>
        {user && activeRole === 'student' && (
          <Link href="/my-applications" className={navLinkClass('/my-applications')}>
            My Apps
          </Link>
        )}
        {user && (activeRole === 'club_lead' || activeRole === 'super_admin') && (
          <Link href="/dashboard" className={navLinkClass('/dashboard')}>
            Dashboard
          </Link>
        )}
        {user && activeRole === 'super_admin' && (
          <Link href="/admin" className={navLinkClass('/admin')}>
            Admin
          </Link>
        )}
      </div>
    </header>
  );
}