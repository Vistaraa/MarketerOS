export function GET() { return Response.json({ ok: true, service: "marketeros", timestamp: new Date().toISOString() }); }
