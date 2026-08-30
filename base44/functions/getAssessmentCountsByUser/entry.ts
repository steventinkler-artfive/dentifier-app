import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

const ZONE = 'Europe/London';
const PERIOD_DAYS = { today: 0, '7d': 6, '30d': 29 };
const MAX_PAGES = 50;
const PAGE_SIZE = 1000;

// Wall-clock Y/M/D for a given instant in Europe/London (DST-aware).
function londonWallParts(date) {
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  const parts = fmt.formatToParts(date);
  const get = (t) => parts.find((p) => p.type === t).value;
  return {
    y: parseInt(get('year'), 10),
    m: parseInt(get('month'), 10) - 1,
    d: parseInt(get('day'), 10)
  };
}

// UTC instant of 00:00 wall-clock on the given London calendar day.
function londonMidnightUTC(year, month0, day) {
  const candidate = new Date(Date.UTC(year, month0, day, 0, 0, 0));
  const hourFmt = new Intl.DateTimeFormat('en-GB', { timeZone: ZONE, hour: '2-digit', hour12: false });
  const hour = parseInt(hourFmt.format(candidate), 10);
  // BST: candidate lands on 01:00 London -> midnight London was 1h earlier.
  // GMT: candidate lands on 00:00 London -> already midnight.
  const offsetHours = hour === 1 ? 1 : 0;
  return new Date(candidate.getTime() - offsetHours * 3600000);
}

// UTC instant of 00:00 London wall-clock, N calendar days before today.
function londonMidnightNDaysAgo(now, n) {
  const { y, m, d } = londonWallParts(now);
  // noon UTC keeps calendar-day subtraction safe across DST edges
  const base = new Date(Date.UTC(y, m, d, 12, 0, 0));
  base.setUTCDate(base.getUTCDate() - n);
  return londonMidnightUTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate());
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    // Server-side admin gate: rejects non-admins hitting the endpoint directly.
    if (user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    let period = 'today';
    try {
      const body = await req.json();
      if (body && typeof body.period === 'string') period = body.period;
    } catch (e) {
      /* no body or invalid JSON -> default period */
    }
    if (!(period in PERIOD_DAYS)) {
      return Response.json({ error: 'Invalid period' }, { status: 400 });
    }

    const startMs = londonMidnightNDaysAgo(new Date(), PERIOD_DAYS[period]).getTime();

    // created_date is not server-filterable, so we fetch pages (offset/skip) and
    // apply the period window in memory. Only counts are retained in the response;
    // no assessment content ever leaves the function.
    const counts = {};
    const seen = new Set();
    for (let skip = 0; skip < MAX_PAGES * PAGE_SIZE; skip += PAGE_SIZE) {
      const batch = await base44.asServiceRole.entities.Assessment.filter({}, '-created_date', PAGE_SIZE, skip);
      if (!Array.isArray(batch) || batch.length === 0) break;
      for (const a of batch) {
        if (seen.has(a.id)) continue;
        seen.add(a.id);
        const cd = a.created_date ? new Date(a.created_date).getTime() : 0;
        if (cd >= startMs) {
          const email = (a.creator_email || a.created_by || '').toString().toLowerCase().trim();
          if (email) counts[email] = (counts[email] || 0) + 1;
        }
      }
      // Sorted desc by created_date: if this page's oldest record predates the
      // window start, every later page is older too -> stop early.
      const oldest = batch[batch.length - 1];
      if (oldest && new Date(oldest.created_date).getTime() < startMs) break;
      if (batch.length < PAGE_SIZE) break;
    }

    return Response.json({ counts });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}