import * as SecureStore from 'expo-secure-store';

import type { AuthTokens } from '../types/models';

const SESSION_KEY = 'trove.mobile.session';

export async function readStoredTokens() {
  const stored = await SecureStore.getItemAsync(SESSION_KEY);
  if (!stored) {
    return null;
  }

  try {
    return JSON.parse(stored) as AuthTokens;
  } catch {
    await clearStoredTokens();
    return null;
  }
}

export async function writeStoredTokens(tokens: AuthTokens) {
  await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(tokens));
}

export async function clearStoredTokens() {
  await SecureStore.deleteItemAsync(SESSION_KEY);
}
