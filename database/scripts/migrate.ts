import { runMigrations } from '../../server/src/db/database.ts';

runMigrations()
  .then(() => {
    console.log('Database migrations applied successfully.');
  })
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exitCode = 1;
  });
