'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Search,
  Code2,
  Music,
  Flag,
  PenTool,
  Rocket,
  Users,
  Loader2,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Club, ClubCategory } from '@/types/database';

const CATEGORIES: ('All' | ClubCategory)[] = [
  'All',
  'Technical',
  'Cultural',
  'Sports',
  'Literary',
  'Entrepreneurship',
];

function CategoryIcon({ category }: { category: ClubCategory }) {
  switch (category) {
    case 'Technical':
      return <Code2 className="h-5 w-5 text-indigo-600" />;
    case 'Cultural':
      return <Music className="h-5 w-5 text-indigo-600" />;
    case 'Sports':
      return <Flag className="h-5 w-5 text-indigo-600" />;
    case 'Literary':
      return <PenTool className="h-5 w-5 text-indigo-600" />;
    case 'Entrepreneurship':
      return <Rocket className="h-5 w-5 text-indigo-600" />;
  }
}

export default function HomePage() {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'All' | ClubCategory>('All');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
 useEffect(() => {
    const fetchClubs = async () => {
      const { data, error } = await supabase
        .from('clubs')
        .select('*')
        .order('member_count', { ascending: false });

      if (error) {
        console.error('Supabase clubs error:', error);
        setErrorMsg(`${error.message} (code: ${error.code || 'unknown'})`);
      } else if (data) {
        setClubs(data as Club[]);
      }
      setLoading(false);
    };
    fetchClubs();
  }, []);

  const filteredClubs = useMemo(() => {
    return clubs.filter((club) => {
      const matchesCategory =
        selectedCategory === 'All' || club.category === selectedCategory;

      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        club.name.toLowerCase().includes(q) ||
        club.description.toLowerCase().includes(q) ||
        club.category.toLowerCase().includes(q) ||
        (club.tags || []).some((t) => t.toLowerCase().includes(q));

      return matchesCategory && matchesSearch;
    });
  }, [clubs, searchQuery, selectedCategory]);

  return (
    <div className="min-h-screen">
      {/* Hero Banner */}
      <section className="border-b border-slate-200 bg-gradient-to-br from-indigo-50/80 via-white to-purple-50/70">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-16">
          <div className="max-w-2xl">
            <span className="inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
              Fall 2026 recruitment is live • MITS-DU Gwalior
            </span>

            <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
              Find your people. Nurture your skills and interests.
            </h1>

            <p className="mt-4 text-base text-slate-600 sm:text-lg">
              Explore and apply for student clubs, societies, and organizations at
              MITS-DU Gwalior. Catch upcoming events and workshops.
            </p>

            {/* Search Bar */}
            <div className="relative mt-7 max-w-xl">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, interest or tag..."
                className="w-full rounded-xl border border-slate-200 bg-white py-3.5 pl-11 pr-4 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Filter Engine & Club Grid */}
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {/* Category Pills */}
        <div className="mb-8 flex flex-wrap items-center gap-2.5">
          {CATEGORIES.map((category) => {
            const active = selectedCategory === category;
            return (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  active
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900'
                }`}
              >
                {category}
              </button>
            );
          })}
        </div>
        
        {errorMsg && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <strong>Database Error:</strong> {errorMsg}
          </div>
        )}
        {/* Loading State */}
        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-500">
            <Loader2 className="mr-2 h-5 w-5 animate-spin text-indigo-600" />
            Loading MITS-DU clubs...
          </div>
        ) : filteredClubs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <p className="text-base font-semibold text-slate-800">
              No clubs matched your search
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Try clearing your filter or searching another keyword.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredClubs.map((club) => (
              <Link
                key={club.id}
                href={`/clubs/${club.slug}`}
                className="group flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md"
              >
                <div>
                  {/* Card Top Row */}
                  <div className="mb-5 flex items-center justify-between">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 transition group-hover:bg-indigo-100">
                      <CategoryIcon category={club.category} />
                    </div>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                      {club.category}
                    </span>
                  </div>

                  {/* Club Title & Description */}
                  <h2 className="text-lg font-bold text-slate-900 transition group-hover:text-indigo-600">
                    {club.name}
                  </h2>
                  <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-slate-600">
                    {club.description}
                  </p>

                  {/* Tags */}
                  {club.tags && club.tags.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {club.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="rounded-md bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-500 ring-1 ring-inset ring-slate-200/70"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Card Bottom: Recruitment Badge + Member Count */}
                <div className="mt-6 space-y-3">
                  {club.is_recruiting ? (
                    <div className="flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      Recruiting Now
                    </div>
                  ) : (
                    <div className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-500">
                      Closed
                    </div>
                  )}

                  <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5" />
                      {club.member_count} members
                    </span>
                    <span className="font-semibold text-indigo-600 group-hover:underline">
                      View Profile →
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}