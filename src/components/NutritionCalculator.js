'use client';

import { useState, useEffect, useRef } from 'react';
import BarcodeScanner from './BarcodeScanner';

function estimateGrams(ingredient) {
  const { amount, unit, name } = ingredient;
  const num = parseFloat(amount) || 1;
  const u = (unit || '').toLowerCase().trim();
  const n = (name || '').toLowerCase();

  if (u === 'g' || u === 'gram' || u === 'grams') return num;
  if (u === 'kg') return num * 1000;
  if (u === 'oz') return num * 28.35;
  if (u === 'lb' || u === 'lbs') return num * 453.6;

  if (u === 'cup' || u === 'cups') {
    if (n.includes('rice')) return num * 185;
    if (n.includes('flour')) return num * 120;
    if (n.includes('yogurt') || n.includes('milk')) return num * 240;
    if (n.includes('broth') || n.includes('stock')) return num * 240;
    if (n.includes('tomato')) return num * 240;
    return num * 200;
  }
  if (u === 'tbsp' || u === 'tablespoon' || u === 'tablespoons') {
    if (n.includes('oil')) return num * 14;
    if (n.includes('sauce') || n.includes('paste')) return num * 16;
    return num * 12;
  }
  if (u === 'tsp' || u === 'teaspoon' || u === 'teaspoons') return num * 4;

  if (u === 'large' || u === 'medium' || u === 'small' || u === '') {
    if (n.includes('egg')) return num * 50;
    if (n.includes('chicken breast')) return num * 200;
    if (n.includes('onion')) return num * 150;
    if (n.includes('bell pepper') || n.includes('pepper')) return num * 120;
    if (n.includes('tomato')) return num * 120;
    if (n.includes('potato') || n.includes('sweet potato')) return num * 200;
    if (n.includes('lemon') || n.includes('lime')) return num * 60;
    if (n.includes('clove') || n.includes('garlic')) return num * 5;
    return num * 100;
  }
  if (u === 'fillet' || u.includes('fillet')) return num * 200;
  if (u === 'clove' || u === 'cloves') return num * 5;

  return num * 100;
}

const VARIANTS = {
  'ground beef': ['Ground beef, 93% lean meat / 7% fat', 'Ground beef, 80% lean meat / 20% fat', 'Ground beef, 70% lean meat / 30% fat'],
  'ground turkey': ['Turkey, ground, 93% lean, 7% fat', 'Turkey, ground, 85% lean, 15% fat'],
  'ground lamb': ['Lamb, ground', 'Lamb, ground, lean'],
  'milk': ['Milk, nonfat', 'Milk, 1% fat', 'Milk, 2% fat', 'Milk, whole'],
  'greek yogurt': ['Yogurt, Greek, plain, nonfat', 'Yogurt, Greek, plain, lowfat', 'Yogurt, Greek, plain, whole milk'],
  'cheddar cheese': ['Cheese, cheddar, reduced fat', 'Cheese, cheddar'],
};

function getVariants(name) {
  const n = (name || '').toLowerCase();
  for (const [key, variants] of Object.entries(VARIANTS)) {
    if (n.includes(key)) return variants;
  }
  return null;
}

function IngredientSearch({ initialQuery, onSelect, onBarcode }) {
  const [query, setQuery] = useState(initialQuery || '');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef(null);

  const doSearch = async (q) => {
    if (!q.trim()) { setResults([]); return; }
    setSearching(true);
    try {
      const res = await fetch(`/api/nutrition/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResults(Array.isArray(data) ? data : []);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  useEffect(() => {
    if (query.trim()) doSearch(query);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(val), 400);
  };

  return (
    <div className="mt-2 ml-4 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl p-3 space-y-2">
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={query}
          onChange={handleChange}
          placeholder="Search USDA food database..."
          className="flex-1 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
        />
        <button
          type="button"
          onClick={onBarcode}
          title="Scan barcode"
          className="flex-shrink-0 w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-orange-100 dark:hover:bg-orange-900/30 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="2" width="4" height="20" rx="1" />
            <rect x="8" y="2" width="2" height="20" rx="1" />
            <rect x="12" y="2" width="3" height="20" rx="1" />
            <rect x="17" y="2" width="1" height="20" rx="1" />
            <rect x="20" y="2" width="2" height="20" rx="1" />
          </svg>
        </button>
      </div>

      {searching && (
        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-xs py-1">
          <svg className="animate-spin" xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
          Searching USDA database...
        </div>
      )}

      {!searching && results.length === 0 && query.trim() && (
        <p className="text-gray-400 dark:text-gray-500 text-xs py-1">No results found. Try a different search term.</p>
      )}

      <div className="space-y-1 max-h-52 overflow-y-auto">
        {results.map(food => (
          <button
            key={food.fdcId}
            type="button"
            onClick={() => onSelect(food)}
            className="w-full text-left flex items-center justify-between gap-3 px-3 py-2 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors group"
          >
            <span className="text-sm text-gray-700 dark:text-gray-200 group-hover:text-orange-700 dark:group-hover:text-orange-300 line-clamp-1 flex-1">
              {food.description}
            </span>
            <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0 whitespace-nowrap">
              {Math.round(food.per100g.calories)} kcal · {Math.round(food.per100g.protein)}g protein / 100g
            </span>
            <span className="flex-shrink-0 px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 text-xs font-medium rounded">
              Use
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function NutritionCalculator({ ingredients, servings, onCalculated }) {
  const [matches, setMatches] = useState(() =>
    (ingredients || []).map(ing => ({
      ingredient: ing,
      fdcId: null,
      description: null,
      gramsEstimate: estimateGrams(ing),
      per100g: null,
      selectedVariant: null,
    }))
  );
  const [showSearchFor, setShowSearchFor] = useState(null);
  const [showBarcodeFor, setShowBarcodeFor] = useState(null);
  const [calculating, setCalculating] = useState(false);
  const [result, setResult] = useState(null);
  const [skipped, setSkipped] = useState(false);

  useEffect(() => {
    setMatches((ingredients || []).map(ing => ({
      ingredient: ing,
      fdcId: null,
      description: null,
      gramsEstimate: estimateGrams(ing),
      per100g: null,
      selectedVariant: null,
    })));
    setResult(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(ingredients)]);

  const handleSelectFood = (index, food) => {
    setMatches(prev => {
      const next = [...prev];
      next[index] = { ...next[index], fdcId: food.fdcId, description: food.description, per100g: food.per100g };
      return next;
    });
    setShowSearchFor(null);
  };

  const handleBarcodeResult = (index, productData) => {
    setShowBarcodeFor(null);
    setMatches(prev => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        fdcId: `barcode-${productData.barcode}`,
        description: productData.name || `Barcode ${productData.barcode}`,
        per100g: productData.per100g,
      };
      return next;
    });
  };

  const handleCalculate = async () => {
    const matchedIngredients = matches
      .filter(m => m.fdcId && !String(m.fdcId).startsWith('barcode-'))
      .map(m => ({ name: m.ingredient.name, gramsEstimate: m.gramsEstimate, fdcId: m.fdcId }));

    const barcodeItems = matches.filter(m => m.fdcId && String(m.fdcId).startsWith('barcode-'));

    if (matchedIngredients.length === 0 && barcodeItems.length === 0) {
      alert('Please match at least one ingredient to a food entry before calculating.');
      return;
    }

    setCalculating(true);
    try {
      let calcResult = { perServing: { calories: 0, protein: 0, fat: 0, carbs: 0 }, total: { calories: 0, protein: 0, fat: 0, carbs: 0 } };

      if (matchedIngredients.length > 0) {
        const res = await fetch('/api/nutrition/calculate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ingredients: matchedIngredients, servings: Number(servings) || 1 }),
        });
        calcResult = await res.json();
      }

      const numServings = Number(servings) || 1;
      for (const m of barcodeItems) {
        const factor = m.gramsEstimate / 100;
        calcResult.total.calories += m.per100g.calories * factor;
        calcResult.total.protein += m.per100g.protein * factor;
        calcResult.total.fat += m.per100g.fat * factor;
        calcResult.total.carbs += m.per100g.carbs * factor;
      }
      calcResult.perServing.calories = Math.round(calcResult.total.calories / numServings);
      calcResult.perServing.protein = Math.round(calcResult.total.protein / numServings * 10) / 10;
      calcResult.perServing.fat = Math.round(calcResult.total.fat / numServings * 10) / 10;
      calcResult.perServing.carbs = Math.round(calcResult.total.carbs / numServings * 10) / 10;

      setResult(calcResult.perServing);
    } catch (err) {
      alert('Calculation failed: ' + err.message);
    } finally {
      setCalculating(false);
    }
  };

  if (skipped) return null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-4">
      <div className="flex items-center gap-2 pb-2 border-b border-gray-100 dark:border-gray-700">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#EA580C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
          <line x1="8" y1="6" x2="16" y2="6" />
          <line x1="8" y1="10" x2="16" y2="10" />
          <line x1="8" y1="14" x2="12" y2="14" />
        </svg>
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Calculate Nutrition</h2>
        <span className="ml-auto text-xs text-gray-400 dark:text-gray-500">powered by USDA FoodData Central</span>
      </div>

      <div className="space-y-2">
        {matches.map((m, i) => {
          const ing = m.ingredient;
          if (!ing.name.trim()) return null;
          const variants = getVariants(ing.name);
          const isSearchOpen = showSearchFor === i;
          const gramsLabel = `~${Math.round(m.gramsEstimate)}g`;

          return (
            <div key={i} className="border border-gray-100 dark:border-gray-700 rounded-lg">
              <div className="flex items-center gap-2 px-3 py-2.5">
                <div className="flex-1 min-w-0">
                  <span className="text-sm text-gray-800 dark:text-gray-200 font-medium truncate block">
                    {ing.amount && <span className="text-gray-500 dark:text-gray-400 mr-1">{ing.amount}{ing.unit ? ' ' + ing.unit : ''}</span>}
                    {ing.name}
                  </span>
                  <span className="text-xs text-gray-400 dark:text-gray-500">{gramsLabel}</span>
                </div>

                {variants && (
                  <select
                    className="text-xs border border-orange-200 dark:border-orange-700 rounded-md px-1.5 py-1 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-500 max-w-[140px]"
                    value={m.selectedVariant || ''}
                    onChange={e => {
                      const val = e.target.value;
                      setMatches(prev => {
                        const next = [...prev];
                        next[i] = { ...next[i], selectedVariant: val };
                        return next;
                      });
                    }}
                  >
                    <option value="">Select variant...</option>
                    {variants.map(v => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                )}

                {m.fdcId && (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span className="text-xs text-green-600 dark:text-green-500 max-w-[120px] truncate" title={m.description}>{m.description}</span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setShowSearchFor(isSearchOpen ? null : i)}
                  className={`flex-shrink-0 text-xs px-2.5 py-1 rounded-md font-medium transition-colors ${
                    isSearchOpen
                      ? 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {m.fdcId ? 'Change' : 'Search'}
                </button>
              </div>

              {m.fdcId && m.per100g && (
                <div className="px-3 pb-2 flex gap-3 text-xs text-gray-400 dark:text-gray-500">
                  <span>{Math.round(m.per100g.calories)} kcal</span>
                  <span>{Math.round(m.per100g.protein * 10) / 10}g protein</span>
                  <span>{Math.round(m.per100g.fat * 10) / 10}g fat</span>
                  <span>{Math.round(m.per100g.carbs * 10) / 10}g carbs</span>
                  <span className="text-gray-300 dark:text-gray-600">per 100g</span>
                </div>
              )}

              {isSearchOpen && (
                <div className="px-3 pb-3">
                  <IngredientSearch
                    initialQuery={m.selectedVariant || ing.name}
                    onSelect={(food) => handleSelectFood(i, food)}
                    onBarcode={() => { setShowSearchFor(null); setShowBarcodeFor(i); }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={handleCalculate}
        disabled={calculating}
        className="w-full flex items-center justify-center gap-2 py-2.5 bg-orange-600 hover:bg-orange-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-60"
      >
        {calculating ? (
          <>
            <svg className="animate-spin" xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
            Calculating...
          </>
        ) : (
          <>
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="4" y="2" width="16" height="20" rx="2" />
              <line x1="8" y1="6" x2="16" y2="6" />
              <line x1="8" y1="10" x2="16" y2="10" />
              <line x1="8" y1="14" x2="12" y2="14" />
            </svg>
            Calculate Macros
          </>
        )}
      </button>

      {result && (
        <div className="space-y-3">
          <div className="grid grid-cols-4 gap-3">
            <div className="bg-orange-50 dark:bg-orange-900/20 rounded-xl p-3 text-center border border-orange-100 dark:border-orange-800">
              <div className="text-xl font-bold text-orange-600 dark:text-orange-400">{Math.round(result.calories)}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Calories</div>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 text-center border border-blue-100 dark:border-blue-800">
              <div className="text-xl font-bold text-blue-600 dark:text-blue-400">{Math.round(result.protein)}g</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Protein</div>
            </div>
            <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-3 text-center border border-yellow-100 dark:border-yellow-800">
              <div className="text-xl font-bold text-yellow-600 dark:text-yellow-400">{Math.round(result.fat)}g</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Fat</div>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-3 text-center border border-green-100 dark:border-green-800">
              <div className="text-xl font-bold text-green-600 dark:text-green-400">{Math.round(result.carbs)}g</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Carbs</div>
            </div>
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 text-center">Per serving · based on matched ingredients</p>
          <button
            type="button"
            onClick={() => onCalculated({ calories: Math.round(result.calories), protein: Math.round(result.protein), fat: Math.round(result.fat), carbs: Math.round(result.carbs) })}
            className="w-full py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            Apply to Recipe
          </button>
        </div>
      )}

      <div className="text-center">
        <button
          type="button"
          onClick={() => setSkipped(true)}
          className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          Skip — enter manually
        </button>
      </div>

      {showBarcodeFor !== null && (
        <BarcodeScanner
          onResult={(productData) => handleBarcodeResult(showBarcodeFor, productData)}
          onClose={() => setShowBarcodeFor(null)}
        />
      )}
    </div>
  );
}

export default NutritionCalculator;
