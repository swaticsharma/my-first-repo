-- Demo seed data for local development. Run after migrations.
-- Creates one verified Chinese supplier with 3 products and one Indian buyer org.

insert into organizations (id, kind, legal_name, display_name, country, website, about, verified, verified_at)
values
  ('11111111-1111-1111-1111-111111111111', 'supplier',
   'Shenzhen Mindray Medical Co., Ltd. (Demo)', 'Mindray Demo', 'CN',
   'https://www.mindray.com',
   'Leading Chinese medtech manufacturer for patient monitoring, anesthesia and IVD.', true, now()),
  ('22222222-2222-2222-2222-222222222222', 'buyer',
   'Apollo Hospitals Enterprise Limited (Demo)', 'Apollo Demo', 'IN',
   'https://www.apollohospitals.com',
   'Indian multi-specialty hospital chain.', true, now());

insert into supplier_profiles (org_id, factory_city, factory_province, business_license_no, nmpa_registration_no,
  established_year, employee_count, capabilities, payment_terms_accepted, incoterms_offered,
  typical_lead_time_days, min_lead_time_days)
values
  ('11111111-1111-1111-1111-111111111111', 'Shenzhen', 'Guangdong', 'BL-DEMO-001', 'NMPA-DEMO-001',
   1991, 13000,
   array['OEM','ODM','CE marking','NMPA registration','CDSCO export support'],
   array['TT 30/70','LC at sight','Escrow'],
   array['FOB','CIF','DDP'],
   30, 14);

insert into buyer_profiles (org_id, billing_state, gstin, cdsco_importer_license_no, buyer_segment)
values
  ('22222222-2222-2222-2222-222222222222', 'Tamil Nadu', '33AAACA1234A1Z5', 'CDSCO-IMP-DEMO-001', 'hospital');

insert into products (id, supplier_org_id, category_id, sku, name, short_description, long_description,
  device_class, hs_code, gmdn_code, specs, moq, unit_price_usd, lead_time_days, lead_time_days_express,
  warranty_months, active)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
   '11111111-1111-1111-1111-111111111111',
   (select id from categories where slug = 'patient-monitoring'),
   'MW-PM-12',
   '12.1" Multi-Parameter Patient Monitor',
   '5-parameter bedside monitor (ECG, SpO2, NIBP, Temp, Resp) with 12.1" touchscreen.',
   'CDSCO-cleared multi-parameter patient monitor suitable for ICU and general ward use. Includes battery backup, central station compatibility, and 72h trend storage.',
   'IIb', '9018.19', '35119',
   '{"screen":"12.1 inch","parameters":["ECG","SpO2","NIBP","Temp","Resp"],"battery_hours":4,"network":"LAN + WiFi"}'::jsonb,
   10, 850.00, 28, 18, 24, true),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
   '11111111-1111-1111-1111-111111111111',
   (select id from categories where slug = 'infusion-therapy'),
   'MW-IP-3',
   'Volumetric Infusion Pump (single channel)',
   'Single-channel volumetric infusion pump, 0.1–1500 mL/h, CDSCO + CE.',
   'Drug library, KVO, anti-bolus protection, 4h internal battery.',
   'IIb', '9018.39', '36019',
   '{"rate_range":"0.1-1500 mL/h","drug_library":true,"battery_hours":4}'::jsonb,
   20, 380.00, 21, 12, 24, true),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc',
   '11111111-1111-1111-1111-111111111111',
   (select id from categories where slug = 'respiratory-care'),
   'MW-OC-5',
   '5L Oxygen Concentrator',
   '5L/min continuous flow oxygen concentrator, ≥93% purity.',
   'Suitable for home and clinic use. Low-noise compressor (<45 dB).',
   'IIa', '9019.20', '37381',
   '{"flow_lpm":5,"purity_min":"93%","noise_db":45}'::jsonb,
   30, 220.00, 18, 10, 18, true);

insert into product_certifications (product_id, kind, cert_number, expires_on) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'NMPA', 'NMPA-2024-PM-0001', '2028-12-31'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'CE', 'CE-2023-PM-0001', '2027-06-30'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'CDSCO_IMPORT', 'CDSCO-IMP-PM-0001', '2027-12-31'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'NMPA', 'NMPA-2024-IP-0001', '2028-12-31'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'CE', 'CE-2023-IP-0001', '2027-06-30'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'NMPA', 'NMPA-2024-OC-0001', '2028-12-31');

insert into org_certifications (org_id, kind, cert_number, issuing_body, expires_on, verified, verified_at)
values
  ('11111111-1111-1111-1111-111111111111', 'ISO_13485', 'TUV-13485-DEMO', 'TÜV SÜD', '2027-09-30', true, now());

-- Sample order + shipment to demo live tracking
insert into orders (id, order_no, buyer_org_id, supplier_org_id, product_id, quantity, unit_price_usd,
  total_usd, incoterm, status, promised_dispatch_on, promised_delivery_on)
values
  ('dddddddd-dddd-dddd-dddd-dddddddddddd',
   'MW-2026-000001',
   '22222222-2222-2222-2222-222222222222',
   '11111111-1111-1111-1111-111111111111',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
   50, 820.00, 41000.00, 'CIF',
   'in_transit', '2026-05-10', '2026-06-05');

insert into shipments (id, order_id, carrier, tracking_no, mode, origin_port, destination_port, dispatched_at, eta)
values
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
   'dddddddd-dddd-dddd-dddd-dddddddddddd',
   'COSCO', 'COSU6789012345', 'sea_fcl',
   'Yantian (Shenzhen)', 'Nhava Sheva (Mumbai)',
   '2026-05-10T08:00:00Z', '2026-06-05T16:00:00Z');

insert into shipment_events (shipment_id, occurred_at, location, status, description, source) values
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '2026-05-09T03:00:00Z', 'Shenzhen factory', 'Picked up', 'Container sealed and dispatched to port', 'manual_supplier'),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '2026-05-10T08:00:00Z', 'Yantian Port', 'Loaded on vessel', 'Loaded on COSCO BANGKOK V.0123W', 'carrier_webhook'),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '2026-05-17T11:00:00Z', 'Singapore', 'In transit', 'Vessel passed Singapore Strait', 'carrier_webhook');
