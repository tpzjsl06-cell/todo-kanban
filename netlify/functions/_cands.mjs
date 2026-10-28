// cands MCP(JSON-RPC) 호출 + todo 추출. 환경변수: CANDS_TOKEN(필수), CANDS_QUERY(선택)
import { getStore } from "@netlify/blobs";
const URL_ = "https://ai.cands.kr/mcp/";
async function rpc(token, method, params, id, sid) {
  const r = await fetch(URL_, { method: "POST", headers: {
    "Content-Type": "application/json", Accept: "application/json, text/event-stream",
    Authorization: `Bearer ${token}`, ...(sid ? { "Mcp-Session-Id": sid } : {}) },
    body: JSON.stringify({ jsonrpc: "2.0", id, method, params }) });
  const txt = await r.text();
  const line = txt.startsWith("event") || txt.includes("\ndata:") || txt.startsWith("data:")
    ? txt.split("\n").filter(l => l.startsWith("data:")).map(l => l.slice(5).trim()).pop() : txt;
  return { json: JSON.parse(line), sid: r.headers.get("mcp-session-id") };
}
function extractTodos(text) {
  const out = []; const seen = new Set();
  for (const raw of text.split("\n")) {
    const m = raw.match(/^\s*(?:[-*]|\d+[.)])\s*(?:\[( |x|X)\]\s*)?(.{3,200})$/);
    if (!m) continue;
    const title = m[2].replace(/\*\*/g, "").trim();
    if (seen.has(title)) continue; seen.add(title);
    out.push({ id: "c_" + Buffer.from(title).toString("base64url").slice(0, 24), title, source: "cands", cdone: /x/i.test(m[1] || "") });
  }
  return out;
}
export async function syncFromCands() {
  const token = process.env.CANDS_TOKEN;
  if (!token) throw new Error("CANDS_TOKEN 환경변수가 없습니다");
  const a = await rpc(token, "initialize", { protocolVersion: "2025-03-26", capabilities: {}, clientInfo: { name: "todo-kanban", version: "1" } }, 1);
  const sid = a.sid;
  await rpc(token, "notifications/initialized", {}, undefined, sid).catch(() => {});
  const q = process.env.CANDS_QUERY || "나의 todo 할 일 목록";
  const tool = process.env.CANDS_TOOL || "search";
  const b = await rpc(token, "tools/call", { name: tool, arguments: { query: q, k: 50 } }, 2, sid);
  const text = (b.json.result?.content || []).map(c => c.text || "").join("\n");
  const items = extractTodos(text);
  const store = getStore("todo");
  const state = (await store.get("state", { type: "json" })) || { status: {}, manual: [] };
  state.cands = items; state.syncedAt = new Date().toISOString(); state.rawLen = text.length;
  await store.setJSON("state", state);
  return state;
}
