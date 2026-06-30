import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { API_BASE } from "./apiClient"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}


export async function fetchChatHistory(userId: string) {
  try {
    const response = await fetch(`${API_BASE}/history?user_id=${userId}`);
    const data = await response.json();

    if (data.success) {
      return data.data; // array of chat logs
    } else {
      console.error("Failed to fetch history:", data.message);
      return [];
    }
  } catch (err) {
    console.error("Error fetching chat history:", err);
    return [];
  }
}