export function badRequest(message: string) {
    return Response.json({ error: message }, { status: 400 });
  }
  
  export function notFound(message: string) {
    return Response.json({ error: message }, { status: 404 });
  }
  
  export function ok(data: object) {
    return Response.json(data, { status: 200 });
  }
  