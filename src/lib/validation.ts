import { z } from "zod";

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "Use pelo menos 3 caracteres")
  .max(24, "Use no máximo 24 caracteres")
  .regex(/^[a-z0-9_]+$/, "Use apenas letras minúsculas, números e underscore");

export const passwordSchema = z
  .string()
  .min(8, "Use pelo menos 8 caracteres")
  .max(72, "Use no máximo 72 caracteres")
  .regex(/[a-zA-Z]/, "Inclua ao menos uma letra")
  .regex(/[0-9]/, "Inclua ao menos um número");

export const signupSchema = z.object({
  username: usernameSchema,
  name: z.string().trim().min(1, "Informe seu nome").max(80),
  email: z.string().trim().toLowerCase().email("E-mail inválido"),
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("E-mail inválido"),
  password: z.string().min(1, "Informe sua senha"),
});

export const onboardingSchema = z.object({
  username: usernameSchema,
});
