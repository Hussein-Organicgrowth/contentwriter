import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { IWebsite } from "@/models/Website";
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export async function ownsWebsite(website: IWebsite, Userid: string) {
  if (!website) {
    return false;
  }
  return website.userId === Userid;
}
