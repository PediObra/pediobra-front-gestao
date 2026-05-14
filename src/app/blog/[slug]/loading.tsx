import { BlogShell } from "../blog-components";

export default function BlogPostLoading() {
  return (
    <BlogShell>
      <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-10 sm:px-6 sm:py-12 lg:grid-cols-[minmax(0,0.92fr)_minmax(380px,0.8fr)] lg:px-8">
        <div>
          <div className="h-4 w-40 animate-pulse rounded bg-[#d8c7a6]" />
          <div className="mt-6 h-24 max-w-3xl animate-pulse rounded bg-[#d8c7a6]" />
          <div className="mt-6 h-20 max-w-2xl animate-pulse rounded bg-[#e6dcc9]" />
        </div>
        <div className="min-h-[240px] animate-pulse rounded-[8px] bg-[#e6dcc9] sm:min-h-[320px]" />
      </div>
    </BlogShell>
  );
}
