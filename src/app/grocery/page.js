'use client';

import { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

// ─── Price Map ────────────────────────────────────────────────────────────────
const PRICE_MAP = {
  'chicken breast': 0.75,
  'chicken breasts': 0.75,
  'ground turkey': 0.60,
  'lean ground turkey': 0.60,
  'ground lamb': 1.10,
  'lean ground lamb': 1.10,
  'sirloin': 1.40,
  'salmon': 1.50,
  'salmon fillets': 1.50,
  'shrimp': 1.00,
  'large shrimp': 1.00,
  'eggs': 0.30,
  'garlic': 0.10,
  'onion': 0.60,
  'red bell pepper': 0.90,
  'green bell pepper': 0.70,
  'sweet potatoes': 0.80,
  'sweet potato': 0.80,
  'broccoli': 1.20,
  'baby bok choy': 1.50,
  'cherry tomatoes': 2.00,
  'cucumber': 0.80,
  'zucchini': 0.90,
  'lemon': 0.60,
  'carrot': 0.30,
  'celery': 0.50,
  'brown rice': 0.50,
  'jasmine rice': 0.60,
  'spaghetti': 1.20,
  'linguine': 1.20,
  'whole wheat spaghetti': 1.50,
  'crushed tomatoes': 1.20,
  'kidney beans': 0.90,
  'marinara sauce': 2.50,
  'chicken broth': 1.50,
  'greek yogurt': 2.00,
  'miso paste': 2.50,
  'white miso paste': 2.50,
  'soy sauce': 1.00,
  'low-sodium soy sauce': 1.20,
  'fish sauce': 1.50,
  'oyster sauce': 1.50,
  'olive oil': 1.00,
  'sesame oil': 1.20,
  'hot sauce': 1.00,
  'cumin': 0.20,
  'paprika': 0.20,
  'smoked paprika': 0.25,
  'turmeric': 0.20,
  'coriander': 0.20,
  'cinnamon': 0.20,
  'cayenne': 0.20,
  'chili powder': 0.25,
  'cajun seasoning': 0.30,
  'red pepper flakes': 0.20,
  'oregano': 0.20,
  'thyme': 0.20,
  'capers': 1.50,
  'sesame seeds': 0.50,
  'default': 1.00
};

function estimateCost(name, amount) {
  const nameLower = name.toLowerCase();
  let matchedPrice = null;
  let matchedLen = 0;
  for (const [key, price] of Object.entries(PRICE_MAP)) {
    if (key === 'default') continue;
    if (nameLower.includes(key) && key.length > matchedLen) {
      matchedPrice = price;
      matchedLen = key.length;
    }
  }
  if (matchedPrice === null) matchedPrice = PRICE_MAP['default'];

  let factor = 1;
  if (amount) {
    const amtStr = String(amount).toLowerCase().trim();
    const gramMatch = amtStr.match(/^(\d+(?:\.\d+)?)\s*g$/);
    if (gramMatch) {
      factor = parseFloat(gramMatch[1]) / 100;
    } else {
      const numMatch = amtStr.match(/^(\d+(?:\.\d+)?(?:\/\d+)?)/);
      if (numMatch) {
        const raw = numMatch[1];
        if (raw.includes('/')) {
          const parts = raw.split('/');
          factor = parseFloat(parts[0]) / parseFloat(parts[1]);
        } else {
          factor = parseFloat(raw) || 1;
        }
      }
    }
  }

  return Math.round(matchedPrice * factor * 100) / 100;
}

// ─── Ingredient categorisation ────────────────────────────────────────────────
const PROTEIN_KEYWORDS = ['chicken', 'turkey', 'beef', 'shrimp', 'salmon', 'egg', 'lamb', 'pork', 'tuna', 'fish'];
const PRODUCE_KEYWORDS = ['pepper', 'onion', 'garlic', 'tomato', 'broccoli', 'bok choy', 'cucumber', 'zucchini', 'lemon', 'carrot', 'celery', 'potato', 'basil', 'parsley', 'mint', 'herb', 'spinach', 'kale', 'cabbage', 'ginger', 'lime', 'avocado'];
const SPICE_KEYWORDS = ['cumin', 'paprika', 'turmeric', 'coriander', 'cinnamon', 'cayenne', 'chili', 'cajun', 'pepper flake', 'oregano', 'thyme', 'seasoning', 'spice', 'salt', 'pepper', 'sauce', 'miso', 'soy', 'fish sauce', 'oyster', 'sesame oil', 'oil', 'honey', 'mirin', 'sugar', 'capers', 'sesame seed', 'hot sauce', 'vinegar', 'mayo', 'mustard'];

function categoriseIngredient(name) {
  const n = name.toLowerCase();
  for (const kw of PROTEIN_KEYWORDS) {
    if (n.includes(kw)) return 'Proteins';
  }
  for (const kw of PRODUCE_KEYWORDS) {
    if (n.includes(kw)) return 'Produce';
  }
  for (const kw of SPICE_KEYWORDS) {
    if (n.includes(kw)) return 'Spices & Condiments';
  }
  return 'Pantry & Grains';
}

const CATEGORY_ORDER = ['Proteins', 'Produce', 'Pantry & Grains', 'Spices & Condiments'];
const CATEGORY_ICONS = {
  'Proteins': '🥩',
  'Produce': '🥦',
  'Pantry & Grains': '🌾',
  'Spices & Condiments': '🧂'
};

// ─── Date helpers ─────────────────────────────────────────────────────────────
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

function formatDateRange(isoMonday) {
  const monday = new Date(isoMonday + 'T00:00:00');
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const opts = { month: 'short', day: 'numeric' };
  const startStr = monday.toLocaleDateString('en-US', opts);
  const endStr = sunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  return `${startStr} – ${endStr}`;
}

// ─── Haversine distance ────────────────────────────────────────────────────────
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 3958.8;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Store tier ───────────────────────────────────────────────────────────────
function getStoreTier(name) {
  const n = name.toLowerCase();
  const budget = ['aldi', 'lidl', 'walmart', 'winco', 'food4less', 'grocery outlet', 'save-a-lot', 'save a lot'];
  const mid = ['kroger', 'publix', 'h-e-b', 'heb', 'meijer', 'harris teeter', 'food lion', 'giant', 'stop & shop', 'winn-dixie', 'safeway', 'vons', 'ralph', "fry's", 'king soopers', "smith's"];
  const premium = ['whole foods', 'sprouts', 'wegmans', 'fresh market', "trader joe's", 'trader joes'];
  if (budget.some(k => n.includes(k))) return 'budget';
  if (premium.some(k => n.includes(k))) return 'premium';
  if (mid.some(k => n.includes(k))) return 'mid';
  return 'mid';
}

const TIER_CONFIG = {
  budget: { order: 0, badge: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', label: '★★★ Best Value' },
  mid: { order: 1, badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', label: '★★ Good Value' },
  premium: { order: 2, badge: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400', label: '★ Higher Price' }
};

function GroceryList() {
  const router = useRouter();
  const { status } = useAuth();
  const searchParams = useSearchParams();
  const weekParam = searchParams.get('week');
  const weekStart = weekParam || toISODate(getMondayOfWeek(new Date()));

  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const lsKey = `grocery-checked-${weekStart}`;
  const [checked, setChecked] = useState({});

  // Load checked state from localStorage after mount (avoids SSR mismatch)
  useEffect(() => {
    try {
      setChecked(JSON.parse(localStorage.getItem(lsKey) || '{}'));
    } catch {
      setChecked({});
    }
  }, [lsKey]);

  const [storeStatus, setStoreStatus] = useState('idle');
  const [stores, setStores] = useState([]);
  const [storeError, setStoreError] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    localStorage.setItem(lsKey, JSON.stringify(checked));
  }, [checked, lsKey]);

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

  // ── Aggregate ingredients ──────────────────────────────────────────────────
  const { grouped, totalCost, plannedCount } = useMemo(() => {
    const filledPlans = plans.filter(p => p.recipe && p.recipe.ingredients);
    const plannedCount = filledPlans.length;

    const aggregated = {};
    filledPlans.forEach(p => {
      const ings = p.recipe.ingredients;
      ings.forEach(ing => {
        if (!ing.name || !ing.name.trim()) return;
        const key = ing.name.toLowerCase().trim();
        if (aggregated[key]) {
          aggregated[key].amounts.push([ing.amount, ing.unit].filter(Boolean).join(' '));
          aggregated[key].rawCost += estimateCost(ing.name, ing.amount);
        } else {
          aggregated[key] = {
            name: ing.name.trim(),
            amounts: [[ing.amount, ing.unit].filter(Boolean).join(' ')],
            rawCost: estimateCost(ing.name, ing.amount),
            category: categoriseIngredient(ing.name)
          };
        }
      });
    });

    const grouped = {};
    CATEGORY_ORDER.forEach(cat => { grouped[cat] = []; });

    let totalCost = 0;
    Object.values(aggregated).forEach(item => {
      const cost = Math.round(item.rawCost * 100) / 100;
      totalCost += cost;
      grouped[item.category].push({ ...item, cost });
    });

    CATEGORY_ORDER.forEach(cat => {
      grouped[cat].sort((a, b) => a.name.localeCompare(b.name));
    });

    return { grouped, totalCost: Math.round(totalCost * 100) / 100, plannedCount };
  }, [plans]);

  const totalItems = Object.values(grouped).reduce((s, arr) => s + arr.length, 0);

  const costColorClass =
    totalCost <= 80
      ? 'text-green-600 dark:text-green-400'
      : totalCost <= 100
      ? 'text-orange-500 dark:text-orange-400'
      : 'text-red-600 dark:text-red-400';

  const toggleChecked = (key) => {
    setChecked(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // ── Find Stores ────────────────────────────────────────────────────────────
  const handleFindStores = () => {
    if (!navigator.geolocation) {
      setStoreStatus('error');
      setStoreError('Geolocation is not supported by your browser.');
      return;
    }
    setStoreStatus('loading');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lon } = pos.coords;
        try {
          const overpassQuery = `[out:json];node["shop"="supermarket"](around:8000,${lat},${lon});out body 20;`;
          const overpassUrl = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(overpassQuery)}`;
          const res = await fetch(overpassUrl);
          if (!res.ok) throw new Error('Overpass API error');
          const data = await res.json();

          const results = (data.elements || [])
            .filter(el => el.tags && el.tags.name)
            .map(el => {
              const name = el.tags.name;
              const dist = haversineDistance(lat, lon, el.lat, el.lon);
              const tier = getStoreTier(name);
              return { name, dist, tier };
            });

          results.sort((a, b) => {
            const tierDiff = TIER_CONFIG[a.tier].order - TIER_CONFIG[b.tier].order;
            if (tierDiff !== 0) return tierDiff;
            return a.dist - b.dist;
          });

          setStores(results.slice(0, 8));
          setStoreStatus('success');
        } catch {
          setStoreStatus('error');
          setStoreError('Unable to load stores. Try again.');
        }
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setStoreStatus('denied');
        } else {
          setStoreStatus('error');
          setStoreError('Unable to get your location. Try again.');
        }
      }
    );
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  if (status === 'loading' || loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex flex-col items-center gap-4">
        <svg className="animate-spin text-orange-500" xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
        <p className="text-gray-500 dark:text-gray-400 text-sm">Loading your grocery list...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 text-center">
          <p className="text-red-600 dark:text-red-400 font-medium mb-3">{error}</p>
          <button
            onClick={fetchPlans}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back link */}
      <Link
        href="/planner"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors mb-6"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="19" y1="12" x2="5" y2="12" />
          <polyline points="12 19 5 12 12 5" />
        </svg>
        Back to Planner
      </Link>

      {/* ── Section 1: Week Summary ── */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm mb-6 print-section">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-50 mb-1">Grocery List</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">{formatDateRange(weekStart)}</p>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-300 font-medium">Meals planned:</span>
            <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">{plannedCount} of 14</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-300 font-medium">Est. total cost:</span>
            <span className={`text-lg font-bold ${costColorClass}`}>${totalCost.toFixed(2)}</span>
          </div>
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">Prices are estimates. Actual cost may vary.</p>
      </div>

      {/* ── Section 2: Grocery List ── */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm mb-6 print-section">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
            Ingredients ({totalItems})
          </h2>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors no-print"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 6 2 18 2 18 9" />
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
              <rect x="6" y="14" width="12" height="8" />
            </svg>
            Print / Save
          </button>
        </div>

        {totalItems === 0 && (
          <div className="p-8 text-center">
            <p className="text-gray-400 dark:text-gray-500 text-sm">No meals planned yet.</p>
            <Link
              href="/planner"
              className="inline-block mt-3 text-orange-600 hover:text-orange-700 text-sm font-medium"
            >
              Go to Planner →
            </Link>
          </div>
        )}

        {CATEGORY_ORDER.map(cat => {
          const items = grouped[cat];
          if (!items || items.length === 0) return null;
          return (
            <div key={cat}>
              <div className="flex items-center gap-2 px-5 py-2.5 bg-gray-50 dark:bg-gray-900/30 border-b border-gray-100 dark:border-gray-700">
                <span className="text-base">{CATEGORY_ICONS[cat]}</span>
                <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{cat}</h3>
              </div>
              <ul>
                {items.map((item, idx) => {
                  const itemKey = `${cat}-${item.name}`;
                  const isChecked = !!checked[itemKey];
                  return (
                    <li
                      key={idx}
                      className={`flex items-center gap-3 px-5 py-3 border-b border-gray-50 dark:border-gray-700/50 last:border-b-0 transition-opacity ${isChecked ? 'opacity-40' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleChecked(itemKey)}
                        className="flex-shrink-0 w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-orange-600 focus:ring-orange-500 cursor-pointer accent-orange-500"
                      />
                      <div className="flex-1 min-w-0">
                        <span className={`text-sm font-medium text-gray-800 dark:text-gray-100 ${isChecked ? 'line-through text-gray-400 dark:text-gray-500' : ''}`}>
                          {item.name}
                        </span>
                        {item.amounts.length > 0 && item.amounts[0] && (
                          <span className="text-xs text-gray-400 dark:text-gray-500 ml-2">
                            {item.amounts.join(', ')}
                          </span>
                        )}
                      </div>
                      <span className="flex-shrink-0 text-xs font-medium text-gray-500 dark:text-gray-400">
                        ~${item.cost.toFixed(2)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>

      {/* ── Section 3: Nearby Stores ── (hidden on print) */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm no-print">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Best Value Stores Near You</h2>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Sorted by value tier, then distance.</p>
        </div>

        <div className="p-5">
          {storeStatus === 'idle' && (
            <div className="text-center py-4">
              <button
                onClick={handleFindStores}
                className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white font-semibold px-6 py-2.5 rounded-lg text-sm transition-colors shadow-sm mx-auto"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                Find Stores
              </button>
            </div>
          )}

          {storeStatus === 'loading' && (
            <div className="flex flex-col items-center gap-3 py-6">
              <svg className="animate-spin text-orange-500" xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
              <p className="text-sm text-gray-400 dark:text-gray-500">Finding nearby stores...</p>
            </div>
          )}

          {storeStatus === 'denied' && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 text-center">
              <p className="text-amber-700 dark:text-amber-400 text-sm font-medium">Enable location access to find nearby stores.</p>
              <button
                onClick={handleFindStores}
                className="mt-3 text-sm text-orange-600 hover:text-orange-700 font-medium"
              >
                Try again
              </button>
            </div>
          )}

          {storeStatus === 'error' && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-center">
              <p className="text-red-600 dark:text-red-400 text-sm">{storeError || 'Unable to load stores. Try again.'}</p>
              <button
                onClick={handleFindStores}
                className="mt-3 text-sm text-orange-600 hover:text-orange-700 font-medium"
              >
                Retry
              </button>
            </div>
          )}

          {storeStatus === 'success' && stores.length === 0 && (
            <p className="text-center text-gray-400 dark:text-gray-500 text-sm py-4">No supermarkets found within 5 miles.</p>
          )}

          {storeStatus === 'success' && stores.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {stores.map((store, idx) => {
                const tier = TIER_CONFIG[store.tier];
                return (
                  <div
                    key={idx}
                    className="flex items-center justify-between gap-3 bg-gray-50 dark:bg-gray-900/30 rounded-lg px-4 py-3 border border-gray-100 dark:border-gray-700"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{store.name}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">{store.dist.toFixed(1)} mi away</p>
                    </div>
                    <span className={`flex-shrink-0 text-xs font-medium px-2 py-1 rounded-full ${tier.badge}`}>
                      {tier.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; color: black !important; }
        }
      `}</style>
    </div>
  );
}

export default function GroceryPage() {
  return (
    <Suspense>
      <GroceryList />
    </Suspense>
  );
}
