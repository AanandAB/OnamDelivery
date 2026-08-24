-- OnamDelivery seed data (dev/test) — Kannur flower marketplace.

INSERT INTO categories (id, name_en, name_ml, sort_order) VALUES
  ('cat-bouquet',  'Bouquet',        'പൂച്ചെണ്ട്',     1),
  ('cat-garland',  'Garland',        'മാല',           2),
  ('cat-loose',    'Loose Flowers',  'പൂക്കൾ',         3),
  ('cat-pookalam', 'Pookalam Kit',   'പൂക്കളം കിറ്റ്',  4),
  ('cat-pooja',    'Pooja / Worship','പൂജ',           5);

INSERT INTO vendors (id, name, phone, lat, lng, radius_km, is_open) VALUES
  ('ven-sreelakshmi', 'Sree Lakshmi Flowers', '9747123456', 11.8745, 75.3704, 12, 1),
  ('ven-onammart',    'Onam Flower Mart',     '9747234567', 11.8680, 75.3610, 10, 1),
  ('ven-kannurflora', 'Kannur Flora',         '9747345678', 11.8800, 75.3650,  8, 1);

INSERT INTO products (id, vendor_id, category_id, name_en, name_ml, unit, price, stock, occasion) VALUES
  ('prod-101', 'ven-sreelakshmi', 'cat-garland',  'Jasmine Garland (Mulla)', 'മുല്ല മാല',         'piece',  60, 50, 'onam'),
  ('prod-102', 'ven-sreelakshmi', 'cat-loose',    'Rose (loose)',            'റോസാപ്പൂ',          'kg',    340, 20, 'wedding'),
  ('prod-103', 'ven-sreelakshmi', 'cat-pookalam', 'Pookalam Kit (5 colours)','പൂക്കളം കിറ്റ്',     'piece', 250, 15, 'onam'),
  ('prod-104', 'ven-onammart',    'cat-garland',  'Marigold Garland',        'ചെണ്ടുമല്ലി മാല',   'piece',  40, 100, 'puja'),
  ('prod-105', 'ven-onammart',    'cat-loose',    'Chrysanthemum (bunch)',   'ജമന്തിപ്പൂ കെട്ട്',  'bunch',  80, 30, 'onam'),
  ('prod-106', 'ven-onammart',    'cat-bouquet',  'Mixed Rose Bouquet',      'മിക്സഡ് റോസ് ബൊക്കെ','piece', 450, 10, 'birthday'),
  ('prod-107', 'ven-kannurflora', 'cat-pooja',    'Lotus (pooja)',           'താമര',             'piece',  25, 40, 'puja'),
  ('prod-108', 'ven-kannurflora', 'cat-loose',    'Tuberose (bunch)',        'രജനിഗന്ധി',        'bunch',  90, 25, 'wedding');
