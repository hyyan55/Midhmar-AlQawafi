import { runMigrations, seedAuthenticPoetry } from '../../server/src/db/database.ts';

async function main() {
  await runMigrations();
  await seedAuthenticPoetry();
  console.log('Authentic Arabic poetry seed completed.');
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exitCode = 1;
});
