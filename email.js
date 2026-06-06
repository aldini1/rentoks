const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);

async function sendBookingNotification({ to, businessName, clientName, carName, fromDate, toDate, days, total }) {
  await resend.emails.send({
    from: 'Rentoks <onboarding@resend.dev>',
    to,
    subject: `Kërkesë e re rezervimi — ${carName}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
        <h2 style="color:#0d0d0d;">Kërkesë e re rezervimi</h2>
        <p>Keni një kërkesë të re rezervimi nga <strong>${clientName}</strong>.</p>
        <table style="width:100%;border-collapse:collapse;margin:20px 0;">
          <tr><td style="padding:8px;border:1px solid #eee;color:#888;">Vetura</td><td style="padding:8px;border:1px solid #eee;font-weight:700;">${carName}</td></tr>
          <tr><td style="padding:8px;border:1px solid #eee;color:#888;">Nga data</td><td style="padding:8px;border:1px solid #eee;">${fromDate}</td></tr>
          <tr><td style="padding:8px;border:1px solid #eee;color:#888;">Deri më</td><td style="padding:8px;border:1px solid #eee;">${toDate}</td></tr>
          <tr><td style="padding:8px;border:1px solid #eee;color:#888;">Ditë</td><td style="padding:8px;border:1px solid #eee;">${days}</td></tr>
          <tr><td style="padding:8px;border:1px solid #eee;color:#888;">Totali</td><td style="padding:8px;border:1px solid #eee;font-weight:700;">€${total}</td></tr>
        </table>
        <p>Hyni në dashboard për të konfirmuar ose refuzuar kërkesën.</p>
        <a href="https://rentoks-production.up.railway.app/rentoks-dashboard.html" style="display:inline-block;padding:12px 24px;background:#c8ff00;color:#0d0d0d;border-radius:8px;font-weight:700;text-decoration:none;">Shko te Dashboard →</a>
      </div>
    `
  });
}

async function sendBookingConfirmation({ to, clientName, carName, fromDate, toDate, businessName, businessPhone }) {
  await resend.emails.send({
    from: 'Rentoks <onboarding@resend.dev>',
    to,
    subject: `Rezervimi u konfirmua — ${carName}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
        <h2 style="color:#16a34a;">✓ Rezervimi juaj u konfirmua!</h2>
        <p>Përshëndetje <strong>${clientName}</strong>, rezervimi juaj u konfirmua nga agjencia.</p>
        <table style="width:100%;border-collapse:collapse;margin:20px 0;">
          <tr><td style="padding:8px;border:1px solid #eee;color:#888;">Vetura</td><td style="padding:8px;border:1px solid #eee;font-weight:700;">${carName}</td></tr>
          <tr><td style="padding:8px;border:1px solid #eee;color:#888;">Nga data</td><td style="padding:8px;border:1px solid #eee;">${fromDate}</td></tr>
          <tr><td style="padding:8px;border:1px solid #eee;color:#888;">Deri më</td><td style="padding:8px;border:1px solid #eee;">${toDate}</td></tr>
          <tr><td style="padding:8px;border:1px solid #eee;color:#888;">Agjencia</td><td style="padding:8px;border:1px solid #eee;">${businessName}</td></tr>
          <tr><td style="padding:8px;border:1px solid #eee;color:#888;">Kontakt</td><td style="padding:8px;border:1px solid #eee;">${businessPhone}</td></tr>
        </table>
        <p>Kontaktoni agjencinë për detaje të marrjes së veturës.</p>
      </div>
    `
  });
}

module.exports = { sendBookingNotification, sendBookingConfirmation };