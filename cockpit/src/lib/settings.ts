import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "mas.apiUrl";
const DEFAULT = process.env.EXPO_PUBLIC_API_URL ?? "http://192.168.1.10:3000";

export async function getApiUrl(): Promise<string> {
  try {
    const v = await AsyncStorage.getItem(KEY);
    return v && v.length > 0 ? v : DEFAULT;
  } catch {
    return DEFAULT;
  }
}

export async function setApiUrl(url: string): Promise<void> {
  await AsyncStorage.setItem(KEY, url.trim().replace(/\/+$/, ""));
}
