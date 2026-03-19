import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query, ensureDB } from '@/lib/db';

function toRecipe(row) {
  if (!row || !row.recipe_id) return null;
  return {
    id: row.recipe_id,
    name: row.recipe_name,
    description: row.recipe_description,
    category: row.recipe_category,
    tags: row.recipe_tags || [],
    prepTime: row.recipe_prep_time,
    cookTime: row.recipe_cook_time,
    servings: row.recipe_servings,
    calories: row.recipe_calories,
    protein: row.recipe_protein,
    ingredients: row.recipe_ingredients || [],
    instructions: row.recipe_instructions || [],
    createdAt: row.recipe_created_at,
  };
}

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    await ensureDB();
    const { searchParams } = new URL(request.url);
    const week = searchParams.get('week');
    if (!week) return NextResponse.json({ error: 'week query parameter is required (YYYY-MM-DD)' }, { status: 400 });

    const { rows } = await query(
      `SELECT
         wp.id, wp.user_id, wp.week_start, wp.day, wp.slot, wp.recipe_id,
         r.id AS recipe_id,
         r.name AS recipe_name,
         r.description AS recipe_description,
         r.category AS recipe_category,
         r.tags AS recipe_tags,
         r.prep_time AS recipe_prep_time,
         r.cook_time AS recipe_cook_time,
         r.servings AS recipe_servings,
         r.calories AS recipe_calories,
         r.protein AS recipe_protein,
         r.ingredients AS recipe_ingredients,
         r.instructions AS recipe_instructions,
         r.created_at AS recipe_created_at
       FROM weekly_plans wp
       LEFT JOIN recipes r ON wp.recipe_id = r.id
       WHERE wp.user_id = $1 AND wp.week_start = $2`,
      [session.user.id, week]
    );

    const plans = rows.map(row => ({
      id: row.id,
      user_id: row.user_id,
      week_start: row.week_start,
      day: row.day,
      slot: row.slot,
      recipe_id: row.recipe_id,
      recipe: toRecipe(row),
    }));

    return NextResponse.json(plans);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    await ensureDB();
    const { week_start, day, slot, recipe_id } = await request.json();
    if (!week_start || !day || !slot) {
      return NextResponse.json({ error: 'week_start, day, and slot are required' }, { status: 400 });
    }

    const { rows } = await query(
      `INSERT INTO weekly_plans (user_id, week_start, day, slot, recipe_id)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id, week_start, day, slot) DO UPDATE SET recipe_id = $5
       RETURNING *`,
      [session.user.id, week_start, day, slot, recipe_id || null]
    );

    const planRow = rows[0];

    let recipe = null;
    if (planRow.recipe_id) {
      const { rows: recipeRows } = await query(
        `SELECT id, name, description, category, tags, prep_time, cook_time,
                servings, calories, protein, ingredients, instructions, created_at
         FROM recipes WHERE id = $1`,
        [planRow.recipe_id]
      );
      if (recipeRows.length > 0) {
        const r = recipeRows[0];
        recipe = {
          id: r.id,
          name: r.name,
          description: r.description,
          category: r.category,
          tags: r.tags || [],
          prepTime: r.prep_time,
          cookTime: r.cook_time,
          servings: r.servings,
          calories: r.calories,
          protein: r.protein,
          ingredients: r.ingredients || [],
          instructions: r.instructions || [],
          createdAt: r.created_at,
        };
      }
    }

    return NextResponse.json({
      id: planRow.id,
      user_id: planRow.user_id,
      week_start: planRow.week_start,
      day: planRow.day,
      slot: planRow.slot,
      recipe_id: planRow.recipe_id,
      recipe,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    await ensureDB();
    const { week_start, day, slot } = await request.json();
    if (!week_start || !day || !slot) {
      return NextResponse.json({ error: 'week_start, day, and slot are required' }, { status: 400 });
    }

    await query(
      `DELETE FROM weekly_plans
       WHERE user_id = $1 AND week_start = $2 AND day = $3 AND slot = $4`,
      [session.user.id, week_start, day, slot]
    );

    return NextResponse.json({ message: 'Slot cleared successfully' });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
