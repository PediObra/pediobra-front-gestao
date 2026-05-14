"use client";

import { useMemo } from "react";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ProductCategory } from "@/lib/api/types";
import {
  joinCommaList,
  parseCommaList,
  slugifyBlogSlug,
} from "@/lib/blog-post-editor";
import { cn } from "@/lib/utils";

const CATEGORY_SELECT_PLACEHOLDER = "__select_blog_category__";
const CATEGORY_SELECT_EMPTY = "__no_blog_categories__";

interface BlogCategoryOption {
  id: number;
  name: string;
}

interface BlogCategoryGroup {
  id: number;
  name: string;
  options: BlogCategoryOption[];
}

export function BlogCategorySelectInput({
  id,
  value,
  categories,
  onChange,
  disabled,
  placeholder,
  emptyLabel,
  removeLabel,
  noOptionsLabel,
  loading,
  loadingLabel,
}: {
  id: string;
  value?: string;
  categories: ProductCategory[];
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder: string;
  emptyLabel: string;
  removeLabel: string;
  noOptionsLabel: string;
  loading?: boolean;
  loadingLabel?: string;
}) {
  const selectedCategories = useMemo(() => parseCommaList(value), [value]);
  const selectedKeys = useMemo(
    () => new Set(selectedCategories.map((tag) => slugifyBlogSlug(tag))),
    [selectedCategories],
  );
  const categoryGroups = useMemo(
    () => buildCategoryGroups(categories),
    [categories],
  );
  const optionsById = useMemo(() => {
    const options = new Map<string, BlogCategoryOption>();

    for (const group of categoryGroups) {
      for (const option of group.options) {
        options.set(String(option.id), option);
      }
    }

    return options;
  }, [categoryGroups]);
  const hasOptions = categoryGroups.some((group) => group.options.length > 0);
  const selectPlaceholder = loading ? loadingLabel ?? placeholder : placeholder;

  const updateCategories = (nextCategories: string[]) => {
    onChange(joinCommaList(nextCategories));
  };

  const addCategory = (optionId: string) => {
    const option = optionsById.get(optionId);

    if (!option) return;

    const optionKey = slugifyBlogSlug(option.name);
    if (selectedKeys.has(optionKey)) return;

    updateCategories([...selectedCategories, option.name]);
  };

  const removeCategory = (categoryToRemove: string) => {
    updateCategories(
      selectedCategories.filter((category) => category !== categoryToRemove),
    );
  };

  return (
    <div className="space-y-2">
      <Select
        value={CATEGORY_SELECT_PLACEHOLDER}
        onValueChange={addCategory}
      >
        <SelectTrigger id={id} disabled={disabled || loading}>
          <SelectValue placeholder={selectPlaceholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={CATEGORY_SELECT_PLACEHOLDER}>
            {selectPlaceholder}
          </SelectItem>
          {hasOptions ? (
            categoryGroups.map((group) => (
              <SelectGroup key={group.id}>
                <SelectLabel>{group.name}</SelectLabel>
                {group.options.map((option) => (
                  <SelectItem
                    key={option.id}
                    value={String(option.id)}
                    disabled={selectedKeys.has(slugifyBlogSlug(option.name))}
                  >
                    {option.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            ))
          ) : (
            <SelectItem value={CATEGORY_SELECT_EMPTY} disabled>
              {noOptionsLabel}
            </SelectItem>
          )}
        </SelectContent>
      </Select>

      <div
        className={cn(
          "flex min-h-10 flex-wrap gap-1.5 rounded-md border border-dashed border-border bg-muted/25 p-2",
          selectedCategories.length === 0 && "items-center",
        )}
      >
        {selectedCategories.length > 0 ? (
          selectedCategories.map((category) => (
            <Badge
              key={category}
              variant="secondary"
              className="max-w-full gap-1 pr-1"
            >
              <span className="truncate">{category}</span>
              <button
                type="button"
                disabled={disabled}
                className="rounded-sm p-0.5 text-muted-foreground transition hover:bg-background hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
                aria-label={`${removeLabel}: ${category}`}
                onClick={() => removeCategory(category)}
              >
                <X className="size-3" aria-hidden="true" />
              </button>
            </Badge>
          ))
        ) : (
          <span className="text-xs text-muted-foreground">{emptyLabel}</span>
        )}
      </div>
    </div>
  );
}

function buildCategoryGroups(categories: ProductCategory[]): BlogCategoryGroup[] {
  return categories.map((category) => {
    const children = category.children ?? [];

    return {
      id: category.id,
      name: category.name,
      options:
        children.length > 0
          ? children.map(toCategoryOption)
          : [toCategoryOption(category)],
    };
  });
}

function toCategoryOption(category: ProductCategory): BlogCategoryOption {
  return {
    id: category.id,
    name: category.name,
  };
}
