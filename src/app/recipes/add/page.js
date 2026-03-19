'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import ImportUrlModal from '@/components/ImportUrlModal';
import NutritionCalculator from '@/components/NutritionCalculator';

const INPUT_CLASS =
  'w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-500 transition-colors text-sm';

const INPUT_FIXED =
  'border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-500 transition-colors text-sm';

const LABEL_CLASS = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1';

function FormSection({ title, children }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-4">
      <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 pb-2 border-b border-gray-100 dark:border-gray-700">
        {title}
      </h2>
      {children}
    </div>
  );
}

const EMPTY_FORM = {
  name: '',
  description: '',
  category: 'italian',
  prepTime: '',
  cookTime: '',
  servings: '',
  calories: '',
  protein: '',
  ingredients: [{ amount: '', unit: '', name: '' }],
  instructions: ['']
};

export default function AddRecipe() {
  const router = useRouter();
  const { status } = useSession();
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [showImportModal, setShowImportModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  const populateFromRecipe = (recipe) => {
    setForm({
      name: recipe.name || '',
      description: recipe.description || '',
      category: recipe.category || 'italian',
      prepTime: recipe.prepTime != null ? String(recipe.prepTime) : '',
      cookTime: recipe.cookTime != null ? String(recipe.cookTime) : '',
      servings: recipe.servings != null ? String(recipe.servings) : '',
      calories: recipe.calories != null ? String(recipe.calories) : '',
      protein: recipe.protein != null ? String(recipe.protein) : '',
      ingredients: recipe.ingredients && recipe.ingredients.length > 0
        ? recipe.ingredients
        : [{ amount: '', unit: '', name: '' }],
      instructions: recipe.instructions && recipe.instructions.length > 0
        ? recipe.instructions
        : ['']
    });
    setErrors({});
  };

  const handleImport = (recipe) => {
    populateFromRecipe(recipe);
    setShowImportModal(false);
  };

  const updateField = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const updateIngredient = (index, field, value) => {
    setForm(prev => {
      const ingredients = [...prev.ingredients];
      ingredients[index] = { ...ingredients[index], [field]: value };
      return { ...prev, ingredients };
    });
  };
  const addIngredient = () =>
    setForm(prev => ({ ...prev, ingredients: [...prev.ingredients, { amount: '', unit: '', name: '' }] }));
  const removeIngredient = (index) =>
    setForm(prev => ({ ...prev, ingredients: prev.ingredients.filter((_, i) => i !== index) }));

  const updateInstruction = (index, value) => {
    setForm(prev => {
      const instructions = [...prev.instructions];
      instructions[index] = value;
      return { ...prev, instructions };
    });
  };
  const addInstruction = () =>
    setForm(prev => ({ ...prev, instructions: [...prev.instructions, ''] }));
  const removeInstruction = (index) =>
    setForm(prev => ({ ...prev, instructions: prev.instructions.filter((_, i) => i !== index) }));

  const validate = () => {
    const newErrors = {};
    if (!form.name.trim()) newErrors.name = 'Recipe name is required';
    if (!form.description.trim()) newErrors.description = 'Description is required';
    if (!form.prepTime || Number(form.prepTime) < 0) newErrors.prepTime = 'Valid prep time required';
    if (!form.cookTime || Number(form.cookTime) < 0) newErrors.cookTime = 'Valid cook time required';
    if (!form.servings || Number(form.servings) < 1) newErrors.servings = 'Valid servings required';
    if (!form.calories || Number(form.calories) < 0) newErrors.calories = 'Valid calories required';
    if (!form.protein || Number(form.protein) < 0) newErrors.protein = 'Valid protein required';
    if (form.ingredients.some(ing => !ing.name.trim())) newErrors.ingredients = 'All ingredients need a name';
    if (form.instructions.some(step => !step.trim())) newErrors.instructions = 'All steps need content';
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = validate();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        ...form,
        prepTime: Number(form.prepTime),
        cookTime: Number(form.cookTime),
        servings: Number(form.servings),
        calories: Number(form.calories),
        protein: Number(form.protein),
        tags: ['low-calorie', 'high-protein'],
        ingredients: form.ingredients.filter(ing => ing.name.trim()),
        instructions: form.instructions.filter(step => step.trim())
      };

      const res = await fetch('/api/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create recipe');
      }

      const created = await res.json();
      router.push(`/recipes/${created.id}`);
    } catch (err) {
      setErrors({ submit: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const needsNutrition = !form.calories || form.calories === '' || !form.protein || form.protein === '';
  const hasRealIngredients = form.ingredients.some(ing => ing.name.trim());

  if (status === 'loading') {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse space-y-5">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-32" />
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-48" />
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-10 bg-gray-200 dark:bg-gray-700 rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back link */}
      <Link
        href="/browse"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors mb-6"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="19" y1="12" x2="5" y2="12" />
          <polyline points="12 19 5 12 12 5" />
        </svg>
        Back to Browse
      </Link>

      {/* Page heading + Import button */}
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">Add New Recipe</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Share a new healthy recipe with the cookbook</p>
        </div>
        <button
          type="button"
          onClick={() => setShowImportModal(true)}
          className="flex items-center gap-2 px-4 py-2 border-2 border-orange-600 dark:border-orange-500 text-orange-600 dark:text-orange-400 text-sm font-semibold rounded-lg hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors flex-shrink-0"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
          Import from URL
        </button>
      </div>

      {errors.submit && (
        <div className="mb-5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 text-red-600 dark:text-red-400 text-sm">
          {errors.submit}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Basic Info */}
        <FormSection title="Basic Information">
          <div>
            <label className={LABEL_CLASS}>Recipe Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={e => updateField('name', e.target.value)}
              placeholder="e.g. Chicken Piccata"
              className={`${INPUT_CLASS} ${errors.name ? 'border-red-400 focus:ring-red-400' : ''}`}
            />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
          </div>
          <div>
            <label className={LABEL_CLASS}>Description *</label>
            <textarea
              value={form.description}
              onChange={e => updateField('description', e.target.value)}
              placeholder="Brief description of the dish..."
              rows={2}
              className={`${INPUT_CLASS} resize-none ${errors.description ? 'border-red-400 focus:ring-red-400' : ''}`}
            />
            {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description}</p>}
          </div>
          <div>
            <label className={LABEL_CLASS}>Category *</label>
            <select
              value={form.category}
              onChange={e => updateField('category', e.target.value)}
              className={INPUT_CLASS}
            >
              <option value="italian">Italian</option>
              <option value="middle-eastern">Middle Eastern</option>
              <option value="asian">Asian</option>
              <option value="american">American</option>
              <option value="other">Other</option>
            </select>
          </div>
        </FormSection>

        {/* Time & Nutrition */}
        <FormSection title="Time & Nutrition">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div>
              <label className={LABEL_CLASS}>Prep Time (min) *</label>
              <input
                type="number"
                min="0"
                value={form.prepTime}
                onChange={e => updateField('prepTime', e.target.value)}
                placeholder="10"
                className={`${INPUT_CLASS} ${errors.prepTime ? 'border-red-400' : ''}`}
              />
              {errors.prepTime && <p className="text-red-500 text-xs mt-1">{errors.prepTime}</p>}
            </div>
            <div>
              <label className={LABEL_CLASS}>Cook Time (min) *</label>
              <input
                type="number"
                min="0"
                value={form.cookTime}
                onChange={e => updateField('cookTime', e.target.value)}
                placeholder="20"
                className={`${INPUT_CLASS} ${errors.cookTime ? 'border-red-400' : ''}`}
              />
              {errors.cookTime && <p className="text-red-500 text-xs mt-1">{errors.cookTime}</p>}
            </div>
            <div>
              <label className={LABEL_CLASS}>Servings *</label>
              <input
                type="number"
                min="1"
                value={form.servings}
                onChange={e => updateField('servings', e.target.value)}
                placeholder="2"
                className={`${INPUT_CLASS} ${errors.servings ? 'border-red-400' : ''}`}
              />
              {errors.servings && <p className="text-red-500 text-xs mt-1">{errors.servings}</p>}
            </div>
            <div>
              <label className={LABEL_CLASS}>Calories / serving *</label>
              <input
                type="number"
                min="0"
                value={form.calories}
                onChange={e => updateField('calories', e.target.value)}
                placeholder="420"
                className={`${INPUT_CLASS} ${errors.calories ? 'border-red-400' : ''}`}
              />
              {errors.calories && <p className="text-red-500 text-xs mt-1">{errors.calories}</p>}
            </div>
            <div>
              <label className={LABEL_CLASS}>Protein / serving (g) *</label>
              <input
                type="number"
                min="0"
                value={form.protein}
                onChange={e => updateField('protein', e.target.value)}
                placeholder="45"
                className={`${INPUT_CLASS} ${errors.protein ? 'border-red-400' : ''}`}
              />
              {errors.protein && <p className="text-red-500 text-xs mt-1">{errors.protein}</p>}
            </div>
          </div>
        </FormSection>

        {/* Ingredients */}
        <FormSection title="Ingredients">
          {errors.ingredients && (
            <p className="text-red-500 text-xs -mt-2">{errors.ingredients}</p>
          )}
          <div className="space-y-2">
            <div className="flex items-center gap-2 px-1">
              <span className="w-16 flex-shrink-0 text-xs font-medium text-gray-400 dark:text-gray-500">Qty</span>
              <span className="w-28 flex-shrink-0 text-xs font-medium text-gray-400 dark:text-gray-500">Unit</span>
              <span className="flex-1 text-xs font-medium text-gray-400 dark:text-gray-500">Ingredient</span>
            </div>
            {form.ingredients.map((ing, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  type="text"
                  value={ing.amount}
                  onChange={e => updateIngredient(index, 'amount', e.target.value)}
                  placeholder="2"
                  className={`${INPUT_FIXED} w-16 flex-shrink-0`}
                />
                <select
                  value={ing.unit}
                  onChange={e => updateIngredient(index, 'unit', e.target.value)}
                  className={`${INPUT_FIXED} w-28 flex-shrink-0`}
                >
                  <option value="">—</option>
                  <option value="cup">cup</option>
                  <option value="tbsp">tbsp</option>
                  <option value="tsp">tsp</option>
                  <option value="oz">oz</option>
                  <option value="lb">lb</option>
                  <option value="g">g</option>
                  <option value="kg">kg</option>
                  <option value="ml">ml</option>
                  <option value="L">L</option>
                  <option value="clove">clove</option>
                  <option value="piece">piece</option>
                  <option value="slice">slice</option>
                  <option value="can">can</option>
                  <option value="bunch">bunch</option>
                  <option value="handful">handful</option>
                  <option value="pinch">pinch</option>
                  <option value="to taste">to taste</option>
                  <option value="large">large</option>
                  <option value="medium">medium</option>
                  <option value="small">small</option>
                </select>
                <input
                  type="text"
                  value={ing.name}
                  onChange={e => updateIngredient(index, 'name', e.target.value)}
                  placeholder="e.g. chicken breast"
                  className={`${INPUT_CLASS} flex-1 min-w-0`}
                />
                {form.ingredients.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeIngredient(index)}
                    className="flex-shrink-0 p-1.5 text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addIngredient}
            className="flex items-center gap-2 text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 text-sm font-medium transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add Ingredient
          </button>
        </FormSection>

        {/* Nutrition Calculator — shown when nutrition is missing and there are ingredients */}
        {needsNutrition && hasRealIngredients && (
          <NutritionCalculator
            ingredients={form.ingredients.filter(ing => ing.name.trim())}
            servings={Number(form.servings) || 1}
            onCalculated={(macros) => {
              updateField('calories', String(macros.calories));
              updateField('protein', String(macros.protein));
            }}
          />
        )}

        {/* Instructions */}
        <FormSection title="Instructions">
          {errors.instructions && (
            <p className="text-red-500 text-xs -mt-2">{errors.instructions}</p>
          )}
          <div className="space-y-2">
            {form.instructions.map((step, index) => (
              <div key={index} className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded-full flex items-center justify-center text-xs font-bold mt-2">
                  {index + 1}
                </span>
                <textarea
                  value={step}
                  onChange={e => updateInstruction(index, e.target.value)}
                  placeholder={`Step ${index + 1}...`}
                  rows={2}
                  className={`${INPUT_CLASS} flex-1 resize-none`}
                />
                {form.instructions.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeInstruction(index)}
                    className="flex-shrink-0 p-1.5 text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors mt-1"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addInstruction}
            className="flex items-center gap-2 text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 text-sm font-medium transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add Step
          </button>
        </FormSection>

        {/* Submit */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link
            href="/browse"
            className="px-5 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2.5 bg-orange-600 hover:bg-orange-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-60 flex items-center gap-2"
          >
            {submitting ? (
              <>
                <svg className="animate-spin" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
                Saving...
              </>
            ) : (
              'Save Recipe'
            )}
          </button>
        </div>
      </form>

      {/* Import Modal */}
      {showImportModal && (
        <ImportUrlModal
          onClose={() => setShowImportModal(false)}
          onImport={handleImport}
        />
      )}
    </div>
  );
}
