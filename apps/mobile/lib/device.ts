// Anonymous device identity. The contract sends an anonymous X-Device-Id
// (a random UUID kept on the phone) with every report. No accounts, ever.
import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";

const KEY = "binit_device_id";

let cached: string | undefined;

/** Returns the phone's stable anonymous id, generating and persisting one on first use. */
export async function getDeviceId(): Promise<string> {
  if (cached) return cached;

  const existing = await SecureStore.getItemAsync(KEY);
  if (existing) {
    cached = existing;
    return existing;
  }

  const id = Crypto.randomUUID();
  await SecureStore.setItemAsync(KEY, id);
  cached = id;
  return id;
}
