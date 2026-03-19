import { NextResponse } from 'next/server';

// Parse ISO 8601 duration like PT15M or PT1H30M → minutes
function parseISODuration(dur) {
  if (!dur) return 0;
  const match = dur.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  return hours * 60 + minutes;
}

// Extract first integer found in a string: "4 servings" → 4
function extractNumber(str) {
  if (!str && str !== 0) return null;
  if (typeof str === 'number') return str;
  const m = String(str).match(/\d+/);
  return m ? parseInt(m[0], 10) : null;
}

// Strip HTML tags and truncate
function stripHtml(str, maxLen) {
  if (!str) return '';
  const stripped = str.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  return maxLen ? stripped.slice(0, maxLen) : stripped;
}

// Map cuisine string to our categories
function mapCategory(cuisine) {
  if (!cuisine) return 'other';
  const c = Array.isArray(cuisine) ? cuisine.join(' ').toLowerCase() : String(cuisine).toLowerCase();
  if (/italian|pasta|pizza/.test(c)) return 'italian';
  if (/middle.?east|lebanese|turkish|persian|arab|mediterranean/.test(c)) return 'middle-eastern';
  if (/asian|chinese|japanese|korean|thai|vietnamese|indian/.test(c)) return 'asian';
  if (/american|bbq|southern|tex.?mex/.test(c)) return 'american';
  return 'other';
}

// Convert a single instruction item to a string
function extractInstructionText(item) {
  if (typeof item === 'string') return item;
  if (item && typeof item === 'object') {
    return item.text || item.name || '';
  }
  return '';
}

// Find the Recipe object in a parsed JSON-LD block
function findRecipeInBlock(parsed) {
  if (!parsed) return null;
  if (Array.isArray(parsed)) {
    for (const item of parsed) {
      const found = findRecipeInBlock(item);
      if (found) return found;
    }
    return null;
  }
  if (typeof parsed !== 'object') return null;
  if (parsed['@type'] === 'Recipe' || (Array.isArray(parsed['@type']) && parsed['@type'].includes('Recipe'))) {
    return parsed;
  }
  if (Array.isArray(parsed['@graph'])) {
    for (const node of parsed['@graph']) {
      if (node['@type'] === 'Recipe' || (Array.isArray(node['@type']) && node['@type'].includes('Recipe'))) {
        return node;
      }
    }
  }
  return null;
}

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const { url } = body;

  if (!url || typeof url !== 'string' || url.trim() === '') {
    return NextResponse.json({ success: false, error: 'A URL is required.' }, { status: 400 });
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(url.trim());
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid URL format.' }, { status: 400 });
  }

  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    return NextResponse.json({ success: false, error: 'Only http and https URLs are supported.' }, { status: 400 });
  }

  let html;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    const response = await fetch(url.trim(), {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
      },
    });
    clearTimeout(timeoutId);
    if (!response.ok) {
      return NextResponse.json({ success: false, error: `Failed to fetch the page (HTTP ${response.status}).` }, { status: 422 });
    }
    html = await response.text();
  } catch (err) {
    if (err.name === 'AbortError') {
      return NextResponse.json({ success: false, error: 'Request timed out. The page took too long to respond.' }, { status: 504 });
    }
    return NextResponse.json({ success: false, error: `Network error: ${err.message}` }, { status: 422 });
  }

  const scriptRegex = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  let recipeData = null;

  while ((match = scriptRegex.exec(html)) !== null) {
    try {
      const parsed = JSON.parse(match[1].trim());
      const found = findRecipeInBlock(parsed);
      if (found) {
        recipeData = found;
        break;
      }
    } catch {
      // Skip malformed JSON blocks
    }
  }

  if (!recipeData) {
    return NextResponse.json({ success: false, error: 'No recipe data found on this page. Try a different recipe site.' });
  }

  const rawIngredients = Array.isArray(recipeData.recipeIngredient) ? recipeData.recipeIngredient : [];
  const ingredients = rawIngredients.map(str => ({
    amount: '',
    unit: '',
    name: typeof str === 'string' ? str : String(str),
  }));
  if (ingredients.length === 0) {
    ingredients.push({ amount: '', unit: '', name: '' });
  }

  const rawInstructions = Array.isArray(recipeData.recipeInstructions) ? recipeData.recipeInstructions : [];
  const instructions = rawInstructions
    .map(extractInstructionText)
    .filter(s => s.trim() !== '');
  if (instructions.length === 0) {
    instructions.push('');
  }

  const nutrition = recipeData.nutrition || {};
  const calories = extractNumber(nutrition.calories) || '';
  const protein = extractNumber(nutrition.proteinContent) || '';
  const fat = extractNumber(nutrition.fatContent) || '';
  const carbs = extractNumber(nutrition.carbohydrateContent) || '';

  const servings = extractNumber(recipeData.recipeYield) || '';

  const recipe = {
    name: recipeData.name ? String(recipeData.name).trim() : '',
    description: stripHtml(recipeData.description, 300),
    category: mapCategory(recipeData.recipeCuisine),
    prepTime: parseISODuration(recipeData.prepTime),
    cookTime: parseISODuration(recipeData.cookTime),
    servings,
    calories,
    protein,
    fat,
    carbs,
    ingredients,
    instructions,
    tags: ['low-calorie', 'high-protein'],
    imported: true,
  };

  return NextResponse.json({ success: true, recipe });
}
