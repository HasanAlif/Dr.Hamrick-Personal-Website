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
  <div class="page" style="flex-grow:1; display:flex; flex-direction:column; justify-content:center; height:100%; width:100%; align-items:center;">
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
          <article class="card light">
            <h2>This Is for <span class="gtext">Dr. Irene Hamrick</span></h2>
            <p class="lead">A simple, personal website for Dr. Irene Hamrick.</p>
          </article>
          
          <article class="card dark">
            <h2>This Is <span class="gtext heavy">Backend</span><br>
                <span class="gtext heavy">Server Site</span></h2>
          </article>
          <article class="card dark">
            <h2>This Backend Server <span class="gtext heavy">Is Developed By</span><br>
                <span class="gtext heavy">Mehedi Hasan Alif</span></h2>
          </article>
        </div>
      </section>
    </main>
  </div>
</body>
</html>
`;

interface INotificationData {
  subscriberName: string;
  counts: {
    blogs: number;
    publications: number;
    videos: number;
    podcasts: number;
    lifeSuggestions: number;
  };
  livePodcasts: number;
  websiteUrl: string;
}

export const NOTIFICATION_EMAIL_TEMPLATE = (
  data: INotificationData
): string => {
  const { subscriberName, counts, livePodcasts, websiteUrl } = data;

  // Build content items list
  const contentItems: string[] = [];
  if (counts.blogs > 0)
    contentItems.push(
      `${counts.blogs} new ${counts.blogs === 1 ? "blog" : "blogs"}`
    );
  if (counts.publications > 0)
    contentItems.push(
      `${counts.publications} new ${
        counts.publications === 1 ? "publication" : "publications"
      }`
    );
  if (counts.videos > 0)
    contentItems.push(
      `${counts.videos} new ${counts.videos === 1 ? "video" : "videos"}`
    );
  if (counts.podcasts > 0)
    contentItems.push(
      `${counts.podcasts} new ${counts.podcasts === 1 ? "podcast" : "podcasts"}`
    );
  if (counts.lifeSuggestions > 0)
    contentItems.push(
      `${counts.lifeSuggestions} new life ${
        counts.lifeSuggestions === 1 ? "suggestion" : "suggestions"
      }`
    );

  // Format content list
  let contentSummary = "";
  if (contentItems.length === 0) {
    contentSummary = "new content";
  } else if (contentItems.length === 1) {
    contentSummary = contentItems[0];
  } else if (contentItems.length === 2) {
    contentSummary = contentItems.join(" and ");
  } else {
    const lastItem = contentItems.pop();
    contentSummary = contentItems.join(", ") + ", and " + lastItem;
  }

  // Live podcast banner
  const liveBanner =
    livePodcasts > 0
      ? `
    <div style="background: linear-gradient(135deg, #ff5656 0%, #d32f2f 100%); border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 30px; border: 2px solid #ff7777; box-shadow: 0 4px 20px rgba(255, 86, 86, 0.4);">
      <div style="display: inline-block; background: #fff; color: #d32f2f; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px;">🔴 Live Now</div>
      <h2 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 800;">Dr. Irene Hamrick is Live!</h2>
      <p style="margin: 10px 0 0; color: #ffcccc; font-size: 16px;">Join the live podcast streaming now</p>
    </div>
  `
      : "";

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>New Content from Dr. Irene Hamrick</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0f0f0f; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #0f0f0f;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto; background: linear-gradient(180deg, #1a0505 0%, #0d0202 100%); border-radius: 16px; overflow: hidden; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6); border: 1px solid rgba(255, 86, 86, 0.2);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #8b0000 0%, #450000 100%); padding: 40px 30px; text-align: center; border-bottom: 3px solid #ff5656;">
              <div style="display: inline-block; width: 70px; height: 70px; background: linear-gradient(135deg, #ff5656, #ff9a9a); border-radius: 50%;  padding: 18px; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 32px; color: #1a0000; box-shadow: 0 8px 24px rgba(255, 86, 86, 0.4); margin-bottom: 20px;">PG-65</div>
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 800; letter-spacing: -0.5px;">Dr. Irene Hamrick</h1>
              <p style="margin: 8px 0 0; color: #ffcccc; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.5px;">New Content Available</p>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 40px 30px;">
              ${liveBanner}
              
              <p style="margin: 0 0 20px; color: #e0e0e0; font-size: 16px; line-height: 1.6;">
                Hello <strong style="color: #ff9a9a;">${subscriberName}</strong>,
              </p>
              
              <p style="margin: 0 0 30px; color: #c0c0c0; font-size: 16px; line-height: 1.6;">
                ${livePodcasts > 0 ? "🎙️ " : ""}Dr. Irene Hamrick has ${
    livePodcasts > 0 ? "gone live and" : ""
  } added <strong style="color: #ff7777;">${contentSummary}</strong> ${
    livePodcasts > 0 ? "to the platform" : "for you to explore"
  }. Don't miss out on this exciting ${
    livePodcasts > 0 ? "live session and " : ""
  }new content!
              </p>

              ${
                contentItems.length > 0
                  ? `
              <div style="background: rgba(255, 86, 86, 0.08); border-left: 4px solid #ff5656; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
                <h3 style="margin: 0 0 15px; color: #ff9a9a; font-size: 18px; font-weight: 700;">What's New:</h3>
                <ul style="margin: 0; padding-left: 20px; color: #d0d0d0; font-size: 15px; line-height: 2;">
                  ${
                    counts.blogs > 0
                      ? `<li><strong>${counts.blogs}</strong> ${
                          counts.blogs === 1 ? "Blog" : "Blogs"
                        } 📝</li>`
                      : ""
                  }
                  ${
                    counts.publications > 0
                      ? `<li><strong>${counts.publications}</strong> ${
                          counts.publications === 1
                            ? "Publication"
                            : "Publications"
                        } 📚</li>`
                      : ""
                  }
                  ${
                    counts.videos > 0
                      ? `<li><strong>${counts.videos}</strong> ${
                          counts.videos === 1 ? "Video" : "Videos"
                        } 🎥</li>`
                      : ""
                  }
                  ${
                    counts.podcasts > 0
                      ? `<li><strong>${counts.podcasts}</strong> ${
                          counts.podcasts === 1 ? "Podcast" : "Podcasts"
                        } 🎙️</li>`
                      : ""
                  }
                  ${
                    counts.lifeSuggestions > 0
                      ? `<li><strong>${counts.lifeSuggestions}</strong> Life ${
                          counts.lifeSuggestions === 1
                            ? "Suggestion"
                            : "Suggestions"
                        } 💡</li>`
                      : ""
                  }
                </ul>
              </div>
              `
                  : ""
              }

              <!-- CTA Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td style="text-align: center; padding: 10px 0 30px;">
                    <a href="${websiteUrl}" style="display: inline-block; background: linear-gradient(135deg, #ff5656 0%, #d32f2f 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 50px; font-size: 16px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; box-shadow: 0 8px 24px rgba(255, 86, 86, 0.4); transition: transform 0.2s;">
                      ${
                        livePodcasts > 0
                          ? "🔴 Join Live Now"
                          : "Explore New Content"
                      }
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 0; color: #999; font-size: 14px; line-height: 1.6; text-align: center;">
                Stay connected and never miss an update from Dr. Irene Hamrick's journey in thought leadership, research, and life insights.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background: #0a0000; padding: 30px; text-align: center; border-top: 1px solid rgba(255, 86, 86, 0.2);">
              <p style="margin: 0 0 10px; color: #666; font-size: 12px;">
                You're receiving this email because you subscribed to updates from Dr. Irene Hamrick.
              </p>
              <p style="margin: 0; color: #555; font-size: 11px;">
                © ${new Date().getFullYear()} Dr. Irene Hamrick. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
};
