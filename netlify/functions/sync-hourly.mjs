import { syncFromCands } from "./_cands.mjs";
export default async () => { try { await syncFromCands(); } catch (e) { console.error(e.message); } };
export const config = { schedule: "@hourly" };
