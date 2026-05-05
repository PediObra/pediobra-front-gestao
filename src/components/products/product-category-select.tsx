"use client";

import type { ProductCategory } from "@/lib/api/types";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const CATEGORY_FILTER_ALL = "ALL";
export const CATEGORY_ASSIGN_NONE = "NONE";

export function ProductCategoryAssignSelect({
  categories,
  value,
  onValueChange,
  disabled,
  placeholder,
  noneLabel,
  triggerId,
}: {
  categories: ProductCategory[];
  value: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
  placeholder: string;
  noneLabel: string;
  triggerId?: string;
}) {
  return (
    <Select value={value || CATEGORY_ASSIGN_NONE} onValueChange={onValueChange}>
      <SelectTrigger id={triggerId} disabled={disabled}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={CATEGORY_ASSIGN_NONE}>{noneLabel}</SelectItem>
        {categories.map((category) => (
          <SelectGroup key={category.id}>
            <SelectLabel>{category.name}</SelectLabel>
            {(category.children ?? []).map((subcategory) => (
              <SelectItem key={subcategory.id} value={String(subcategory.id)}>
                {subcategory.name}
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  );
}

export function ProductCategoryFilterSelect({
  categories,
  value,
  onValueChange,
  placeholder,
  allLabel,
  parentLabel,
  triggerId,
}: {
  categories: ProductCategory[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder: string;
  allLabel: string;
  parentLabel: (category: ProductCategory) => string;
  triggerId?: string;
}) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger id={triggerId}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={CATEGORY_FILTER_ALL}>{allLabel}</SelectItem>
        {categories.map((category) => (
          <SelectGroup key={category.id}>
            <SelectLabel>{category.name}</SelectLabel>
            <SelectItem value={parentCategoryValue(category.id)}>
              {parentLabel(category)}
            </SelectItem>
            {(category.children ?? []).map((subcategory) => (
              <SelectItem
                key={subcategory.id}
                value={subcategoryCategoryValue(subcategory.id)}
              >
                {subcategory.name}
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  );
}

export function parentCategoryValue(id: number) {
  return `parent:${id}`;
}

export function subcategoryCategoryValue(id: number) {
  return `category:${id}`;
}

export function categoryFilterParams(value: string) {
  if (value.startsWith("parent:")) {
    return { parentCategoryId: Number(value.replace("parent:", "")) };
  }

  if (value.startsWith("category:")) {
    return { categoryId: Number(value.replace("category:", "")) };
  }

  return {};
}

export function formatProductCategory(
  category: ProductCategory | null | undefined,
) {
  if (!category) return "";
  return category.parent
    ? `${category.parent.name} > ${category.name}`
    : category.name;
}
