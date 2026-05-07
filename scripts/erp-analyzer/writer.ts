import { mkdir, writeFile } from 'fs/promises'
import { join } from 'path'
import type { SchemaData } from './types'

const OUTPUT_DIR = 'docs/erp-analysis'

export async function ensureOutputDir(): Promise<void> {
  await mkdir(OUTPUT_DIR, { recursive: true })
  await mkdir(join(OUTPUT_DIR, 'modules'), { recursive: true })
}

export async function writeFile_(path: string, content: string): Promise<void> {
  await writeFile(path, content, 'utf-8')
  console.log(`  ✓ ${path}`)
}

export async function writeModuleDoc(moduleName: string, content: string): Promise<void> {
  await writeFile_(join(OUTPUT_DIR, 'modules', `${moduleName}.md`), content)
}

export async function writeIndexDoc(content: string): Promise<void> {
  await writeFile_(join(OUTPUT_DIR, 'index.md'), content)
}

export async function writeSchemaDoc(schema: SchemaData): Promise<void> {
  const lines: string[] = [
    '# Schema Completo do ERP',
    '',
    `> Coletado em: ${schema.collected_at}`,
    '',
    `**Tabelas:** ${schema.tables.length} | **Views:** ${schema.views.length} | **Funções:** ${schema.functions.length} | **Triggers:** ${schema.triggers.length}`,
    '',
  ]

  if (schema.enums.length > 0) {
    lines.push('## Enums\n')
    for (const en of schema.enums) {
      lines.push(`### \`${en.enum_name}\``)
      lines.push(`Valores: \`${en.values.join('`, `')}\`\n`)
    }
  }

  lines.push('## Tabelas\n')
  for (const table of schema.tables) {
    lines.push(`### \`${table.table_name}\``)
    lines.push(`_${table.row_count.toLocaleString('pt-BR')} registros_\n`)

    lines.push('| Coluna | Tipo | Nullable | Default |')
    lines.push('|--------|------|:--------:|---------|')
    for (const col of table.columns) {
      const isPK = table.primary_keys.includes(col.column_name) ? ' 🔑' : ''
      lines.push(`| \`${col.column_name}\`${isPK} | ${col.data_type} | ${col.is_nullable === 'YES' ? '✓' : '✗'} | ${col.column_default ?? '-'} |`)
    }

    if (table.foreign_keys.length > 0) {
      lines.push('\n**Relacionamentos:**')
      for (const fk of table.foreign_keys) {
        lines.push(`- \`${fk.column_name}\` → [\`${fk.referenced_table}\`](#${fk.referenced_table}).\`${fk.referenced_column}\``)
      }
    }

    if (table.check_constraints.length > 0) {
      lines.push('\n**Check Constraints:**')
      for (const cc of table.check_constraints) {
        lines.push(`- \`${cc.constraint_name}\`: \`${cc.check_clause}\``)
      }
    }

    if (table.unique_constraints.length > 0) {
      lines.push('\n**Únicos:**')
      for (const uc of table.unique_constraints) {
        lines.push(`- \`${uc.columns.join('`, `')}\``)
      }
    }

    lines.push('')
  }

  if (schema.views.length > 0) {
    lines.push('## Views\n')
    for (const view of schema.views) {
      lines.push(`### \`${view.view_name}\`\n`)
      lines.push('```sql')
      lines.push(view.view_definition?.trim() ?? '')
      lines.push('```\n')
    }
  }

  if (schema.functions.length > 0) {
    lines.push('## Funções\n')
    for (const fn of schema.functions) {
      lines.push(`### \`${fn.function_name}\`\n`)
      lines.push(`- **Retorno:** ${fn.return_type}`)
      lines.push(`- **Argumentos:** ${fn.arguments || '(nenhum)'}`)
      lines.push(`- **Linguagem:** ${fn.language}\n`)
      lines.push('```sql')
      lines.push(fn.function_definition?.trim() ?? '')
      lines.push('```\n')
    }
  }

  if (schema.triggers.length > 0) {
    lines.push('## Triggers\n')
    lines.push('| Nome | Tabela | Timing | Evento | Função |')
    lines.push('|------|--------|--------|--------|--------|')
    for (const tr of schema.triggers) {
      lines.push(`| \`${tr.trigger_name}\` | \`${tr.table_name}\` | ${tr.timing} | ${tr.event} | \`${tr.function_name}\` |`)
    }
    lines.push('')
  }

  await writeFile_(join(OUTPUT_DIR, 'schema.md'), lines.join('\n'))
}

export async function writeRawJson(schema: SchemaData): Promise<void> {
  // Write raw schema as JSON for further processing
  await writeFile_(
    join(OUTPUT_DIR, 'schema-raw.json'),
    JSON.stringify(schema, null, 2),
  )
}
