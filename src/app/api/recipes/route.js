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

export async function GET(request) {
  try {
    await ensureDB();

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const q = searchParams.get('q') || searchParams.get('search');
    const tag = searchParams.get('tag');

    const conditions = [];
    const params = [];

    if (category) {
      params.push(category);
      conditions.push(`category = $${params.length}`);
    }
    if (q) {
      params.push(`%${q}%`);
      conditions.push(`(name ILIKE $${params.length} OR description ILIKE $${params.length})`);
    }
    if (tag) {
      params.push(tag);
      conditions.push(`$${params.length} = ANY(ARRAY(SELECT jsonb_array_elements_text(tags)))`);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const { rows } = await query(`SELECT * FROM recipes ${where} ORDER BY id`, params);
    return NextResponse.json(rows.map(toRecipe));
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await ensureDB();

    const { name, description, category, tags, prepTime, cookTime, servings, calories, protein, ingredients, instructions } = await request.json();
    if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

    const { rows } = await query(
      `INSERT INTO recipes (name, description, category, tags, prep_time, cook_time, servings, calories, protein, ingredients, instructions)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
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
      ]
    );
    return NextResponse.json(toRecipe(rows[0]), { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
