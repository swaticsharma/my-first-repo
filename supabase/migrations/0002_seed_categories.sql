-- Seed top-level medtech categories aligned to common GMDN buckets and the
-- India import pattern from China. Edit slugs/names freely.

insert into categories (slug, name, device_class, gmdn_term, description) values
  ('diagnostic-imaging', 'Diagnostic Imaging', 'IIb', 'Imaging system', 'Ultrasound, X-ray, MRI, CT components & systems'),
  ('patient-monitoring', 'Patient Monitoring', 'IIb', 'Patient monitor', 'Multi-parameter monitors, ECG, SpO2, NIBP modules'),
  ('infusion-therapy', 'Infusion & Therapy', 'IIb', 'Infusion pump', 'Infusion pumps, syringe pumps, IV sets'),
  ('respiratory-care', 'Respiratory Care', 'IIb', 'Ventilator', 'Ventilators, CPAP/BiPAP, oxygen concentrators'),
  ('surgical-instruments', 'Surgical Instruments', 'IIa', 'Surgical instrument', 'Reusable & single-use surgical instruments'),
  ('lab-diagnostics', 'In-Vitro Diagnostics', 'IIa', 'IVD reagent/analyser', 'IVD analysers, reagents, rapid test kits'),
  ('dental', 'Dental Equipment', 'IIa', 'Dental device', 'Dental chairs, handpieces, imaging'),
  ('orthopedic-implants', 'Orthopedic Implants', 'III', 'Orthopedic implant', 'Plates, screws, prostheses'),
  ('disposables', 'Disposables & Consumables', 'I', 'Single-use device', 'Gloves, syringes, drapes, tubing'),
  ('hospital-furniture', 'Hospital Furniture', 'I', 'Hospital bed', 'Beds, trolleys, examination tables'),
  ('sterilization', 'Sterilization & Disinfection', 'IIa', 'Sterilizer', 'Autoclaves, UV systems, chemical sterilizers'),
  ('ophthalmic', 'Ophthalmic Devices', 'IIa', 'Ophthalmic device', 'Slit lamps, phaco machines, IOLs');
