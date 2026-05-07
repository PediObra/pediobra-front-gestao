#!/usr/bin/env bun
import 'dotenv/config'
import { collectSchemaData } from './collector'
import { groupTablesIntoModules } from './grouper'
import { analyzeModule, analyzeOverview } from './analyzer'
import { ensureOutputDir, writeModuleDoc, writeIndexDoc, writeSchemaDoc, writeRawJson } from './writer'

const SKIP_AI = process.argv.includes('--no-ai')
const ONLY_SCHEMA = process.argv.includes('--schema-only')

async function main() {
  console.log('')
  console.log('╔════════════════════════════════════════════╗')
  console.log('║   ERP Business Rules Analyzer              ║')
  console.log('║   Extrator de Regras de Negócio via DB     ║')
  console.log('╚════════════════════════════════════════════╝')
  console.log('')

  const dbUrl = process.env.ERP_DATABASE_URL
  if (!dbUrl) {
    console.error('❌  Variável ERP_DATABASE_URL não definida.')
    console.error('    Crie um arquivo .env.local com:')
    console.error('    ERP_DATABASE_URL=postgresql://user:pass@host:5432/dbname')
    process.exit(1)
  }

  if (!SKIP_AI && !process.env.ANTHROPIC_API_KEY) {
    console.error('❌  Variável ANTHROPIC_API_KEY não definida.')
    console.error('    Use --no-ai para gerar apenas o schema sem análise por IA.')
    process.exit(1)
  }

  // 1. Collect
  console.log('📦  [1/4] Coletando dados do banco de dados...')
  const startCollect = Date.now()
  const schema = await collectSchemaData(dbUrl)
  const collectTime = ((Date.now() - startCollect) / 1000).toFixed(1)
  console.log(`     ✓ ${schema.tables.length} tabelas | ${schema.views.length} views | ${schema.functions.length} funções | ${schema.triggers.length} triggers | ${schema.enums.length} enums`)
  console.log(`     ✓ Coletado em ${collectTime}s`)
  console.log('')

  // 2. Group
  console.log('🗂️   [2/4] Agrupando tabelas por módulo de negócio...')
  const modules = groupTablesIntoModules(schema)
  console.log(`     ✓ ${modules.length} módulos identificados:`)
  for (const mod of modules) {
    console.log(`       - ${mod.label} (${mod.tables.length} tabelas)`)
  }
  console.log('')

  // 3. Write schema docs
  console.log('📄  [3/4] Gerando documentação de schema...')
  await ensureOutputDir()
  await writeSchemaDoc(schema)
  await writeRawJson(schema)
  console.log('')

  if (ONLY_SCHEMA) {
    console.log('✅  Modo --schema-only: pulando análise por IA.')
    printSummary(modules.length, schema.tables.length)
    return
  }

  // 4. AI Analysis
  console.log('🤖  [4/4] Analisando módulos com IA (Claude)...')
  console.log('     (isso pode levar alguns minutos dependendo do tamanho do schema)\n')

  const allTableNames = schema.tables.map(t => t.table_name)
  let analyzed = 0

  // Analyze modules sequentially to avoid rate limits
  for (const mod of modules) {
    console.log(`     [${++analyzed}/${modules.length}] Analisando: ${mod.label} (${mod.tables.length} tabelas)...`)
    const content = await analyzeModule(mod, allTableNames)
    await writeModuleDoc(mod.name, content)
  }

  console.log('')
  console.log('     Gerando visão geral do sistema...')
  const overview = await analyzeOverview(schema, modules.map(m => ({ name: m.name, label: m.label, tableCount: m.tables.length })))
  await writeIndexDoc(overview)

  console.log('')
  printSummary(modules.length, schema.tables.length)
}

function printSummary(moduleCount: number, tableCount: number) {
  console.log('╔════════════════════════════════════════════╗')
  console.log('║   ✅  Análise concluída!                    ║')
  console.log('╚════════════════════════════════════════════╝')
  console.log('')
  console.log(`📁  Arquivos gerados em: docs/erp-analysis/`)
  console.log(`    ├── index.md          (visão geral do sistema)`)
  console.log(`    ├── schema.md         (schema completo)`)
  console.log(`    ├── schema-raw.json   (dados brutos para reprocessamento)`)
  console.log(`    └── modules/          (${moduleCount} módulos analisados)`)
  console.log('')
  console.log(`📊  Resumo: ${tableCount} tabelas organizadas em ${moduleCount} módulos`)
  console.log('')
  console.log('💡  Dica: Edite os docs gerados e rode novamente com --schema-only')
  console.log('    para regenerar apenas o schema sem chamar a IA novamente.')
  console.log('')
}

main().catch(err => {
  console.error('\n❌  Erro durante a análise:')
  console.error(err)
  process.exit(1)
})
