import type { SchemaData, Module, TableInfo, ViewInfo, FunctionInfo, TriggerInfo } from './types'

// Known ERP module prefixes (Portuguese and English)
const MODULE_PREFIXES: Record<string, string> = {
  fin: 'Financeiro',
  financial: 'Financeiro',
  financeiro: 'Financeiro',
  caixa: 'Financeiro',
  conta: 'Financeiro',
  contas: 'Financeiro',
  lanc: 'Financeiro',
  lancamento: 'Financeiro',
  com: 'Comercial',
  venda: 'Comercial',
  vendas: 'Comercial',
  pedido: 'Comercial',
  orcamento: 'Comercial',
  nfe: 'Fiscal',
  nfce: 'Fiscal',
  nota: 'Fiscal',
  fiscal: 'Fiscal',
  imposto: 'Fiscal',
  tribut: 'Fiscal',
  cfop: 'Fiscal',
  ncm: 'Fiscal',
  cst: 'Fiscal',
  est: 'Estoque',
  estoque: 'Estoque',
  produto: 'Estoque',
  prod: 'Estoque',
  item: 'Estoque',
  lote: 'Estoque',
  almox: 'Estoque',
  comp: 'Compras',
  compra: 'Compras',
  compras: 'Compras',
  fornecedor: 'Fornecedores',
  forn: 'Fornecedores',
  cliente: 'Clientes',
  cli: 'Clientes',
  clientes: 'Clientes',
  pessoa: 'Cadastros',
  pessoas: 'Cadastros',
  cad: 'Cadastros',
  cadastro: 'Cadastros',
  rh: 'RH',
  funcionario: 'RH',
  funcionarios: 'RH',
  colaborador: 'RH',
  folha: 'RH',
  ponto: 'RH',
  prod_: 'Produção',
  producao: 'Produção',
  ordem: 'Produção',
  log: 'Logística',
  logistica: 'Logística',
  entrega: 'Logística',
  frete: 'Logística',
  transportadora: 'Logística',
  cfg: 'Configuração',
  config: 'Configuração',
  configuracao: 'Configuração',
  parametro: 'Configuração',
  parametros: 'Configuração',
  param: 'Configuração',
  usuario: 'Segurança',
  usuarios: 'Segurança',
  perfil: 'Segurança',
  permissao: 'Segurança',
  acesso: 'Segurança',
  rel: 'Relatórios',
  relatorio: 'Relatórios',
  dashboard: 'Relatórios',
}

function detectModule(name: string): { key: string; label: string } {
  const lower = name.toLowerCase().replace(/[^a-z_]/g, '')

  // Try full word match first (table might be just the domain word)
  if (MODULE_PREFIXES[lower]) {
    return { key: lower, label: MODULE_PREFIXES[lower] }
  }

  // Try prefix match (sorted longest first to be more specific)
  const sorted = Object.keys(MODULE_PREFIXES).sort((a, b) => b.length - a.length)
  for (const prefix of sorted) {
    if (lower.startsWith(prefix + '_') || lower.startsWith(prefix)) {
      return { key: prefix, label: MODULE_PREFIXES[prefix] }
    }
  }

  // Fallback: first word before underscore
  const firstPart = lower.split('_')[0]
  if (firstPart && firstPart.length <= 8) {
    return { key: firstPart, label: firstPart.charAt(0).toUpperCase() + firstPart.slice(1) }
  }

  return { key: 'geral', label: 'Geral' }
}

function buildFkGraph(tables: TableInfo[]): Map<string, Set<string>> {
  const graph = new Map<string, Set<string>>()
  for (const table of tables) {
    if (!graph.has(table.table_name)) graph.set(table.table_name, new Set())
    for (const fk of table.foreign_keys) {
      graph.get(table.table_name)!.add(fk.referenced_table)
    }
  }
  return graph
}

export function groupTablesIntoModules(schema: SchemaData): Module[] {
  const moduleMap = new Map<string, { label: string; tableNames: Set<string> }>()

  // First pass: assign each table to a module by name prefix
  for (const table of schema.tables) {
    const { key, label } = detectModule(table.table_name)
    if (!moduleMap.has(key)) {
      moduleMap.set(key, { label, tableNames: new Set() })
    }
    moduleMap.get(key)!.tableNames.add(table.table_name)
  }

  // Second pass: pull FK-referenced tables into the referencing module
  // (only when referenced table is in 'geral' or has no strong affiliation)
  const fkGraph = buildFkGraph(schema.tables)

  function findModuleKey(tableName: string): string {
    for (const [key, mod] of moduleMap) {
      if (mod.tableNames.has(tableName)) return key
    }
    return 'geral'
  }

  let changed = true
  while (changed) {
    changed = false
    for (const [tableName, deps] of fkGraph) {
      const tableModKey = findModuleKey(tableName)
      for (const dep of deps) {
        const depModKey = findModuleKey(dep)
        if (depModKey === 'geral' && tableModKey !== 'geral') {
          moduleMap.get(tableModKey)!.tableNames.add(dep)
          moduleMap.get('geral')?.tableNames.delete(dep)
          changed = true
        }
      }
    }
  }

  // Build Module objects
  const tableByName = new Map(schema.tables.map(t => [t.table_name, t]))
  const modules: Module[] = []

  for (const [key, { label, tableNames }] of moduleMap) {
    if (tableNames.size === 0) continue

    const tables = Array.from(tableNames)
      .map(n => tableByName.get(n))
      .filter((t): t is TableInfo => !!t)
      .sort((a, b) => a.table_name.localeCompare(b.table_name))

    const tableNamesLower = tables.map(t => t.table_name.toLowerCase())

    const views = schema.views.filter(v =>
      tableNamesLower.some(t => v.view_name.toLowerCase().includes(t.split('_')[0]))
    )
    const functions = schema.functions.filter(f =>
      tableNamesLower.some(t => f.function_name.toLowerCase().includes(t.split('_')[0]))
    )
    const triggers = schema.triggers.filter(tr => tableNames.has(tr.table_name))

    modules.push({ name: key, label, tables, views, functions, triggers })
  }

  return modules
    .filter(m => m.tables.length > 0)
    .sort((a, b) => b.tables.length - a.tables.length)
}
