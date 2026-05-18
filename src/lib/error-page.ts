export function renderErrorPage(): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Something went wrong</title>
<style>
  body { margin:0; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif; background:#0a0a0a; color:#fafafa; min-height:100vh; display:flex; align-items:center; justify-content:center; padding:1rem; }
  .card { max-width:28rem; text-align:center; }
  h1 { font-size:1.5rem; margin:0 0 0.5rem; }
  p { color:#a3a3a3; margin:0 0 1.5rem; }
  .row { display:flex; gap:0.75rem; justify-content:center; }
  button, a { display:inline-block; padding:0.5rem 1rem; border-radius:0.375rem; font-size:0.875rem; font-weight:500; cursor:pointer; text-decoration:none; border:none; }
  .primary { background:#fafafa; color:#0a0a0a; }
  .secondary { background:transparent; color:#fafafa; border:1px solid #404040; }
</style>
</head>
<body>
  <div class="card">
    <h1>Something went wrong</h1>
    <p>An unexpected error occurred. Please try again.</p>
    <div class="row">
      <button class="primary" onclick="location.reload()">Try again</button>
      <a class="secondary" href="/">Go home</a>
    </div>
  </div>
</body>
</html>`;
}
