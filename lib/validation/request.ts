import { z } from "zod";

// "Request More Information" on the public site.
export const infoRequestSchema = z.object({
  name: z.string().trim().min(1, "Enter your name.").max(120),
  company: z.string().trim().max(160),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(200)
    .pipe(z.email("Enter a valid email address.")),
  phone: z
    .string()
    .trim()
    .max(40)
    .refine(
      (v) => v === "" || /^[\d\s()+.\-x]{7,}$/i.test(v),
      "Enter a valid phone number.",
    ),
  notes: z.string().trim().max(4000),
});

export type InfoRequestState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Partial<
    Record<keyof z.infer<typeof infoRequestSchema>, string>
  >;
};
