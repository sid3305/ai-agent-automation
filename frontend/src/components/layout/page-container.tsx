import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageContainerProps {
  children: ReactNode;
  className?: string;
}

export function PageContainer({ children, className }: PageContainerProps) {
  return (
    <div
      className={cn(
        "mx-auto w-full max-w-[1600px]",
        // Responsive horizontal and vertical padding.
        // pt-20 handles mobile header heights safely, md:pt-10 gives premium breathing room on desktop.
        "px-4 sm:px-6 md:px-8 pt-20 md:pt-10 pb-10",
        // Consistent vertical rhythm between major sections.
        "flex flex-col gap-6 md:gap-8",
        className
      )}
    >
      {children}
    </div>
  );
}
