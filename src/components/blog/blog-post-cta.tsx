import { ArrowUpRight, Hammer, Sparkles } from "lucide-react";
import {
  hasBlogPostCta,
  trimBlogCtaValue,
  type BlogPostCtaFields,
} from "@/lib/blog-cta";
import { cn } from "@/lib/utils";

export function BlogPostCta({
  cta,
  className,
  eyebrow,
  supportText,
}: {
  cta: BlogPostCtaFields;
  className?: string;
  eyebrow: string;
  supportText: string;
}) {
  if (!hasBlogPostCta(cta)) {
    return null;
  }

  const title = trimBlogCtaValue(cta.ctaTitle);
  const description = trimBlogCtaValue(cta.ctaDescription);
  const buttonText = trimBlogCtaValue(cta.ctaButtonText);
  const href = trimBlogCtaValue(cta.ctaHref);
  const newTab = cta.ctaOpenInNewTab === true;

  return (
    <section
      aria-labelledby="blog-post-cta-title"
      className={cn(
        "not-prose relative isolate mt-12 overflow-hidden rounded-[8px] border border-[#241f18]/15 bg-[#241f18] text-[#fffaf0] shadow-2xl shadow-[#241f18]/18 dark:border-border dark:bg-card dark:text-card-foreground dark:shadow-black/30",
        className,
      )}
    >
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,250,240,.08)_1px,transparent_1px),linear-gradient(rgba(255,250,240,.07)_1px,transparent_1px)] bg-[size:26px_26px] dark:bg-[linear-gradient(90deg,rgba(255,255,255,.045)_1px,transparent_1px),linear-gradient(rgba(255,255,255,.045)_1px,transparent_1px)]" />
      <div className="absolute -right-16 top-0 h-full w-44 rotate-6 bg-[#c47b24] opacity-90 dark:bg-primary/40" />
      <div className="absolute bottom-0 left-0 h-1.5 w-2/3 bg-[#2f7d67] dark:bg-primary" />

      <div className="relative grid gap-6 p-6 sm:p-7">
        <div className="flex items-start gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-[8px] border border-white/15 bg-white/10 text-[#f2c77d] shadow-lg shadow-black/20 dark:border-border dark:bg-background dark:text-primary">
            <Hammer className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="inline-flex items-center gap-1.5 font-mono text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[#f2c77d] dark:text-primary">
              <Sparkles className="size-3.5" aria-hidden="true" />
              {eyebrow}
            </p>
            <h2
              id="blog-post-cta-title"
              className="blog-display mt-2 break-words text-balance text-2xl font-semibold leading-tight sm:text-3xl"
            >
              {title}
            </h2>
            {description && (
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#fff4dc]/78 dark:text-muted-foreground sm:text-base sm:leading-7">
                {description}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-white/12 pt-5 dark:border-border sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-md text-xs font-medium uppercase tracking-[0.12em] text-[#d9c7a7] dark:text-muted-foreground">
            {supportText}
          </p>
          <a
            href={href}
            target={newTab ? "_blank" : undefined}
            rel={newTab ? "noopener noreferrer" : undefined}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[8px] bg-[#f2c77d] px-5 py-2.5 text-sm font-semibold text-[#241f18] shadow-lg shadow-black/20 transition hover:-translate-y-0.5 hover:bg-[#ffd98b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f2c77d] focus-visible:ring-offset-2 focus-visible:ring-offset-[#241f18] motion-reduce:transform-none motion-reduce:transition-none dark:bg-primary dark:text-primary-foreground dark:hover:bg-primary/90 dark:focus-visible:ring-primary sm:w-auto"
          >
            {buttonText}
            <ArrowUpRight className="size-4" aria-hidden="true" />
          </a>
        </div>
      </div>
    </section>
  );
}
