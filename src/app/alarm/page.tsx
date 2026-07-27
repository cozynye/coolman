'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Logo from '@/components/Logo';
import { ALARM } from '@/lib/alarm/constants';
import type { LastRunMeta } from '@/lib/alarm/types';

const SESSION_KEY = 'alarm_key';

export default function AlarmPage() {
  // sessionStorage는 서버 렌더 시 없으므로 마운트 후 읽는다 (hydration mismatch 방지)
  const [ready, setReady] = useState(false);
  const [alarmKey, setAlarmKey] = useState<string | null>(null);

  useEffect(() => {
    setAlarmKey(sessionStorage.getItem(SESSION_KEY));
    setReady(true);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex h-14 max-w-2xl items-center gap-2 px-4">
          <Link
            href="/"
            aria-label="중고모아 홈으로"
            className="flex items-center gap-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
          >
            <Logo size={24} />
            <span className="text-sm font-bold text-gray-900">중고모아</span>
          </Link>
          <span aria-hidden className="text-gray-300">
            /
          </span>
          <h1 className="text-sm font-semibold text-gray-700">알림 관리</h1>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-8">
        {!ready ? null : alarmKey ? (
          <Manager
            alarmKey={alarmKey}
            onExpire={() => {
              sessionStorage.removeItem(SESSION_KEY);
              setAlarmKey(null);
            }}
          />
        ) : (
          <PasswordGate
            onAuthed={(pw) => {
              sessionStorage.setItem(SESSION_KEY, pw);
              setAlarmKey(pw);
            }}
          />
        )}
      </main>
    </div>
  );
}

function PasswordGate({ onAuthed }: { onAuthed: (pw: string) => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!password || busy) return;
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/alarm/auth', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (data.ok) onAuthed(password);
      else setError('비밀번호가 올바르지 않습니다');
    } catch {
      setError('인증 요청에 실패했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="animate-fadeIn mx-auto mt-12 max-w-sm rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
    >
      <h2 className="text-lg font-bold text-gray-900">관리자 인증</h2>
      <p className="mt-1 text-sm text-gray-500">알림 관리 페이지는 비밀번호가 필요합니다.</p>
      <label htmlFor="alarm-password" className="mt-5 block text-sm font-medium text-gray-700">
        비밀번호
      </label>
      <input
        id="alarm-password"
        type="password"
        autoFocus
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="mt-1.5 h-11 w-full rounded-lg border border-gray-300 px-3 text-sm text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
      />
      {error && (
        <p role="alert" className="mt-2 text-sm text-red-600">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={busy}
        className="mt-4 h-11 w-full rounded-lg bg-teal-500 text-sm font-semibold text-white transition-colors hover:bg-teal-600 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2"
      >
        {busy ? '확인 중…' : '입장'}
      </button>
    </form>
  );
}

function formatKst(iso: string): string {
  return new Date(iso).toLocaleString('ko-KR', {
    timeZone: 'Asia/Seoul',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function Manager({ alarmKey, onExpire }: { alarmKey: string; onExpire: () => void }) {
  const [loading, setLoading] = useState(true);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [lastRun, setLastRun] = useState<LastRunMeta | null>(null);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [testBusy, setTestBusy] = useState(false);
  const [notice, setNotice] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  const api = useCallback(
    async (path: string, init: RequestInit = {}) => {
      const res = await fetch(path, {
        ...init,
        // HTTP 헤더는 non-ASCII 불가 → 인코딩해 전달 (서버에서 decode 후 비교)
        headers: { 'content-type': 'application/json', 'x-alarm-key': encodeURIComponent(alarmKey) },
      });
      if (res.status === 401) {
        onExpire();
        throw new Error('unauthorized');
      }
      return res;
    },
    [alarmKey, onExpire],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api('/api/alarm/keywords');
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setNotice({ type: 'error', text: `목록을 불러오지 못했습니다: ${data.error ?? res.status}` });
        } else {
          setKeywords(data.keywords);
          setLastRun(data.lastRun);
        }
      } catch {
        if (!cancelled) setNotice({ type: 'error', text: '목록을 불러오지 못했습니다.' });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [api]);

  async function addKeyword(e: React.FormEvent) {
    e.preventDefault();
    const keyword = input.trim();
    if (!keyword || busy) return;
    setBusy(true);
    setNotice(null);
    try {
      const res = await api('/api/alarm/keywords', {
        method: 'POST',
        body: JSON.stringify({ keyword }),
      });
      const data = await res.json();
      if (data.ok) {
        setKeywords(data.keywords);
        setInput('');
      } else {
        setNotice({
          type: 'error',
          text:
            data.error === 'limit'
              ? `키워드는 최대 ${ALARM.MAX_KEYWORDS}개까지 등록할 수 있습니다`
              : `등록에 실패했습니다: ${data.error ?? '알 수 없는 오류'}`,
        });
      }
    } catch {
      setNotice({ type: 'error', text: '등록 요청에 실패했습니다.' });
    } finally {
      setBusy(false);
    }
  }

  async function removeKeyword(keyword: string) {
    if (busy) return;
    setBusy(true);
    setNotice(null);
    try {
      const res = await api('/api/alarm/keywords', {
        method: 'DELETE',
        body: JSON.stringify({ keyword }),
      });
      const data = await res.json();
      if (data.ok) setKeywords(data.keywords);
      else setNotice({ type: 'error', text: `삭제에 실패했습니다: ${data.error ?? '알 수 없는 오류'}` });
    } catch {
      setNotice({ type: 'error', text: '삭제 요청에 실패했습니다.' });
    } finally {
      setBusy(false);
    }
  }

  async function sendTest() {
    if (testBusy) return;
    setTestBusy(true);
    setNotice(null);
    try {
      const res = await api('/api/alarm/test', { method: 'POST' });
      const data = await res.json();
      setNotice(
        data.ok
          ? { type: 'success', text: '테스트 알림을 보냈습니다 — Discord 채널을 확인하세요.' }
          : { type: 'error', text: '전송 실패 — DISCORD_WEBHOOK_URL 설정을 확인하세요.' },
      );
    } catch {
      setNotice({ type: 'error', text: '테스트 요청에 실패했습니다.' });
    } finally {
      setTestBusy(false);
    }
  }

  const atLimit = keywords.length >= ALARM.MAX_KEYWORDS;

  return (
    <div className="animate-fadeIn space-y-6">
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-bold text-gray-900">알림 키워드</h2>
        <p className="mt-1 text-sm text-gray-500">
          30분마다 새 상품을 확인해 Discord로 알려드립니다. ({keywords.length}/{ALARM.MAX_KEYWORDS})
        </p>

        <form onSubmit={addKeyword} className="mt-4 flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={atLimit ? '최대 개수에 도달했습니다' : '예: 아이폰 15 프로'}
            disabled={atLimit || loading}
            aria-label="알림 키워드 입력"
            className="h-11 min-w-0 flex-1 rounded-lg border border-gray-300 px-3 text-sm text-gray-900 disabled:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
          />
          <button
            type="submit"
            disabled={atLimit || busy || loading || !input.trim()}
            className="h-11 shrink-0 rounded-lg bg-teal-500 px-4 text-sm font-semibold text-white transition-colors hover:bg-teal-600 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2"
          >
            추가
          </button>
        </form>

        {notice && (
          <p
            role={notice.type === 'error' ? 'alert' : 'status'}
            className={`mt-3 text-sm ${notice.type === 'error' ? 'text-red-600' : 'text-teal-700'}`}
          >
            {notice.text}
          </p>
        )}

        <ul aria-live="polite" className="mt-4 divide-y divide-gray-100">
          {loading ? (
            <li className="py-3 text-sm text-gray-400">불러오는 중…</li>
          ) : keywords.length === 0 ? (
            <li className="py-3 text-sm text-gray-400">등록된 키워드가 없습니다.</li>
          ) : (
            keywords.map((kw) => (
              <li key={kw} className="flex items-center justify-between gap-2 py-1">
                <span className="truncate text-sm font-medium text-gray-800">{kw}</span>
                <button
                  type="button"
                  onClick={() => removeKeyword(kw)}
                  disabled={busy}
                  aria-label={`'${kw}' 알림 삭제`}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                    <path
                      d="M3 3l10 10M13 3L3 13"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              </li>
            ))
          )}
        </ul>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-base font-bold text-gray-900">최근 확인 결과</h2>
          <button
            type="button"
            onClick={sendTest}
            disabled={testBusy}
            className="h-11 shrink-0 rounded-lg border border-teal-500 px-4 text-sm font-semibold text-teal-600 transition-colors hover:bg-teal-50 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
          >
            {testBusy ? '전송 중…' : '테스트 알림'}
          </button>
        </div>

        {lastRun ? (
          <div className="mt-3 text-sm text-gray-600">
            <p>
              {formatKst(lastRun.at)} 실행 · {(lastRun.tookMs / 1000).toFixed(1)}초 · 새 상품{' '}
              <strong className="text-teal-700">{lastRun.totalNew}건</strong>
            </p>
            <ul className="mt-2 space-y-1">
              {lastRun.results.map((r) => (
                <li key={r.keyword} className="text-xs text-gray-500">
                  <span className="font-medium text-gray-700">{r.keyword}</span> — 번개장터{' '}
                  {r.bunjang.seeded ? '초기화' : `${r.bunjang.new}건`}
                  {r.bunjang.error ? ' (오류)' : ''} · 중고나라{' '}
                  {r.joongna.seeded ? '초기화' : `${r.joongna.new}건`}
                  {r.joongna.error ? ' (오류)' : ''}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="mt-3 text-sm text-gray-400">
            아직 실행 기록이 없습니다. 크론이 30분마다 자동 실행됩니다.
          </p>
        )}
      </section>
    </div>
  );
}
