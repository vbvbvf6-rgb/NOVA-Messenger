export interface SavedAccount {
  userId: number;
  displayName: string;
  username: string;
  avatarUrl: string | null;
  avatarColor: string;
}

const KEY = "pulse-accounts";
export const MAX_ACCOUNTS = 3;

export function getSavedAccounts(): SavedAccount[] {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); }
  catch { return []; }
}

export function saveAccount(account: SavedAccount) {
  const accounts = getSavedAccounts();
  const idx = accounts.findIndex(a => a.userId === account.userId);
  if (idx >= 0) {
    accounts[idx] = account;
  } else if (accounts.length < MAX_ACCOUNTS) {
    accounts.push(account);
  }
  localStorage.setItem(KEY, JSON.stringify(accounts));
}

export function removeAccount(userId: number) {
  const accounts = getSavedAccounts().filter(a => a.userId !== userId);
  localStorage.setItem(KEY, JSON.stringify(accounts));
}
