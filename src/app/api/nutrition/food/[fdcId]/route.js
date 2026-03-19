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

export async function GET(request, { params }) {
  const { fdcId } = params;
  try {
    const url = `${USDA_BASE}/food/${fdcId}?api_key=${USDA_API_KEY}`;
    const response = await fetch(url);
    if (!response.ok) return NextResponse.json({ error: 'Food not found' }, { status: 404 });
    const data = await response.json();
    return NextResponse.json(mapDetailFood(data));
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
