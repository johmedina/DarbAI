import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}


export async function fetchChatHistory(userId: string) {
  try {
    const response = await fetch(`http://10.161.232.59:8002/history?user_id=${userId}`);
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