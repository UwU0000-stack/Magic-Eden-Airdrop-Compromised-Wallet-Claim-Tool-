import { NextResponse } from 'next/server';

// Add these at the top of the file
const CF_COOKIE = process.env.CF_COOKIE || '';
const SESSION_COOKIE = process.env.SESSION_COOKIE || '';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Construct cookie string from environment variables
    const cookieString = `cf_clearance=${CF_COOKIE}; session_signature=${SESSION_COOKIE}`;

    const response = await fetch("https://mefoundation.com/api/trpc/auth.linkWallet?batch=1", {
      method: 'POST',
      headers: {
        "accept": "*/*",
        "accept-language": "en-CA,en-GB;q=0.9,en-US;q=0.8,en;q=0.7",
        "content-type": "application/json",
        "priority": "u=1, i",
        "sec-ch-ua": "\"Google Chrome\";v=\"131\", \"Chromium\";v=\"131\", \"Not_A Brand\";v=\"24\"",
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": "\"Windows\"",
        "sec-ch-ua-arch": "\"x86\"",
        "sec-ch-ua-bitness": "\"64\"",
        "sec-ch-ua-full-version": "\"131.0.6778.109\"",
        "sec-ch-ua-full-version-list": "\"Google Chrome\";v=\"131.0.6778.109\", \"Chromium\";v=\"131.0.6778.109\", \"Not_A Brand\";v=\"24.0.0.0\"",
        "sec-ch-ua-model": "\"\"",
        "sec-ch-ua-platform-version": "\"15.0.0\"",
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "x-trpc-source": "nextjs-react",
        "baggage": "sentry-environment=production,sentry-release=X1NH_jhCHKijR4Y2hFduP,sentry-public_key=43f5a6f01fe6dff7b5c0d7c54530d6a0,sentry-trace_id=908f4363cc724ea6ab81442d19373a1d,sentry-sample_rate=0.05,sentry-sampled=false",
        "sentry-trace": Date.now().toString(16) + "-" + Math.random().toString(16).substring(2) + "-1",
        "Referer": "https://mefoundation.com/wallets",
        "Referrer-Policy": "strict-origin-when-cross-origin",
        "cookie": cookieString,
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        "Origin": "https://mefoundation.com"
      },
      body: JSON.stringify(body)
    });

    // Handle Cloudflare challenge
    if (response.status === 403) {
      console.error('Cloudflare Error. Cookie string used:', cookieString);
      return NextResponse.json(
        { error: "Cloudflare protection active - please update cookies" },
        { status: 403 }
      );
    }

    const contentType = response.headers.get('content-type') || '';
    if (response.ok && contentType.includes('application/json')) {
      const data = await response.json();
      return NextResponse.json(data);
    } else {
      const text = await response.text();
      console.error('Non-OK or non-JSON response from server:', text);
      return NextResponse.json(
        { error: "API error", details: text },
        { status: response.status || 500 }
      );
    }
  } catch (error: any) {
    console.error('Error in /api/proxy route:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
