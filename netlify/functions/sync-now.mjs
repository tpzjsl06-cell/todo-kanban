import { syncFromCands } from "./_cands.mjs";
export default async () => {
  try { const s = await syncFromCands(); return Response.json({ ok: true, count: s.cands.length, syncedAt: s.syncedAt }); }
  catch (e) { return Response.json({ ok: false, error: e.message }, { status: 500 }); }
};
