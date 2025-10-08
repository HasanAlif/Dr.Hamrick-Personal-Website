export const LANDING_PAGE_TEMPLATE = `
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta name="color-scheme" content="dark light" />
  <title>PG-65.com — Backend Server</title>
  <style>
    :root{
      --redA:#FF000080;
      --maroonA:#3D0303DF;
      --blackA:#000000D9;
      --ink:#f3f5ff;
      --muted:#cdd3ea;
      --glassL:rgba(255,255,255,.12);
      --glassD:rgba(0,0,0,.25);
      --borderL:rgba(255,255,255,.25);
      --borderD:rgba(0,0,0,.35);
      --accent1:#ff5656;  /* for subtle highlights */
      --accent2:#b00000;
      --radius:24px;
      --shadow:0 12px 36px rgba(0,0,0,.55);
      --shadowCard:0 10px 26px rgba(0,0,0,.45);
    }

    *{box-sizing:border-box}
    html,body{height:100%}
    body{
      margin:0;
      font:16px/1.55 ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial;
      color:var(--ink);
      background-color:#0a0000;
      background:
        radial-gradient(900px 520px at 85% 6%, var(--redA) 0%, transparent 60%),
        radial-gradient(1000px 620px at 10% 95%, var(--maroonA) 0%, transparent 60%),
        linear-gradient(180deg, var(--blackA) 0%, #140000 100%);
    }

    .page{
      min-height:100svh;
      display:grid;
      grid-template-rows:auto auto 1fr;
      gap:14px;
    }
    .wrap{max-width:1120px;margin:0 auto;padding:18px 18px 28px;width:100%}

    header{display:flex;align-items:center;gap:12px}
    .badge{
      width:42px;height:42px;border-radius:12px;display:grid;place-items:center;
      font-weight:800;color:#1a0000;
      background:linear-gradient(135deg,#ff5656,#ff9a9a);
      box-shadow:0 8px 18px rgba(255,86,86,.35), inset 0 0 12px rgba(255,255,255,.35);
    }
    .brand h1{margin:0;font-size:18px}
    .brand small{display:block;margin-top:2px;color:var(--muted);font-weight:600}

    /* ===== Centered nav just above the main middle frame ===== */
    .navwrap{display:flex;justify-content:center}
    nav.nav{
      display:flex;gap:10px;align-items:center;flex-wrap:wrap;
      padding:10px 12px;border-radius:999px;
      background:linear-gradient(180deg, rgba(255,255,255,.14), rgba(255,255,255,.08));
      border:1px solid var(--borderL);
      box-shadow:var(--shadowCard);
      backdrop-filter: blur(8px) saturate(130%);
    }
    nav.nav a{
      text-decoration:none;color:var(--ink);opacity:.95;
      padding:8px 12px;border-radius:10px;border:1px solid transparent;
    }
    nav.nav a:hover{
      border-color:rgba(255,255,255,.35);
      background:rgba(255,255,255,.06);
    }

    .stage{display:grid;place-items:center;padding-block:6px}
    .frame{
      width:min(1120px,95vw);
      border-radius:28px;
      overflow:hidden;
      border:1px solid rgba(255,255,255,.18);
      box-shadow:var(--shadow);
      /* deep maroon panel */
      background:
        linear-gradient(180deg, rgba(102,8,8,.70), rgba(35,2,2,.55)),
        linear-gradient(180deg, #5a0a0a 0%, #2b0606 100%);
      position:relative;
    }
    .frame::before{
      content:""; position:absolute; inset:0; border-radius:28px;
      box-shadow: inset 0 1px 0 rgba(255,255,255,.25),
                  inset 0 -1px 0 rgba(0,0,0,.35);
      pointer-events:none;
    }

    .grid{
      display:grid;
      grid-template-columns:1.1fr .9fr;
      gap:22px;
      padding:28px;
    }
    @media (max-width: 900px){ .grid{grid-template-columns:1fr} }

    .card{
      border-radius:20px;
      padding:22px 24px;
      backdrop-filter: blur(8px) saturate(130%);
      box-shadow:var(--shadowCard);
      border:1px solid var(--borderL);
    }
    .card.light{ background:var(--glassL) }
    .card.dark{
      background:linear-gradient(180deg, rgba(0,0,0,.25), rgba(0,0,0,.18));
      border-color:var(--borderD);
    }

    h2{margin:0 0 10px;font-size:clamp(26px,3.2vw,40px);line-height:1.12;letter-spacing:.2px}
    p.lead{margin:0;color:var(--muted)}
    .gtext{
      background:linear-gradient(90deg, var(--accent1), #ff7a7a, var(--accent2));
      -webkit-background-clip:text;background-clip:text;color:transparent
    }
    .heavy{font-weight:800}
  </style>
</head>
<body>
  <div class="page">
    <div class="wrap">
      <header>
        <div class="badge" aria-hidden="true">PG</div>
        <div class="brand">
          <h1>PG-65.com</h1>
          <small>Fast • Secure • Reliable</small>
        </div>
      </header>
    </div>
    <main class="stage">
      <section class="frame" role="region" aria-label="Welcome">
        <div class="grid">
          <article class="card light">
            <h2>Welcome to <span class="gtext">PG-65.com</span></h2>
            <p class="lead">A simple, Server Start page for backend.</p>
          </article>

          <article class="card dark">
            <h2>This Is <span class="gtext heavy">Backend</span><br>
                <span class="gtext">Server Site</span></h2>
          </article>
        </div>
      </section>
    </main>
  </div>
</body>
</html>
`;
