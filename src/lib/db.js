import { Pool } from 'pg';

if (!global._pgPool) {
  global._pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });
}

const pool = global._pgPool;

export async function query(text, params) {
  const client = await pool.connect();
  try {
    return await client.query(text, params);
  } finally {
    client.release();
  }
}

export async function initDB() {
  // Create users table
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT,
      google_id TEXT UNIQUE,
      status TEXT NOT NULL DEFAULT 'pending',
      is_admin BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // Migrations for existing deployments
  await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id TEXT`);
  await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS status TEXT`);
  await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE`);
  try { await query(`ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL`); } catch (_) {}
  // Approve any pre-existing users that don't have a status yet
  await query(`UPDATE users SET status = 'approved' WHERE status IS NULL`);

  // Create recipes table
  await query(`
    CREATE TABLE IF NOT EXISTS recipes (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      category TEXT DEFAULT '',
      tags JSONB DEFAULT '[]',
      prep_time INTEGER DEFAULT 0,
      cook_time INTEGER DEFAULT 0,
      servings INTEGER DEFAULT 1,
      calories INTEGER DEFAULT 0,
      protein INTEGER DEFAULT 0,
      ingredients JSONB DEFAULT '[]',
      instructions JSONB DEFAULT '[]',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // Create weekly_plans table with user_id
  await query(`
    CREATE TABLE IF NOT EXISTS weekly_plans (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      week_start TEXT NOT NULL,
      day TEXT NOT NULL,
      slot TEXT NOT NULL,
      recipe_id INTEGER REFERENCES recipes(id) ON DELETE SET NULL,
      UNIQUE(user_id, week_start, day, slot)
    )
  `);

  // Seed recipes only if table is empty
  const { rows } = await query('SELECT COUNT(*) as count FROM recipes');
  if (parseInt(rows[0].count) === 0) {
    await seedRecipes();
    console.log('Database seeded with 12 recipes.');
  }
}

async function seedRecipes() {
  const recipes = [
    {
      name: 'Chicken Piccata',
      description: 'Tender chicken cutlets in a bright lemon-caper sauce',
      category: 'italian',
      tags: ['low-calorie', 'high-protein'],
      prep_time: 10,
      cook_time: 20,
      servings: 2,
      calories: 420,
      protein: 45,
      ingredients: [
        { amount: '2', unit: 'large', name: 'chicken breasts, pounded thin' },
        { amount: '2', unit: 'tbsp', name: 'flour' },
        { amount: '2', unit: 'tbsp', name: 'olive oil' },
        { amount: '3', unit: 'cloves', name: 'garlic, minced' },
        { amount: '1/2', unit: 'cup', name: 'chicken broth' },
        { amount: '1/4', unit: 'cup', name: 'lemon juice' },
        { amount: '2', unit: 'tbsp', name: 'capers' },
        { amount: '2', unit: 'tbsp', name: 'parsley, chopped' },
        { amount: '', unit: '', name: 'salt and pepper' }
      ],
      instructions: [
        'Season chicken with salt and pepper, dredge lightly in flour.',
        'Heat olive oil in skillet over medium-high.',
        'Cook chicken 3-4 min per side until golden. Remove and set aside.',
        'Sauté garlic 30 seconds.',
        'Add broth and lemon juice, scrape up browned bits. Simmer 2 min.',
        'Add capers and return chicken to pan. Simmer 3 min.',
        'Garnish with parsley.'
      ]
    },
    {
      name: 'Turkey Bolognese',
      description: 'Hearty lean turkey meat sauce over whole wheat pasta',
      category: 'italian',
      tags: ['low-calorie', 'high-protein'],
      prep_time: 10,
      cook_time: 35,
      servings: 4,
      calories: 480,
      protein: 42,
      ingredients: [
        { amount: '500', unit: 'g', name: 'lean ground turkey' },
        { amount: '1', unit: 'cup', name: 'marinara sauce' },
        { amount: '1', unit: 'can (400g)', name: 'crushed tomatoes' },
        { amount: '1', unit: 'medium', name: 'onion, diced' },
        { amount: '3', unit: 'cloves', name: 'garlic, minced' },
        { amount: '1', unit: 'medium', name: 'carrot, diced' },
        { amount: '1', unit: 'stalk', name: 'celery, diced' },
        { amount: '1', unit: 'tbsp', name: 'olive oil' },
        { amount: '1', unit: 'tsp', name: 'oregano' },
        { amount: '320', unit: 'g', name: 'whole wheat spaghetti' },
        { amount: '', unit: '', name: 'salt and pepper' }
      ],
      instructions: [
        'Heat oil in large pan.',
        'Sauté onion, carrot, celery 5 min.',
        'Add garlic, cook 1 min.',
        'Add turkey, breaking it up, cook until browned 8 min.',
        'Add tomatoes, marinara sauce and oregano, simmer 20 min.',
        'Season to taste.',
        'Cook pasta per package instructions.',
        'Serve sauce over pasta.'
      ]
    },
    {
      name: 'Shrimp Arrabbiata',
      description: 'Spicy tomato sauce with plump shrimp over linguine',
      category: 'italian',
      tags: ['low-calorie', 'high-protein'],
      prep_time: 10,
      cook_time: 15,
      servings: 2,
      calories: 390,
      protein: 38,
      ingredients: [
        { amount: '400', unit: 'g', name: 'large shrimp, peeled and deveined' },
        { amount: '1', unit: 'can (400g)', name: 'crushed tomatoes' },
        { amount: '4', unit: 'cloves', name: 'garlic, minced' },
        { amount: '1', unit: 'tsp', name: 'red pepper flakes' },
        { amount: '1', unit: 'tbsp', name: 'olive oil' },
        { amount: '1', unit: 'tbsp', name: 'fresh basil' },
        { amount: '200', unit: 'g', name: 'linguine' },
        { amount: '', unit: '', name: 'salt' }
      ],
      instructions: [
        'Cook linguine per package instructions.',
        'Heat oil in pan over medium-high.',
        'Add garlic and pepper flakes, cook 1 min.',
        'Add tomatoes, simmer 8 min.',
        'Add shrimp and cook 3-4 min until pink.',
        'Toss with pasta.',
        'Top with fresh basil.'
      ]
    },
    {
      name: 'Shakshuka with Eggs',
      description: 'Eggs poached in a rich spiced tomato and pepper sauce',
      category: 'middle-eastern',
      tags: ['low-calorie', 'high-protein'],
      prep_time: 5,
      cook_time: 25,
      servings: 2,
      calories: 340,
      protein: 32,
      ingredients: [
        { amount: '6', unit: 'large', name: 'eggs' },
        { amount: '1', unit: 'can (400g)', name: 'crushed tomatoes' },
        { amount: '1', unit: 'medium', name: 'red bell pepper, diced' },
        { amount: '1', unit: 'medium', name: 'onion, diced' },
        { amount: '3', unit: 'cloves', name: 'garlic, minced' },
        { amount: '1', unit: 'tbsp', name: 'olive oil' },
        { amount: '1', unit: 'tsp', name: 'cumin' },
        { amount: '1', unit: 'tsp', name: 'paprika' },
        { amount: '1/2', unit: 'tsp', name: 'cayenne' },
        { amount: '', unit: '', name: 'fresh parsley' },
        { amount: '', unit: '', name: 'salt and pepper' }
      ],
      instructions: [
        'Heat oil in oven-safe skillet.',
        'Sauté onion and pepper 5 min.',
        'Add garlic and spices, cook 1 min.',
        'Add tomatoes, simmer 10 min.',
        'Make 6 wells and crack eggs into them.',
        'Cover and cook 8-10 min until whites are set.',
        'Garnish with fresh parsley.'
      ]
    },
    {
      name: 'Lamb Kofta Bowl',
      description: 'Spiced lamb patties over brown rice with cool tzatziki',
      category: 'middle-eastern',
      tags: ['low-calorie', 'high-protein'],
      prep_time: 15,
      cook_time: 15,
      servings: 2,
      calories: 460,
      protein: 44,
      ingredients: [
        { amount: '400', unit: 'g', name: 'lean ground lamb' },
        { amount: '1/2', unit: 'cup', name: 'Greek yogurt' },
        { amount: '1/2', unit: 'medium', name: 'cucumber, diced' },
        { amount: '1', unit: 'tsp', name: 'cumin' },
        { amount: '1', unit: 'tsp', name: 'coriander' },
        { amount: '1/2', unit: 'tsp', name: 'cinnamon' },
        { amount: '1', unit: 'cup', name: 'brown rice, cooked' },
        { amount: '1', unit: 'tbsp', name: 'fresh mint' },
        { amount: '1', unit: 'lemon', name: 'juice of' },
        { amount: '2', unit: 'cloves', name: 'garlic, minced' },
        { amount: '', unit: '', name: 'salt and pepper' }
      ],
      instructions: [
        'Mix lamb with cumin, coriander, cinnamon, garlic, salt.',
        'Shape into oval patties.',
        'Grill or pan-fry 3-4 min per side.',
        'Make tzatziki by combining yogurt, cucumber, lemon juice, and mint.',
        'Serve kofta over rice with tzatziki.'
      ]
    },
    {
      name: 'Grilled Chicken Shawarma',
      description: 'Aromatic spiced chicken with garlic yogurt sauce and fresh tomatoes',
      category: 'middle-eastern',
      tags: ['low-calorie', 'high-protein'],
      prep_time: 20,
      cook_time: 15,
      servings: 2,
      calories: 430,
      protein: 48,
      ingredients: [
        { amount: '2', unit: 'large', name: 'chicken breasts' },
        { amount: '1', unit: 'tsp', name: 'cumin' },
        { amount: '1', unit: 'tsp', name: 'turmeric' },
        { amount: '1', unit: 'tsp', name: 'paprika' },
        { amount: '1/2', unit: 'tsp', name: 'cinnamon' },
        { amount: '1/2', unit: 'tsp', name: 'cayenne' },
        { amount: '2', unit: 'tbsp', name: 'olive oil' },
        { amount: '1', unit: 'lemon', name: 'juice of' },
        { amount: '3', unit: 'cloves', name: 'garlic, minced' },
        { amount: '1/2', unit: 'cup', name: 'Greek yogurt' },
        { amount: '1', unit: 'cup', name: 'cherry tomatoes, halved' },
        { amount: '', unit: '', name: 'fresh parsley' }
      ],
      instructions: [
        'Combine spices, oil, lemon juice, and garlic.',
        'Marinate chicken 15-30 min.',
        'Grill or pan-sear 6-7 min per side until cooked through.',
        'Rest 5 min, slice thinly.',
        'Mix yogurt with a little garlic for sauce.',
        'Serve chicken with tomatoes, parsley, and yogurt sauce.'
      ]
    },
    {
      name: 'Beef Bulgogi Bowl',
      description: 'Sweet and savory Korean marinated beef over brown rice',
      category: 'asian',
      tags: ['low-calorie', 'high-protein'],
      prep_time: 15,
      cook_time: 10,
      servings: 2,
      calories: 470,
      protein: 46,
      ingredients: [
        { amount: '400', unit: 'g', name: 'sirloin, thinly sliced' },
        { amount: '3', unit: 'tbsp', name: 'low-sodium soy sauce' },
        { amount: '1', unit: 'tbsp', name: 'sesame oil' },
        { amount: '1', unit: 'tbsp', name: 'honey' },
        { amount: '4', unit: 'cloves', name: 'garlic, minced' },
        { amount: '1', unit: 'tsp', name: 'fresh ginger, grated' },
        { amount: '1', unit: 'cup', name: 'brown rice, cooked' },
        { amount: '2', unit: '', name: 'green onions, sliced' },
        { amount: '1', unit: 'tsp', name: 'sesame seeds' },
        { amount: '1/2', unit: 'cup', name: 'shredded cabbage' }
      ],
      instructions: [
        'Combine soy sauce, sesame oil, honey, garlic, and ginger.',
        'Marinate beef 10 min.',
        'Cook in hot pan or grill 2-3 min per side until caramelized.',
        'Serve over rice with cabbage, green onions, and sesame seeds.'
      ]
    },
    {
      name: 'Thai Basil Chicken',
      description: 'Fragrant ground chicken stir-fry with fresh Thai basil and chilies',
      category: 'asian',
      tags: ['low-calorie', 'high-protein'],
      prep_time: 10,
      cook_time: 12,
      servings: 2,
      calories: 380,
      protein: 40,
      ingredients: [
        { amount: '400', unit: 'g', name: 'ground chicken' },
        { amount: '1', unit: 'cup', name: 'fresh Thai basil (or regular basil)' },
        { amount: '4', unit: 'cloves', name: 'garlic, minced' },
        { amount: '2', unit: '', name: 'Thai chilies, sliced' },
        { amount: '2', unit: 'tbsp', name: 'fish sauce' },
        { amount: '1', unit: 'tbsp', name: 'oyster sauce' },
        { amount: '1', unit: 'tbsp', name: 'soy sauce' },
        { amount: '1', unit: 'tsp', name: 'sugar' },
        { amount: '1', unit: 'tbsp', name: 'vegetable oil' },
        { amount: '1', unit: 'cup', name: 'jasmine rice, cooked' },
        { amount: '2', unit: '', name: 'fried eggs' }
      ],
      instructions: [
        'Heat oil in wok over high heat.',
        'Add garlic and chilies, stir-fry 30 sec.',
        'Add chicken, cook breaking it up 5-6 min.',
        'Add fish sauce, oyster sauce, soy sauce, and sugar. Toss to coat.',
        'Remove from heat, fold in basil.',
        'Serve over rice with fried egg.'
      ]
    },
    {
      name: 'Miso Salmon',
      description: 'Glazed salmon with umami miso marinade over rice and bok choy',
      category: 'asian',
      tags: ['low-calorie', 'high-protein'],
      prep_time: 10,
      cook_time: 12,
      servings: 2,
      calories: 410,
      protein: 42,
      ingredients: [
        { amount: '2', unit: 'fillets (200g each)', name: 'salmon' },
        { amount: '2', unit: 'tbsp', name: 'white miso paste' },
        { amount: '1', unit: 'tbsp', name: 'mirin' },
        { amount: '1', unit: 'tbsp', name: 'low-sodium soy sauce' },
        { amount: '1', unit: 'tsp', name: 'honey' },
        { amount: '1', unit: 'tsp', name: 'sesame oil' },
        { amount: '2', unit: 'cups', name: 'baby bok choy' },
        { amount: '1', unit: 'cup', name: 'brown rice, cooked' },
        { amount: '', unit: '', name: 'sesame seeds' },
        { amount: '', unit: '', name: 'green onions' }
      ],
      instructions: [
        'Preheat oven to 400°F (200°C).',
        'Mix miso, mirin, soy sauce, honey, and sesame oil.',
        'Coat salmon and marinate 5 min.',
        'Bake salmon 10-12 min until flaky.',
        'Steam or stir-fry bok choy 3 min.',
        'Serve over rice, garnish with sesame seeds and green onions.'
      ]
    },
    {
      name: 'Turkey Chili',
      description: 'Smoky lean turkey chili packed with beans and bold spices',
      category: 'american',
      tags: ['low-calorie', 'high-protein'],
      prep_time: 10,
      cook_time: 30,
      servings: 4,
      calories: 390,
      protein: 44,
      ingredients: [
        { amount: '500', unit: 'g', name: 'lean ground turkey' },
        { amount: '1', unit: 'can (400g)', name: 'kidney beans, drained' },
        { amount: '1', unit: 'can (400g)', name: 'crushed tomatoes' },
        { amount: '1', unit: 'cup', name: 'chicken broth' },
        { amount: '1', unit: 'medium', name: 'onion, diced' },
        { amount: '3', unit: 'cloves', name: 'garlic, minced' },
        { amount: '1', unit: 'medium', name: 'red bell pepper, diced' },
        { amount: '2', unit: 'tbsp', name: 'chili powder' },
        { amount: '1', unit: 'tsp', name: 'cumin' },
        { amount: '1', unit: 'tsp', name: 'smoked paprika' },
        { amount: '1', unit: 'tbsp', name: 'olive oil' },
        { amount: '', unit: '', name: 'salt and pepper' }
      ],
      instructions: [
        'Heat oil in large pot.',
        'Sauté onion and pepper 5 min.',
        'Add garlic and spices, cook 1 min.',
        'Add turkey, cook until browned 7 min.',
        'Add tomatoes, beans, and broth.',
        'Simmer 20 min until thickened.',
        'Season to taste.',
        'Serve with optional low-fat Greek yogurt instead of sour cream.'
      ]
    },
    {
      name: 'Grilled Chicken & Sweet Potato',
      description: 'Herb-seasoned chicken breast with roasted sweet potato and broccoli',
      category: 'american',
      tags: ['low-calorie', 'high-protein'],
      prep_time: 10,
      cook_time: 30,
      servings: 2,
      calories: 450,
      protein: 50,
      ingredients: [
        { amount: '2', unit: 'large', name: 'chicken breasts' },
        { amount: '2', unit: 'medium', name: 'sweet potatoes, cubed' },
        { amount: '1', unit: 'tbsp', name: 'olive oil' },
        { amount: '1', unit: 'tsp', name: 'garlic powder' },
        { amount: '1', unit: 'tsp', name: 'paprika' },
        { amount: '1', unit: 'tsp', name: 'thyme' },
        { amount: '2', unit: 'cups', name: 'broccoli florets' },
        { amount: '', unit: '', name: 'salt and pepper' },
        { amount: '', unit: '', name: 'lemon wedges' }
      ],
      instructions: [
        'Preheat oven to 425°F (220°C).',
        'Toss sweet potatoes with olive oil, salt, and pepper.',
        'Roast 20 min.',
        'Season chicken with garlic powder, paprika, thyme, salt, and pepper.',
        'Grill or pan-sear chicken 6-7 min per side.',
        'Add broccoli to oven last 10 min.',
        'Serve together with lemon wedges.'
      ]
    },
    {
      name: 'Cajun Shrimp & Rice',
      description: 'Bold Cajun-spiced shrimp with colorful peppers over brown rice',
      category: 'american',
      tags: ['low-calorie', 'high-protein'],
      prep_time: 10,
      cook_time: 20,
      servings: 2,
      calories: 400,
      protein: 46,
      ingredients: [
        { amount: '400', unit: 'g', name: 'large shrimp, peeled and deveined' },
        { amount: '1', unit: 'cup', name: 'brown rice, cooked' },
        { amount: '1', unit: 'medium', name: 'red bell pepper, sliced' },
        { amount: '1', unit: 'medium', name: 'green bell pepper, sliced' },
        { amount: '1', unit: 'medium', name: 'onion, sliced' },
        { amount: '2', unit: 'cloves', name: 'garlic, minced' },
        { amount: '1', unit: 'tbsp', name: 'Cajun seasoning' },
        { amount: '1', unit: 'tbsp', name: 'olive oil' },
        { amount: '2', unit: 'tbsp', name: 'hot sauce' },
        { amount: '', unit: '', name: 'lemon juice' },
        { amount: '', unit: '', name: 'fresh parsley' }
      ],
      instructions: [
        'Season shrimp with Cajun seasoning.',
        'Heat oil in large skillet over high heat.',
        'Cook peppers and onion 5 min.',
        'Add garlic, cook 1 min.',
        'Add shrimp, cook 2-3 min per side until pink.',
        'Add hot sauce and a squeeze of lemon.',
        'Serve over rice, garnish with parsley.'
      ]
    }
  ];

  for (const r of recipes) {
    await query(
      `INSERT INTO recipes
        (name, description, category, tags, prep_time, cook_time, servings, calories, protein, ingredients, instructions)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        r.name,
        r.description,
        r.category,
        JSON.stringify(r.tags),
        r.prep_time,
        r.cook_time,
        r.servings,
        r.calories,
        r.protein,
        JSON.stringify(r.ingredients),
        JSON.stringify(r.instructions)
      ]
    );
  }
}

// Global flag so initDB only runs once per process
let _dbInitialized = false;
let _dbInitPromise = null;

export async function ensureDB() {
  if (_dbInitialized) return;
  if (_dbInitPromise) return _dbInitPromise;
  _dbInitPromise = initDB().then(() => {
    _dbInitialized = true;
  }).catch(err => {
    _dbInitPromise = null;
    throw err;
  });
  return _dbInitPromise;
}
