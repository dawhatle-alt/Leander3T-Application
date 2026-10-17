import { z } from "zod";
import { ROLES } from "@/lib/auth/roles";

const email = z
  .string()
  .trim()
  .toLowerCase()
  .email("Enter a valid email address.");

export const signInSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password."),
});

export const emailOnlySchema = z.object({ email });

export const newPasswordSchema = z
  .object({
    password: z.string().min(10, "Use at least 10 characters."),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, {
    message: "The two passwords don't match.",
    path: ["confirm"],
  });

export const profileSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your name.").max(80),
  phone: z
    .string()
    .trim()
    .max(30)
    .regex(/^[0-9()+\-.\s]*$/, "Use digits, spaces and ( ) - only."),
});

export const inviteSchema = z
  .object({
    fullName: z.string().trim().min(2, "Enter their name.").max(80),
    email,
    role: z.enum(ROLES as [string, ...string[]]),
    builderId: z.string().uuid().optional().or(z.literal("")),
  })
  .refine((v) => v.role !== "builder" || !!v.builderId, {
    message: "Pick the builder this person works for.",
    path: ["builderId"],
  });

export type FormState = { error?: string; message?: string };
