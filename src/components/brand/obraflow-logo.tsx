import Image from "next/image";

import { cn } from "@/lib/utils";

export const OBRAFLOW_LOGO_SRC = "/brand/obraflow-logo.svg";

export function ObraFlowLogo({
  alt = "",
  className,
  priority = false,
}: {
  alt?: string;
  className?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src={OBRAFLOW_LOGO_SRC}
      alt={alt}
      width={32}
      height={32}
      priority={priority}
      className={cn("size-8 shrink-0", className)}
    />
  );
}
