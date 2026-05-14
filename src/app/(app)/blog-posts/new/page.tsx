"use client";

import { RequireAdmin } from "@/components/auth/require-admin";
import { BlogPostForm } from "../blog-post-form";

export default function NewBlogPostPage() {
  return (
    <RequireAdmin>
      <BlogPostForm />
    </RequireAdmin>
  );
}
