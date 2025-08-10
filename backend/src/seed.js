import { pool } from "./db.js";

async function seed() {
  await pool.query(`
    INSERT INTO inspections (site, inspection_date, findings, status)
    VALUES
    ('Site Alpha','2025-08-01','Fire extinguisher expired','UnderReview'),
    ('Site Beta','2025-08-05','Emergency exits clear','Approved'),
    ('Warehouse 3','2025-08-07','Damaged ladder','Draft')
  `);
  console.log("Seeded sample inspections.");
  process.exit(0);
}

seed().catch(e => { console.error(e); process.exit(1); });

