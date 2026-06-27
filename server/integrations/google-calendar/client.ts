/**
 * Cliente REST fino do Google Calendar (via axios — sem a dependência pesada
 * `googleapis`, mantendo o bundle serverless enxuto). Cobre o necessário para
 * sincronizar visitas: refresh de token, criar/atualizar/excluir evento e
 * gerar link do Google Meet via `conferenceData`.
 *
 * Domínios usados são públicos (googleapis.com / oauth2.googleapis.com) e não
 * são bloqueados pela proteção anti-SSRF.
 */

import axios from "axios";
import { nanoid } from "nanoid";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const CAL_BASE = "https://www.googleapis.com/calendar/v3";
const USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo";

export const GOOGLE_CALENDAR_SCOPES = [
  "openid",
  "email",
  "https://www.googleapis.com/auth/calendar.events",
];

export interface GoogleEventInput {
  summary: string;
  description?: string;
  location?: string;
  /** RFC3339 sem offset (ex.: 2026-06-27T14:00:00) interpretado em `timeZone`. */
  startDateTime: string;
  endDateTime: string;
  timeZone: string;
  attendees?: { email: string; displayName?: string }[];
  createMeet?: boolean;
}

export interface GoogleEventResult {
  id: string;
  htmlLink?: string;
  hangoutLink?: string;
  conferenceData?: {
    entryPoints?: { entryPointType: string; uri: string }[];
  };
}

export interface GoogleTokens {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope?: string;
  token_type?: string;
  id_token?: string;
}

function clientCreds() {
  return {
    client_id: process.env.GOOGLE_CLIENT_ID || "",
    client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
  };
}

/** Troca o `code` do consentimento por tokens (access + refresh). */
export async function exchangeCodeForTokens(
  code: string,
  redirectUri: string,
): Promise<GoogleTokens> {
  const { client_id, client_secret } = clientCreds();
  const resp = await axios.post<GoogleTokens>(TOKEN_URL, {
    code,
    client_id,
    client_secret,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  });
  return resp.data;
}

/** Renova o access token a partir do refresh token. */
export async function refreshAccessToken(
  refreshToken: string,
): Promise<{ accessToken: string; expiresIn: number; scope?: string }> {
  const { client_id, client_secret } = clientCreds();
  const resp = await axios.post<GoogleTokens>(TOKEN_URL, {
    client_id,
    client_secret,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });
  return {
    accessToken: resp.data.access_token,
    expiresIn: resp.data.expires_in,
    scope: resp.data.scope,
  };
}

/** E-mail Google da conta conectada (para exibir em Configurações). */
export async function fetchGoogleEmail(accessToken: string): Promise<string | undefined> {
  const resp = await axios.get<{ email?: string }>(USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return resp.data.email;
}

function buildEventBody(input: GoogleEventInput): Record<string, unknown> {
  const body: Record<string, unknown> = {
    summary: input.summary,
    description: input.description,
    location: input.location,
    start: { dateTime: input.startDateTime, timeZone: input.timeZone },
    end: { dateTime: input.endDateTime, timeZone: input.timeZone },
  };
  if (input.attendees?.length) {
    body.attendees = input.attendees;
  }
  if (input.createMeet) {
    body.conferenceData = {
      createRequest: {
        requestId: nanoid(),
        conferenceSolutionKey: { type: "hangoutsMeet" },
      },
    };
  }
  return body;
}

function meetUrlFrom(result: GoogleEventResult): string | undefined {
  if (result.hangoutLink) return result.hangoutLink;
  const video = result.conferenceData?.entryPoints?.find(
    (e) => e.entryPointType === "video",
  );
  return video?.uri;
}

function eventsUrl(calendarId: string, eventId?: string): string {
  const base = `${CAL_BASE}/calendars/${encodeURIComponent(calendarId)}/events`;
  return eventId ? `${base}/${encodeURIComponent(eventId)}` : base;
}

export async function insertEvent(
  accessToken: string,
  calendarId: string,
  input: GoogleEventInput,
): Promise<{ eventId: string; meetUrl?: string; htmlLink?: string }> {
  const query = input.createMeet
    ? "?conferenceDataVersion=1&sendUpdates=all"
    : "?sendUpdates=all";
  const resp = await axios.post<GoogleEventResult>(
    `${eventsUrl(calendarId)}${query}`,
    buildEventBody(input),
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  return { eventId: resp.data.id, meetUrl: meetUrlFrom(resp.data), htmlLink: resp.data.htmlLink };
}

export async function patchEvent(
  accessToken: string,
  calendarId: string,
  eventId: string,
  input: GoogleEventInput,
): Promise<{ eventId: string; meetUrl?: string; htmlLink?: string }> {
  const query = input.createMeet
    ? "?conferenceDataVersion=1&sendUpdates=all"
    : "?sendUpdates=all";
  const resp = await axios.patch<GoogleEventResult>(
    `${eventsUrl(calendarId, eventId)}${query}`,
    buildEventBody(input),
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  return { eventId: resp.data.id, meetUrl: meetUrlFrom(resp.data), htmlLink: resp.data.htmlLink };
}

export async function deleteEvent(
  accessToken: string,
  calendarId: string,
  eventId: string,
): Promise<void> {
  try {
    await axios.delete(`${eventsUrl(calendarId, eventId)}?sendUpdates=all`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  } catch (err) {
    // 404/410 = evento já removido no Google; tratamos como sucesso.
    const status = axios.isAxiosError(err) ? err.response?.status : undefined;
    if (status !== 404 && status !== 410) throw err;
  }
}
