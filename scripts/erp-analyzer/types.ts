export interface ColumnInfo {
  column_name: string
  data_type: string
  is_nullable: string
  column_default: string | null
  character_maximum_length: number | null
}

export interface ForeignKeyInfo {
  constraint_name: string
  column_name: string
  referenced_table: string
  referenced_column: string
}

export interface UniqueConstraintInfo {
  constraint_name: string
  columns: string[]
}

export interface CheckConstraintInfo {
  constraint_name: string
  check_clause: string
}

export interface IndexInfo {
  index_name: string
  columns: string[]
  is_unique: boolean
  index_definition: string
}

export interface TableInfo {
  table_name: string
  columns: ColumnInfo[]
  primary_keys: string[]
  foreign_keys: ForeignKeyInfo[]
  unique_constraints: UniqueConstraintInfo[]
  check_constraints: CheckConstraintInfo[]
  indexes: IndexInfo[]
  sample_data: Record<string, unknown>[]
  row_count: number
}

export interface ViewInfo {
  view_name: string
  view_definition: string
}

export interface FunctionInfo {
  function_name: string
  return_type: string
  arguments: string
  function_definition: string
  language: string
}

export interface TriggerInfo {
  trigger_name: string
  table_name: string
  timing: string
  event: string
  function_name: string
}

export interface EnumInfo {
  enum_name: string
  values: string[]
}

export interface SchemaData {
  tables: TableInfo[]
  views: ViewInfo[]
  functions: FunctionInfo[]
  triggers: TriggerInfo[]
  enums: EnumInfo[]
  collected_at: string
}

export interface Module {
  name: string
  label: string
  tables: TableInfo[]
  views: ViewInfo[]
  functions: FunctionInfo[]
  triggers: TriggerInfo[]
}
