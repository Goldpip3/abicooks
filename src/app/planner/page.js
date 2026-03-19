'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const SLOTS = ['Lunch', 'Dinner'];

const CATEGORY_STYLES = {
  italian: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
  'middle-eastern': 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
  asian: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',
  american: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
  other: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400'
};

const CATEGORY_LABELS = {
  italian: 'Italian',
  'middle-eastern': 'Middle Eastern',
  asian: 'Asian',
  american: 'American',
  other: 'Other'
};

function getMondayOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function toISODate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDateRange(monday) {
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const opts = { month: 'short', day: 'numeric' };
  const startStr = monday.toLocaleDateString('en-US', opts);
  const endStr = sunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  return `${startStr} – ${endStr}`;
}

function RecipePickerModal({ day, slot, onClose, onPick }) {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchRecipes = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/recipes');
        if (!res.ok) throw new Error('Failed to fetch recipes');
        const data = await res.json();
        setRecipes(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchRecipes();
  }, []);

  const filtered = recipes.filter(r => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return r.name.toLowerCase().includes(q) || (r.category || '').toLowerCase().includes(q);
  });

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg flex flex-col max-h-[80vh]">
        {/* Modal header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex-shrink-0">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
            Pick a Recipe — {day} {slot}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Search */}
        <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-700 flex-shrink-0">
          <input
            type="text"
            placeholder="Search recipes..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            autoFocus
            className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>

        {/* List */}
        <div className="overflow-y-auto flex-1 p-2">
          {loading && (
            <div className="flex items-center justify-center py-10">
              <svg className="animate-spin text-orange-500" xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
            </div>
          )}
          {error && (
            <p className="text-center text-red-500 py-8 text-sm">{error}</p>
          )}
          {!loading && !error && filtered.length === 0 && (
            <p className="text-center text-gray-400 py-8 text-sm">No recipes found.</p>
          )}
          {!loading && !error && filtered.map(recipe => {
            const catStyle = CATEGORY_STYLES[recipe.category] || CATEGORY_STYLES.american;
            const catLabel = CATEGORY_LABELS[recipe.category] || recipe.category;
            return (
              <button
                key={recipe.id}
                onClick={() => onPick(recipe)}
                className="w-full text-left flex items-center justify-between gap-3 px-3 py-3 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${catStyle}`}>
                    {catLabel}
                  </span>
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate group-hover:text-orange-700 dark:group-hover:text-orange-400">
                    {recipe.name}
                  </span>
                </div>
                <div className="flex-shrink-0 flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
                  <span>{recipe.calories} cal</span>
                  <span className="text-gray-300 dark:text-gray-600">|</span>
                  <span>{recipe.protein}g protein</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function PlanCell({ plan, day, slot, weekStart, onRefresh }) {
  const [saving, setSaving] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  const handleClear = async () => {
    try {
      setSaving(true);
      const res = await fetch('/api/plans', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ week_start: weekStart, day, slot })
      });
      if (!res.ok) throw new Error('Failed to clear slot');
      onRefresh();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handlePick = async (recipe) => {
    setShowPicker(false);
    try {
      setSaving(true);
      const res = await fetch('/api/plans', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ week_start: weekStart, day, slot, recipe_id: recipe.id })
      });
      if (!res.ok) throw new Error('Failed to save plan');
      onRefresh();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (saving) {
    return (
      <div className="h-20 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 flex items-center justify-center">
        <svg className="animate-spin text-orange-400" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
      </div>
    );
  }

  if (plan && plan.recipe) {
    const catStyle = CATEGORY_STYLES[plan.recipe.category] || CATEGORY_STYLES.american;
    const catLabel = CATEGORY_LABELS[plan.recipe.category] || plan.recipe.category;
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-3 flex flex-col gap-1.5 relative group shadow-sm">
        <button
          onClick={handleClear}
          className="absolute top-2 right-2 w-5 h-5 bg-gray-100 dark:bg-gray-700 hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-500 dark:hover:text-red-400 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
          title="Remove"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
        <span className={`inline-flex items-center self-start px-1.5 py-0.5 rounded-full text-xs font-medium ${catStyle}`}>
          {catLabel}
        </span>
        <p className="text-xs font-semibold text-gray-800 dark:text-gray-100 leading-tight pr-5 line-clamp-2">
          {plan.recipe.name}
        </p>
        <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500 mt-auto">
          <span>{plan.recipe.calories} cal</span>
          <span className="text-gray-200 dark:text-gray-700">|</span>
          <span>{plan.recipe.protein}g P</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => setShowPicker(true)}
        className="h-20 w-full bg-white dark:bg-gray-800 rounded-xl border border-dashed border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center gap-1 hover:border-orange-400 hover:bg-orange-50/50 dark:hover:bg-orange-900/10 transition-colors group"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-300 dark:text-gray-600 group-hover:text-orange-400 transition-colors">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        <span className="text-xs text-gray-300 dark:text-gray-600 group-hover:text-orange-400 transition-colors font-medium">Add</span>
      </button>
      {showPicker && (
        <RecipePickerModal
          day={day}
          slot={slot}
          onClose={() => setShowPicker(false)}
          onPick={handlePick}
        />
      )}
    </>
  );
}

export default function Planner() {
  const router = useRouter();
  const { status } = useAuth();
  const [weekMonday, setWeekMonday] = useState(() => getMondayOfWeek(new Date()));
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  const weekStart = toISODate(weekMonday);

  const fetchPlans = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/plans?week=${weekStart}`);
      if (!res.ok) throw new Error('Failed to fetch plans');
      const data = await res.json();
      setPlans(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [weekStart]);

  useEffect(() => {
    if (status !== 'authenticated') return;
    fetchPlans();
  }, [fetchPlans, status]);

  const prevWeek = () => {
    const d = new Date(weekMonday);
    d.setDate(d.getDate() - 7);
    setWeekMonday(d);
  };

  const nextWeek = () => {
    const d = new Date(weekMonday);
    d.setDate(d.getDate() + 7);
    setWeekMonday(d);
  };

  const planMap = {};
  plans.forEach(p => {
    planMap[`${p.day}-${p.slot}`] = p;
  });

  const filledPlans = plans.filter(p => p.recipe);
  const totalCalories = filledPlans.reduce((sum, p) => sum + (p.recipe.calories || 0), 0);
  const totalProtein = filledPlans.reduce((sum, p) => sum + (p.recipe.protein || 0), 0);
  const plannedCount = filledPlans.length;
  const avgCalPerDay = plannedCount > 0 ? Math.round(totalCalories / 7) : 0;
  const avgProteinPerDay = plannedCount > 0 ? Math.round(totalProtein / 7) : 0;

  if (status === 'loading') {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-56" />
          <div className="grid grid-cols-7 gap-3">
            {Array.from({ length: 14 }).map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 dark:bg-gray-700 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">Weekly Meal Planner</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">{formatDateRange(weekMonday)}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={prevWeek}
            className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors shadow-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            Prev Week
          </button>
          <button
            onClick={nextWeek}
            className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors shadow-sm"
          >
            Next Week
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-5 mb-6 text-center">
          <p className="text-red-600 dark:text-red-400 font-medium">{error}</p>
          <button
            onClick={fetchPlans}
            className="mt-3 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Desktop Grid */}
      {!error && (
        <>
          <div className="hidden md:block overflow-x-auto">
            <div className="min-w-[700px]">
              {/* Day headers */}
              <div className="grid grid-cols-7 gap-3 mb-2">
                {DAYS.map(day => {
                  const dayDate = new Date(weekMonday);
                  dayDate.setDate(weekMonday.getDate() + DAYS.indexOf(day));
                  const dayNum = dayDate.getDate();
                  const month = dayDate.toLocaleDateString('en-US', { month: 'short' });
                  return (
                    <div key={day} className="text-center">
                      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{day.slice(0, 3)}</p>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{month} {dayNum}</p>
                    </div>
                  );
                })}
              </div>

              {/* Slot rows */}
              {SLOTS.map(slot => (
                <div key={slot} className="mb-4">
                  <p className="text-xs font-semibold text-orange-600 dark:text-orange-500 uppercase tracking-widest mb-2">{slot}</p>
                  <div className="grid grid-cols-7 gap-3">
                    {DAYS.map(day => {
                      const plan = planMap[`${day}-${slot}`] || null;
                      return (
                        <div key={day}>
                          {loading ? (
                            <div className="h-20 bg-gray-100 dark:bg-gray-700 rounded-xl animate-pulse" />
                          ) : (
                            <PlanCell
                              plan={plan}
                              day={day}
                              slot={slot}
                              weekStart={weekStart}
                              onRefresh={fetchPlans}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Mobile: stacked day cards */}
          <div className="md:hidden space-y-4">
            {DAYS.map(day => {
              const dayDate = new Date(weekMonday);
              dayDate.setDate(weekMonday.getDate() + DAYS.indexOf(day));
              const dayLabel = dayDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
              return (
                <div key={day} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 shadow-sm">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">{dayLabel}</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {SLOTS.map(slot => (
                      <div key={slot}>
                        <p className="text-xs font-medium text-orange-600 dark:text-orange-500 uppercase tracking-wider mb-1.5">{slot}</p>
                        {loading ? (
                          <div className="h-20 bg-gray-100 dark:bg-gray-700 rounded-xl animate-pulse" />
                        ) : (
                          <PlanCell
                            plan={planMap[`${day}-${slot}`] || null}
                            day={day}
                            slot={slot}
                            weekStart={weekStart}
                            onRefresh={fetchPlans}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Weekly nutrition summary */}
      {!error && !loading && (
        <div className="mt-8 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-4">Weekly Nutrition Summary</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-500">{plannedCount}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Meals Planned</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">{14 - plannedCount}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Slots Remaining</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">{avgCalPerDay}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Avg Cal / Day</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">{avgProteinPerDay}g</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Avg Protein / Day</p>
            </div>
          </div>
        </div>
      )}

      {/* Generate Grocery List button */}
      {!error && (
        <div className="mt-6 flex justify-center">
          <button
            onClick={() => router.push(`/grocery?week=${weekStart}`)}
            className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white font-semibold px-8 py-3 rounded-xl text-base transition-colors shadow-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
            Generate Grocery List
          </button>
        </div>
      )}
    </div>
  );
}
