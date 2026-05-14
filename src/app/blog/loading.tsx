import { BlogShell } from "./blog-components";

export default function BlogLoading() {
  return (
    <BlogShell>
      <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="h-4 w-48 animate-pulse rounded bg-[#d8c7a6]" />
        <div className="mt-5 h-20 max-w-3xl animate-pulse rounded bg-[#d8c7a6]" />
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
            <div
              key={index}
              className="h-80 animate-pulse rounded-[8px] bg-[#e6dcc9]"
            />
          ))}
        </div>
      </div>
    </BlogShell>
  );
}
