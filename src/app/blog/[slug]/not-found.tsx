import Link from "next/link";
import { BlogShell } from "../blog-components";

export default function BlogPostNotFound() {
  return (
    <BlogShell>
      <div className="mx-auto flex min-h-[70vh] w-full max-w-3xl flex-col justify-center px-4 py-16 text-center sm:px-6">
        <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-[#7b5b25]">
          Artigo não encontrado
        </p>
        <h1 className="blog-display mt-4 break-words text-3xl font-semibold sm:text-5xl">
          Esse guia saiu do canteiro.
        </h1>
        <p className="mt-5 text-[#5b5145]">
          O conteúdo pode ter sido removido, arquivado ou ainda não publicado.
        </p>
        <Link
          href="/blog"
          className="mx-auto mt-8 rounded-[8px] bg-[#241f18] px-5 py-3 text-sm font-semibold text-white"
        >
          Ver artigos publicados
        </Link>
      </div>
    </BlogShell>
  );
}
