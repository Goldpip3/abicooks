import { NextResponse } from 'next/server';

const USDA_API_KEY = 'DEMO_KEY';
const USDA_BASE = 'https://api.nal.usda.gov/fdc/v1';

function getNutrient(nutrients, id) {
  if (!Array.isArray(nutrients)) return 0;
  const found = nutrients.find(n => n.nutrientId === id || (n.nutrient && n.nutrient.id === id));
  if (!found) return 0;
  return Number(found.value || found.amount || 0);
}

function mapDetailFood(food) {
  const nutrients = food.foodNutrients || [];
  return {
    fdcId: food.fdcId,
    description: food.description,
    per100g: {
      calories: getNutrient(nutrients, 1008),
      protein: getNutrient(nutrients, 1003),
      fat: getNutrient(nutrients, 1004),
      carbs: getNutrient(nutrients, 1005),
    },
  };
}

export async function POST(request) {
  const { ingredients, servings } = await request.json().catch(() => ({}));
  if (!Array.isArray(ingredients) || ingredients.length === 0) {
    return NextResponse.json({ error: 'ingredients array is required' }, { status: 400 });
  }
  const numServings = Number(servings) || 1;

  let totalCalories = 0;
  let totalProtein = 0;
  let totalFat = 0;
  let totalCarbs = 0;

  await Promise.all(
    ingredients.map(async (ing) => {
      if (!ing.fdcId) return;
      const grams = Number(ing.gramsEstimate) || 100;
      try {
        const url = `${USDA_BASE}/food/${ing.fdcId}?api_key=${USDA_API_KEY}`;
        const response = await fetch(url);
        if (!response.ok) return;
        const data = await response.json();
        const mapped = mapDetailFood(data);
        const factor = grams / 100;
        totalCalories += mapped.per100g.calories * factor;
        totalProtein += mapped.per100g.protein * factor;
        totalFat += mapped.per100g.fat * factor;
        totalCarbs += mapped.per100g.carbs * factor;
      } catch {
        // Skip ingredients that fail to fetch
      }
    })
  );

  const round = (n) => Math.round(n * 10) / 10;

  return NextResponse.json({
    total: {
      calories: round(totalCalories),
      protein: round(totalProtein),
      fat: round(totalFat),
      carbs: round(totalCarbs),
    },
    perServing: {
      calories: round(totalCalories / numServings),
      protein: round(totalProtein / numServings),
      fat: round(totalFat / numServings),
      carbs: round(totalCarbs / numServings),
    },
  });
}
