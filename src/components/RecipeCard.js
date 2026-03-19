'use client';

const CATEGORY_STYLES = {
  italian: {
    bg: 'bg-red-500',
    badge: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
    label: 'Italian',
  },
  'middle-eastern': {
    bg: 'bg-amber-500',
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
    label: 'Middle Eastern',
  },
  asian: {
    bg: 'bg-green-500',
    badge: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',
    label: 'Asian',
  },
  american: {
    bg: 'bg-blue-500',
    badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
    label: 'American',
  },
};

function ClockIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function FlameIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 3z" />
    </svg>
  );
}

function DumbbellIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6.5 6.5h11" />
      <path d="M6.5 17.5h11" />
      <path d="M3 9.5v5" />
      <path d="M21 9.5v5" />
      <rect x="1" y="8.5" width="4" height="7" rx="1" />
      <rect x="19" y="8.5" width="4" height="7" rx="1" />
      <rect x="5" y="6" width="3" height="12" rx="1" />
      <rect x="16" y="6" width="3" height="12" rx="1" />
      <line x1="8" y1="12" x2="16" y2="12" />
    </svg>
  );
}

function RecipeCard({ recipe, onClick }) {
  const style = CATEGORY_STYLES[recipe.category] || CATEGORY_STYLES.american;

  return (
    <div
      onClick={onClick}
      className="group cursor-pointer bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md border border-gray-100 dark:border-gray-700 hover:border-orange-300 dark:hover:border-orange-600 hover:ring-2 hover:ring-orange-200 dark:hover:ring-orange-800 transition-all duration-200 overflow-hidden"
    >
      {/* Colored header band */}
      <div className={`${style.bg} h-2 w-full`} />

      <div className="p-4">
        {/* Category badge */}
        <div className="flex items-center justify-between mb-2">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${style.badge}`}>
            {style.label}
          </span>
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {recipe.servings} {recipe.servings === 1 ? 'serving' : 'servings'}
          </span>
        </div>

        {/* Recipe name */}
        <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-base leading-snug mb-1 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
          {recipe.name}
        </h3>

        {/* Description */}
        <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed mb-4">
          {recipe.description}
        </p>

        {/* Stats row */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400 text-xs">
            <ClockIcon />
            <span>{recipe.cookTime}m</span>
          </div>
          <div className="flex items-center gap-1 text-orange-500 text-xs font-medium">
            <FlameIcon />
            <span>{recipe.calories} cal</span>
          </div>
          <div className="flex items-center gap-1 text-blue-500 text-xs font-medium">
            <DumbbellIcon />
            <span>{recipe.protein}g protein</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RecipeCard;
