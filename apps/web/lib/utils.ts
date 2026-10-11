import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// Standard class-merge helper used by the Aceternity UI components.
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
