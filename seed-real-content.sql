BEGIN;

-- Classes
WITH inserted_classes AS (
  INSERT INTO classes (
    name,
    description,
    category,
    duration_minutes,
    price,
    is_active
  )
  VALUES
    (
      'يوغا مسائية - الأحد',
      'جلسة يوغا وتأمل وأجواء لطيفة مع سناك صحي',
      'yoga',
      90,
      50.00,
      true
    ),
    (
      'يوغا مسائية - الاثنين',
      'جلسة يوغا وتنفس وتأمل مع سناك صحي وأجواء لطيفة',
      'yoga',
      90,
      50.00,
      true
    ),
    (
      'حصة Mix - الثلاثاء',
      'تمارين فتنس ورقص وحركة',
      'fitness', -- TODO: confirm with client if this should be "dance" instead.
      45,
      35.00,
      true
    ),
    (
      'يوغا صباحية - الجمعة',
      'جلسة يوغا وتمارين تنفس وتمدد وفطور صحي',
      'yoga',
      90,
      50.00,
      true
    )
  RETURNING id, name
),

-- Sessions
session_templates AS (
  SELECT *
  FROM (
    VALUES
      (
        'يوغا مسائية - الأحد',
        0,
        time '18:00',
        time '19:30',
        6,
        'مركز ميزان، رام الله، وسط البلد، طلعة بيرزيت فردات، شارع سالم زعرور'
      ),
      (
        'يوغا مسائية - الاثنين',
        1,
        time '18:00',
        time '19:30',
        6,
        'مركز ميزان، رام الله، وسط البلد، طلعة بيرزيت فردات، شارع سالم زعرور'
      ),
      (
        'حصة Mix - الثلاثاء',
        2,
        time '18:00',
        time '18:45',
        6,
        'مركز ميزان، رام الله، وسط البلد، طلعة بيرزيت فردات، شارع سالم زعرور'
      ),
      (
        'يوغا صباحية - الجمعة',
        5,
        time '08:00',
        time '09:30',
        6,
        'مركز ميزان، رام الله، وسط البلد، طلعة بيرزيت فردات، شارع سالم زعرور'
      )
  ) AS template (
    class_name,
    target_dow,
    start_time,
    end_time,
    capacity,
    location
  )
),
session_rows AS (
  SELECT
    inserted_classes.id AS class_id,
    (
      current_date
      + (
        (
          session_templates.target_dow
          - extract(dow FROM current_date)::int
          + 7
        ) % 7
      )
      + (weeks.week_number * 7)
    )::date AS session_date,
    session_templates.start_time,
    session_templates.end_time,
    session_templates.capacity,
    session_templates.location
  FROM inserted_classes
  JOIN session_templates
    ON session_templates.class_name = inserted_classes.name
  CROSS JOIN generate_series(0, 3) AS weeks(week_number)
)
INSERT INTO class_sessions (
  class_id,
  session_date,
  start_time,
  end_time,
  capacity,
  booked_count,
  status,
  location
)
SELECT
  class_id,
  session_date,
  start_time,
  end_time,
  capacity,
  0,
  'scheduled',
  location
FROM session_rows
ORDER BY class_id, session_date;

-- Products
-- Note: the brief says "PRODUCTS (7 total)" but lists 8 products below, so all 8 listed products are included.
WITH product_seed AS (
  SELECT *
  FROM (
    VALUES
      (
        'كريم جسم (كراميل)',
        'كريم جسم برائحة الكراميل',
        15.00,
        'AH-BODY-CREAM-CARAMEL'
      ),
      (
        'سكراب جسم',
        'سكراب جسم طبيعي',
        15.00,
        'AH-BODY-SCRUB'
      ),
      (
        'كتيب مساحة أحلام - 30 يوم',
        'كتيب يومي لمدة 30 يوم لبناء عادات صحية وتوازن ووعي أكثر، يتضمن خطوات وعادات يومية وآيات قرآنية',
        25.00,
        'AH-BOOKLET-30D'
      ),
      (
        'شمعة زلفة',
        'شمعة برائحة القهوة والدفء، مكونات طبيعية',
        40.00,
        'AH-CANDLE-ZALFA'
      ),
      (
        'شمعة دفا',
        'شمعة دافئة، مكونات طبيعية',
        40.00,
        'AH-CANDLE-DAFA'
      ),
      (
        'شمعة بصيرة',
        'شمعة برائحة اللافندر الهادئة، مكونات طبيعية',
        40.00,
        'AH-CANDLE-BASEERA'
      ),
      (
        'شمعة سكون',
        'شمعة بخليط العود والمسك، رائحة عربية أصيلة',
        40.00,
        'AH-CANDLE-SUKOON'
      ),
      (
        'شمعة بيت عربي',
        'شمعة بحضور دافئ وأصيل، عناية بالبيئة',
        40.00,
        'AH-CANDLE-ARAB-HOME'
      )
  ) AS seed (name, description, price, sku)
),
inserted_products AS (
  INSERT INTO products (
    name,
    description,
    price,
    is_active
  )
  SELECT
    name,
    description,
    price,
    true
  FROM product_seed
  RETURNING id, name
),
variant_rows AS (
  SELECT
    inserted_products.id AS product_id,
    null::text AS size,
    null::text AS color,
    10 AS stock,
    product_seed.sku
  FROM inserted_products
  JOIN product_seed
    ON product_seed.name = inserted_products.name
)

-- Variants
-- TODO: update stock to real count once confirmed by client.
INSERT INTO product_variants (
  product_id,
  size,
  color,
  stock,
  sku
)
SELECT
  product_id,
  size,
  color,
  stock,
  sku
FROM variant_rows
ORDER BY sku;

COMMIT;
