import Anthropic from '@anthropic-ai/sdk'
import type { Module, SchemaData } from './types'

const anthropic = new Anthropic()

function buildSchemaContext(module: Module): string {
  const parts: string[] = []

  for (const table of module.tables) {
    parts.push(`### Tabela: \`${table.table_name}\` (${table.row_count.toLocaleString('pt-BR')} registros)\n`)

    parts.push('**Colunas:**')
    for (const col of table.columns) {
      const isPK = table.primary_keys.includes(col.column_name)
      const nullable = col.is_nullable === 'YES' ? '' : ' NOT NULL'
      const defaultVal = col.column_default ? ` DEFAULT ${col.column_default}` : ''
      const pkMark = isPK ? ' [PK]' : ''
      parts.push(`- \`${col.column_name}\`: ${col.data_type}${nullable}${defaultVal}${pkMark}`)
    }

    if (table.foreign_keys.length > 0) {
      parts.push('\n**Chaves Estrangeiras:**')
      for (const fk of table.foreign_keys) {
        parts.push(`- \`${fk.column_name}\` → \`${fk.referenced_table}.${fk.referenced_column}\``)
      }
    }

    if (table.unique_constraints.length > 0) {
      parts.push('\n**Restrições Únicas:**')
      for (const uc of table.unique_constraints) {
        parts.push(`- ${uc.columns.join(', ')}`)
      }
    }

    if (table.check_constraints.length > 0) {
      parts.push('\n**Check Constraints (Regras Explícitas):**')
      for (const cc of table.check_constraints) {
        parts.push(`- \`${cc.constraint_name}\`: ${cc.check_clause}`)
      }
    }

    if (table.sample_data.length > 0) {
      // Sanitize sensitive-looking columns before sending to AI
      const safeSample = table.sample_data.slice(0, 5).map(row => {
        const sanitized: Record<string, unknown> = {}
        for (const [k, v] of Object.entries(row)) {
          const lower = k.toLowerCase()
          if (lower.includes('senha') || lower.includes('password') || lower.includes('secret') || lower.includes('token')) {
            sanitized[k] = '[REDACTED]'
          } else {
            sanitized[k] = v
          }
        }
        return sanitized
      })
      parts.push('\n**Amostra de Dados:**')
      parts.push('```json')
      parts.push(JSON.stringify(safeSample, null, 2))
      parts.push('```')
    }

    parts.push('')
  }

  if (module.views.length > 0) {
    parts.push('### Views do Módulo\n')
    for (const view of module.views) {
      parts.push(`**\`${view.view_name}\`:**`)
      parts.push('```sql')
      parts.push(view.view_definition?.trim() ?? '')
      parts.push('```\n')
    }
  }

  if (module.functions.length > 0) {
    parts.push('### Funções do Módulo\n')
    for (const fn of module.functions) {
      parts.push(`**\`${fn.function_name}(${fn.arguments})\`** → ${fn.return_type} [${fn.language}]`)
      parts.push('```sql')
      parts.push(fn.function_definition?.trim() ?? '')
      parts.push('```\n')
    }
  }

  if (module.triggers.length > 0) {
    parts.push('### Triggers do Módulo\n')
    for (const tr of module.triggers) {
      parts.push(`- \`${tr.trigger_name}\`: ${tr.timing} ${tr.event} ON \`${tr.table_name}\` → executa \`${tr.function_name}\``)
    }
    parts.push('')
  }

  return parts.join('\n')
}

export async function analyzeModule(
  module: Module,
  allTableNames: string[],
  retries = 2,
): Promise<string> {
  const schemaContext = buildSchemaContext(module)

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 8192,
      system: [
        {
          type: 'text',
          text: `Você é um especialista sênior em análise de sistemas ERP e regras de negócio.
Sua tarefa é analisar schemas de banco de dados de sistemas ERP legados e extrair as regras de negócio,
fluxos de trabalho e lógica implícita, para que o sistema possa ser reconstruído.

Diretrizes:
- Responda sempre em português brasileiro
- Seja específico: cite nomes de campos e tabelas exatos
- Use os dados de amostra para confirmar hipóteses sobre o domínio
- Identifique padrões de status/workflow em campos como "status", "situacao", "tipo"
- Aponte cálculos e fórmulas implícitos (ex: valor_total = quantidade * preco_unitario)
- Identifique soft-delete (campos como "ativo", "excluido", "deleted_at")
- Aponte campos de auditoria (created_at, updated_at, created_by, etc.)
- Liste dúvidas e pontos que precisam de confirmação com o usuário do negócio`,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analise o módulo **"${module.label}"** do ERP e gere documentação completa de regras de negócio.

**Outros módulos/tabelas no sistema:** ${allTableNames.filter(t => !module.tables.find(mt => mt.table_name === t)).join(', ')}

---

## Schema do Módulo "${module.label}"

${schemaContext}

---

Gere um documento Markdown completo seguindo exatamente esta estrutura:

# Módulo: ${module.label}

> _Análise gerada automaticamente por ERP Business Rules Analyzer_

## 1. Visão Geral
[O que este módulo representa no negócio? Qual seu propósito principal?]

## 2. Entidades Principais
[Para cada tabela, descreva em termos de negócio o que ela representa, seus campos mais importantes e seu papel no processo]

## 3. Regras de Negócio Identificadas

### 3.1 Regras Explícitas (Constraints)
[Regras visíveis em CHECK, NOT NULL, UNIQUE constraints — explique o significado de negócio]

### 3.2 Regras Implícitas (Inferidas dos Dados)
[Padrões observados nos dados de amostra, defaults, enums]

### 3.3 Regras de Triggers e Funções
[O que cada trigger/função faz e qual regra de negócio implementa]

## 4. Fluxos de Trabalho (Workflows)
[Sequências de operações, ciclos de vida de entidades, estados e transições]

## 5. Relacionamentos com Outros Módulos
[Como este módulo depende de ou alimenta outros módulos do ERP]

## 6. Campos de Controle e Auditoria
[Status, soft-delete, timestamps, usuários responsáveis]

## 7. Pontos de Atenção
[Regras que parecem importantes mas não estão claras — precisam de confirmação]

## 8. Perguntas Abertas
[Lista numerada de perguntas para validar com o usuário/especialista do negócio]

## 9. Sugestão de Modelo para Reconstrução
[Como modelar este módulo no novo ERP — entidades, relações, regras principais]`,
              cache_control: { type: 'ephemeral' },
            },
          ],
        },
      ],
    })

    const text = response.content.find(b => b.type === 'text')?.text ?? ''
    return text
  } catch (err) {
    if (retries > 0) {
      await new Promise(r => setTimeout(r, 3000))
      return analyzeModule(module, allTableNames, retries - 1)
    }
    throw err
  }
}

export async function analyzeOverview(schema: SchemaData, modules: Array<{ name: string; label: string; tableCount: number }>): Promise<string> {
  const tableList = schema.tables
    .map(t => `- \`${t.table_name}\`: ${t.row_count.toLocaleString('pt-BR')} registros`)
    .join('\n')

  const moduleList = modules
    .map(m => `- **${m.label}** (\`${m.name}\`): ${m.tableCount} tabelas`)
    .join('\n')

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    system: 'Você é um especialista em análise de sistemas ERP. Responda em português brasileiro.',
    messages: [
      {
        role: 'user',
        content: `Analise a estrutura geral deste sistema ERP e gere um documento de visão geral.

## Módulos Identificados (${modules.length} módulos)
${moduleList}

## Todas as Tabelas (${schema.tables.length} tabelas)
${tableList}

## Views: ${schema.views.length} | Funções: ${schema.functions.length} | Triggers: ${schema.triggers.length} | Enums: ${schema.enums.length}

${schema.enums.length > 0 ? `## Enums Definidos\n${schema.enums.map(e => `- \`${e.enum_name}\`: ${e.values.join(', ')}`).join('\n')}` : ''}

Gere um documento Markdown seguindo esta estrutura:

# Análise do Sistema ERP — Visão Geral

> _Gerado em: ${schema.collected_at}_

## 1. Caracterização do Sistema
[Com base na estrutura, que tipo de ERP é este? Quais segmentos de negócio cobre?]

## 2. Módulos do Sistema
[Tabela resumo com cada módulo, quantidade de tabelas, e breve descrição]

## 3. Mapa de Dependências Entre Módulos
[Quais módulos dependem de quais? Quais são a base do sistema?]

## 4. Convenções e Padrões Observados
[Nomenclatura de tabelas/campos, padrões de PK, auditoria, soft-delete, etc.]

## 5. Ordem de Reconstrução Sugerida
[Do mais fundamental ao mais específico — qual módulo reconstruir primeiro e por quê]

## 6. Riscos e Pontos Críticos
[O que pode ser mais complexo de replicar? Onde estão as regras mais críticas?]

## 7. Próximos Passos
[Ações recomendadas para aprofundar o entendimento do sistema]`,
      },
    ],
  })

  return response.content.find(b => b.type === 'text')?.text ?? ''
}
