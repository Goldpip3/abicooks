import { NextResponse } from 'next/server';
import { query, ensureDB } from '@/lib/db';

function toRecipe(row) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    category: row.category,
    tags: row.tags || [],
    prepTime: row.prep_time,
    cookTime: row.cook_time,
    servings: row.servings,
    calories: row.calories,
    protein: row.protein,
    ingredients: row.ingredients || [],
    instructions: row.instructions || [],
    createdAt: row.created_at,
  };
}

export async function GET(request, { params }) {
  try {
    await ensureDB();
    const { rows } = await query('SELECT * FROM recipes WHERE id = $1', [params.id]);
    if (rows.length === 0) return NextResponse.json({ error: 'Recipe not found' }, { status: 404 });
    return NextResponse.json(toRecipe(rows[0]));
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    await ensureDB();
    const { rows: existing } = await query('SELECT id FROM recipes WHERE id = $1', [params.id]);
    if (existing.length === 0) return NextResponse.json({ error: 'Recipe not found' }, { status: 404 });

    const { name, description, category, tags, prepTime, cookTime, servings, calories, protein, ingredients, instructions } = await request.json();

    const { rows } = await query(
      `UPDATE recipes
       SET name = $1, description = $2, category = $3, tags = $4, prep_time = $5,
           cook_time = $6, servings = $7, calories = $8, protein = $9,
           ingredients = $10, instructions = $11
       WHERE id = $12
       RETURNING *`,
      [
        name,
        description || '',
        category || '',
        JSON.stringify(tags || []),
        prepTime || 0,
        cookTime || 0,
        servings || 1,
        calories || 0,
        protein || 0,
        JSON.stringify(ingredients || []),
        JSON.stringify(instructions || []),
        params.id,
      ]
    );
    return NextResponse.json(toRecipe(rows[0]));
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    await ensureDB();
    const { rowCount } = await query('DELETE FROM recipes WHERE id = $1', [params.id]);
    if (rowCount === 0) return NextResponse.json({ error: 'Recipe not found' }, { status: 404 });
    return NextResponse.json({ message: 'Recipe deleted successfully' });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
