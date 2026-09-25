export function sendJson(response, status, body) {
  response.writeHead(status, { 'access-control-allow-origin': 'http://localhost:3500', 'content-type': 'application/json; charset=utf-8' }).end(JSON.stringify(body));
}
