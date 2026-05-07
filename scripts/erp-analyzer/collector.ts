import { Client } from 'pg'
import type {
  SchemaData, TableInfo, ColumnInfo, ForeignKeyInfo,
  UniqueConstraintInfo, CheckConstraintInfo, IndexInfo,
  ViewInfo, FunctionInfo, TriggerInfo, EnumInfo,
} from './types'

export async function collectSchemaData(connectionString: string): Promise<SchemaData> {
  const client = new Client({ connectionString, statement_timeout: 30000 })
  await client.connect()

  try {
    const tables = await collectTables(client)
    const views = await collectViews(client)
    const functions = await collectFunctions(client)
    const triggers = await collectTriggers(client)
    const enums = await collectEnums(client)

    return { tables, views, functions, triggers, enums, collected_at: new Date().toISOString() }
  } finally {
    await client.end()
  }
}

async function collectTables(client: Client): Promise<TableInfo[]> {
  const { rows } = await client.query<{ table_name: string }>(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `)

  const tables: TableInfo[] = []
  for (const { table_name } of rows) {
    process.stdout.write(`     table: ${table_name}\r`)
    tables.push(await collectTableInfo(client, table_name))
  }
  process.stdout.write('\n')
  return tables
}

async function collectTableInfo(client: Client, tableName: string): Promise<TableInfo> {
  const [columns, pks, fks, uniques, checks, indexes, countResult] = await Promise.all([
    client.query<ColumnInfo>(`
      SELECT column_name, data_type, is_nullable, column_default, character_maximum_length
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1
      ORDER BY ordinal_position
    `, [tableName]),

    client.query<{ column_name: string }>(`
      SELECT kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_schema = 'public' AND tc.table_name = $1 AND tc.constraint_type = 'PRIMARY KEY'
      ORDER BY kcu.ordinal_position
    `, [tableName]),

    client.query<ForeignKeyInfo>(`
      SELECT kcu.constraint_name, kcu.column_name,
             ccu.table_name AS referenced_table, ccu.column_name AS referenced_column
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
      WHERE tc.table_schema = 'public' AND tc.table_name = $1 AND tc.constraint_type = 'FOREIGN KEY'
    `, [tableName]),

    client.query<UniqueConstraintInfo>(`
      SELECT tc.constraint_name,
             array_agg(kcu.column_name ORDER BY kcu.ordinal_position) AS columns
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_schema = 'public' AND tc.table_name = $1 AND tc.constraint_type = 'UNIQUE'
      GROUP BY tc.constraint_name
    `, [tableName]),

    client.query<CheckConstraintInfo>(`
      SELECT cc.constraint_name, cc.check_clause
      FROM information_schema.check_constraints cc
      JOIN information_schema.table_constraints tc ON cc.constraint_name = tc.constraint_name
      WHERE tc.table_schema = 'public' AND tc.table_name = $1
      AND cc.check_clause NOT LIKE '% IS NOT NULL'
    `, [tableName]),

    client.query<IndexInfo>(`
      SELECT i.relname AS index_name, ix.indisunique AS is_unique,
             pg_get_indexdef(ix.indexrelid) AS index_definition,
             array_agg(a.attname ORDER BY array_position(ix.indkey, a.attnum)) AS columns
      FROM pg_class t
      JOIN pg_index ix ON t.oid = ix.indrelid
      JOIN pg_class i ON i.oid = ix.indexrelid
      JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
      JOIN pg_namespace n ON n.oid = t.relnamespace
      WHERE n.nspname = 'public' AND t.relname = $1
      GROUP BY i.relname, ix.indisunique, ix.indexrelid
    `, [tableName]),

    client.query<{ count: string }>(`SELECT COUNT(*) AS count FROM "${tableName}"`),
  ])

  const rowCount = parseInt(countResult.rows[0].count)
  let sample_data: Record<string, unknown>[] = []

  if (rowCount > 0) {
    const sample = await client.query(`SELECT * FROM "${tableName}" LIMIT 30`)
    sample_data = sample.rows
  }

  return {
    table_name: tableName,
    columns: columns.rows,
    primary_keys: pks.rows.map(r => r.column_name),
    foreign_keys: fks.rows,
    unique_constraints: uniques.rows,
    check_constraints: checks.rows,
    indexes: indexes.rows,
    sample_data,
    row_count: rowCount,
  }
}

async function collectViews(client: Client): Promise<ViewInfo[]> {
  const { rows } = await client.query<ViewInfo>(`
    SELECT table_name AS view_name, view_definition
    FROM information_schema.views
    WHERE table_schema = 'public'
    ORDER BY table_name
  `)
  return rows
}

async function collectFunctions(client: Client): Promise<FunctionInfo[]> {
  const { rows } = await client.query<FunctionInfo>(`
    SELECT
      p.proname AS function_name,
      pg_get_function_result(p.oid) AS return_type,
      pg_get_function_arguments(p.oid) AS arguments,
      pg_get_functiondef(p.oid) AS function_definition,
      l.lanname AS language
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    JOIN pg_language l ON l.oid = p.prolang
    WHERE n.nspname = 'public' AND p.prokind = 'f'
    ORDER BY p.proname
  `)
  return rows
}

async function collectTriggers(client: Client): Promise<TriggerInfo[]> {
  const { rows } = await client.query<TriggerInfo>(`
    SELECT
      trigger_name, event_object_table AS table_name,
      action_timing AS timing, event_manipulation AS event,
      action_statement AS function_name
    FROM information_schema.triggers
    WHERE trigger_schema = 'public'
    ORDER BY trigger_name
  `)
  return rows
}

async function collectEnums(client: Client): Promise<EnumInfo[]> {
  const { rows } = await client.query<EnumInfo>(`
    SELECT t.typname AS enum_name,
           array_agg(e.enumlabel ORDER BY e.enumsortorder) AS values
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
    GROUP BY t.typname
    ORDER BY t.typname
  `)
  return rows
}
