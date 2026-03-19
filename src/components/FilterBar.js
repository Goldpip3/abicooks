'use client';

const CATEGORIES = [
  { value: '', label: 'All' },
  { value: 'italian', label: 'Italian' },
  { value: 'middle-eastern', label: 'Middle Eastern' },
  { value: 'asian', label: 'Asian' },
  { value: 'american', label: 'American' },
];

const TAGS = [
  { value: '', label: 'All Tags' },
  { value: 'low-calorie', label: 'Low Calorie' },
  { value: 'high-protein', label: 'High Protein' },
];

function FilterBar({ selectedCategory, setSelectedCategory, selectedTag, setSelectedTag }) {
  return (
    <div className="space-y-3">
      {/* Category chips */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setSelectedCategory(cat.value)}
            className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
              selectedCategory === cat.value
                ? 'bg-orange-600 text-white shadow-sm'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Tag chips */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {TAGS.map((tag) => (
          <button
            key={tag.value}
            onClick={() => setSelectedTag(tag.value)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 border ${
              selectedTag === tag.value
                ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border-orange-300 dark:border-orange-700'
                : 'bg-transparent text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            {tag.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default FilterBar;
