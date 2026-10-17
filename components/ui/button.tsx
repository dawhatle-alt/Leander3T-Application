import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

// shadcn/ui Button, with Coursework variants from design/approved-mockup.html.
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-sm font-bold tracking-[0.01em] transition-[transform,box-shadow,background-color,color,border-color] hover:-translate-y-px active:translate-y-0 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        fire: "bg-fire text-primary-foreground shadow-[0_6px_18px_rgba(228,89,15,0.35)] hover:shadow-[0_10px_26px_rgba(228,89,15,0.45)]",
        dark: "bg-charcoal text-limestone",
        "ghost-dark":
          "border-[1.5px] border-limestone/35 text-limestone hover:border-amber hover:text-amber",
        outline:
          "border-[1.5px] border-mortar-2 bg-limestone text-ink hover:border-flame hover:text-flame",
        destructive: "bg-chalk text-white",
        link: "text-flame underline-offset-4 hover:underline",
      },
      size: {
        default: "px-[26px] py-[13px] text-[15px]",
        sm: "px-4 py-2 text-[13.5px]",
        lg: "px-7 py-4 text-base",
        icon: "size-10",
      },
    },
    defaultVariants: {
      variant: "dark",
      size: "default",
    },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
