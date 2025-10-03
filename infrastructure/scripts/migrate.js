#!/usr/bin/env node
/**
 * Database Migration Runner
 * Runs all SQL migrations in order
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://localhost:5432/sapframework';

async function runMigrations() {
  const pool = new Pool({ connectionString: DATABASE_URL });

  try {
    console.log('🔄 Connecting to database...');
    await pool.query('SELECT 1');
    console.log('✅ Connected successfully\n');

    // Get migration files
    const migrationsDir = path.join(__dirname, '../database');
    const files = [
      'schema.sql',
      'migrations/002_security_compliance.sql'
    ];

    for (const file of files) {
      const filePath = path.join(migrationsDir, file);

      if (!fs.existsSync(filePath)) {
        console.log(`⚠️  Skipping ${file} (not found)`);
        continue;
      }

      console.log(`📝 Running migration: ${file}`);
      const sql = fs.readFileSync(filePath, 'utf8');

      try {
        await pool.query(sql);
        console.log(`✅ Completed: ${file}\n`);
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log(`⚠️  Already exists, skipping: ${file}\n`);
        } else {
          throw error;
        }
      }
    }

    // Verify tables
    console.log('🔍 Verifying tables...');
    const result = await pool.query(`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename
    `);

    console.log('\n📊 Tables in database:');
    result.rows.forEach(row => {
      console.log(`   - ${row.tablename}`);
    });

    // Count SoD tables specifically
    const sodTables = result.rows.filter(r =>
      r.tablename.includes('sod') ||
      r.tablename.includes('audit') ||
      r.tablename.includes('gdpr')
    );

    console.log(`\n✅ Migration complete! ${sodTables.length} compliance tables ready.`);

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigrations();
