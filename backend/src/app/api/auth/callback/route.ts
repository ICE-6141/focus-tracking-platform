import { NextResponse } from 'next/server';
import {
  AuthUser,
  createSessionToken,
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  STATE_COOKIE,
} from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface GithubUserResponse {
  id: number;
  login: string;
  name: string | null;
  avatar_url: string;
  email: string | null;
}

interface GithubEmailResponse {
  email: string;
  primary: boolean;
  verified: boolean;
}

const redirectWithError = (request: Request, error: string) => (
  NextResponse.redirect(new URL(`/login?error=${error}`, request.url))
);

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const storedState = request.headers.get('cookie')
    ?.split(';')
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(`${STATE_COOKIE}=`))
    ?.split('=')[1];

  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  if (!clientId || !clientSecret || !process.env.AUTH_SECRET) {
    return redirectWithError(request, 'missing_config');
  }

  if (!code || !state || !storedState || state !== storedState) {
    return redirectWithError(request, 'invalid_state');
  }

  try {
    const redirectUri = new URL('/api/auth/callback', request.url).toString();
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
      }),
    });
    if (!tokenRes.ok) return redirectWithError(request, 'token_failed');

    const tokenData: { access_token?: string } = await tokenRes.json();
    if (!tokenData.access_token) return redirectWithError(request, 'token_failed');

    const [userRes, emailRes] = await Promise.all([
      fetch('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          Accept: 'application/vnd.github+json',
        },
      }),
      fetch('https://api.github.com/user/emails', {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          Accept: 'application/vnd.github+json',
        },
      }),
    ]);

    if (!userRes.ok) return redirectWithError(request, 'profile_failed');

    const githubUser: GithubUserResponse = await userRes.json();
    const emails: GithubEmailResponse[] = emailRes.ok ? await emailRes.json() : [];
    const primaryEmail = emails.find((email) => email.primary && email.verified)?.email ?? githubUser.email;

    const user: AuthUser = {
      id: githubUser.id,
      login: githubUser.login,
      name: githubUser.name || githubUser.login,
      avatarUrl: githubUser.avatar_url,
      email: primaryEmail,
    };

    const response = NextResponse.redirect(new URL('/dashboard', request.url));
    response.cookies.delete(STATE_COOKIE);
    response.cookies.set(
      SESSION_COOKIE,
      createSessionToken({
        user,
        expiresAt: Date.now() + SESSION_MAX_AGE_SECONDS * 1000,
      }),
      {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: SESSION_MAX_AGE_SECONDS,
        path: '/',
      },
    );

    return response;
  } catch {
    return redirectWithError(request, 'oauth_failed');
  }
}
