import { getStore } from "@netlify/blobs";
export default async (req) => {
  const store = getStore("todo");
  const st = (await store.get("state", { type: "json" })) || { status: {}, manual: [] };
  if (req.method === "POST") {
    const b = await req.json();
    if (b.setStatus) st.status[b.setStatus.id] = b.setStatus.status;
    if (b.add) st.manual.push({ id: "m_" + Date.now(), title: b.add, source: "manual" });
    if (b.remove) { st.manual = st.manual.filter(x => x.id !== b.remove); delete st.status[b.remove]; }
    await store.setJSON("state", st);
  }
  const all = [...(st.cands || []), ...st.manual].map(t => ({ ...t, status: st.status[t.id] || (t.cdone ? "done" : "doing") }));
  return Response.json({ items: all, syncedAt: st.syncedAt || null });
};
