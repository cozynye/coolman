'use client';

import { useState, useRef, useEffect, useMemo, useSyncExternalStore, KeyboardEvent } from 'react';
import { recentStore } from '@/lib/recentStore';
import { TRENDING_KEYWORDS } from '@/lib/popularKeywords';

interface Props {
  onSearch: (keyword: string) => void;
  isLoading: boolean;
  compact?: boolean;
  initialValue?: string;
}

// page.tsx가 검색 시 recentStore.save를 호출하므로 외부에서도 쓸 수 있게 재노출(호환).
export function saveRecentSearch(keyword: string) {
  recentStore.save(keyword);
}

export default function SearchBar({ onSearch, isLoading, compact = false, initialValue = '' }: Props) {
  const [value, setValue] = useState(initialValue);
  const [open, setOpen] = useState(false);
  // typed: 사용자가 포커스 이후 직접 입력했는지. 검색 후 채워진 값(=현재 검색어)으로
  //        목록을 필터링하지 않기 위함 — 포커스 시엔 항상 전체 최근검색어를 보여준다.
  const [typed, setTyped] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 최근검색어는 외부 스토어 구독 → 모든 SearchBar 인스턴스(Hero/헤더)가 자동 동기화
  const recent = useSyncExternalStore(
    recentStore.subscribe,
    recentStore.getSnapshot,
    recentStore.getServerSnapshot,
  );

  // blurTimer 정리(언마운트)
  useEffect(() => () => {
    if (blurTimer.current) clearTimeout(blurTimer.current);
  }, []);

  // 표시 목록: 입력 중이면 입력값으로 필터(히스토리 자동완성),
  //            아니면 최근검색어 → 없으면 인기검색어 fallback(신규 사용자 진입점)
  const list = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (typed && q) {
      return recent.filter((k) => k.toLowerCase().includes(q) && k.toLowerCase() !== q);
    }
    return recent.length ? recent : TRENDING_KEYWORDS;
  }, [recent, value, typed]);

  // 최근검색이 없어 인기검색어를 보여주는 상태(삭제 불가)
  const showingPopular = !(typed && value.trim()) && recent.length === 0;
  const showDropdown = open && list.length > 0;

  // 드롭다운 열기 — onFocus + onPointerDown 양쪽에서 호출.
  // 이미 DOM 포커스된 input을 다시 탭하면 focus 이벤트가 안 뜨므로 pointerdown으로 보강한다.
  function openDropdown() {
    if (blurTimer.current) {
      clearTimeout(blurTimer.current);
      blurTimer.current = null;
    }
    setTyped(false);
    setActiveIdx(-1);
    setOpen(true);
  }

  function closeDropdown() {
    setOpen(false);
    setActiveIdx(-1);
  }

  function handleSearch(kw?: string) {
    const keyword = (kw ?? value).trim();
    if (!keyword) return;
    setValue(keyword);
    setTyped(false);
    closeDropdown();
    if (blurTimer.current) clearTimeout(blurTimer.current);
    // DOM 포커스 해제: 모바일 키보드 내림 + 다음 탭에서 focus 이벤트 재발생 보장(버그 ① 방지)
    inputRef.current?.blur();
    onSearch(keyword); // 최근검색 저장은 page.tsx의 keyword effect가 담당
  }

  function handleRemove(kw: string) {
    recentStore.remove(kw);
    setActiveIdx(-1);
    // X 탭 시 preventDefault로 input 포커스 유지 → 드롭다운 유지하며 즉시 다음 항목 삭제 가능
    inputRef.current?.focus();
  }

  function clearAll() {
    recentStore.clear();
    setActiveIdx(-1);
    inputRef.current?.focus();
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActiveIdx((i) => Math.min(i + 1, list.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, -1));
    } else if (e.key === 'Escape') {
      closeDropdown();
    } else if (e.key === 'Enter') {
      if (activeIdx >= 0 && list[activeIdx]) {
        handleSearch(list[activeIdx]);
      } else {
        handleSearch();
      }
    }
  }

  return (
    <div className="relative w-full">
      <div
        className={`flex items-center gap-2 bg-white transition-colors min-w-0 ${
          compact
            ? 'border rounded-lg px-3 py-2'
            : 'border-2 rounded-2xl px-4 py-3 shadow-sm'
        } ${open
            ? compact ? 'border-teal-400' : 'border-teal-400 shadow-teal-100 shadow-md'
            : compact ? 'border-gray-200' : 'border-gray-100'
        }`}
      >
        {/* 돋보기 아이콘 */}
        <svg
          className={`${compact ? 'w-4 h-4' : 'w-5 h-5'} text-gray-400 shrink-0`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>

        <input
          ref={inputRef}
          type="search"
          inputMode="search"
          enterKeyHint="search"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setTyped(true);
            setActiveIdx(-1);
            setOpen(true);
          }}
          onFocus={openDropdown}
          onPointerDown={openDropdown}
          onBlur={() => {
            blurTimer.current = setTimeout(() => setOpen(false), 150);
          }}
          onKeyDown={handleKeyDown}
          placeholder="찾으시는 상품을 입력하세요"
          className={`flex-1 min-w-0 outline-none text-gray-800 placeholder-gray-400 bg-transparent [&::-webkit-search-cancel-button]:hidden ${compact ? 'text-sm' : 'text-base'}`}
          autoComplete="off"
          role="combobox"
          aria-expanded={showDropdown}
          aria-autocomplete="list"
          aria-label="상품 검색"
          style={{ fontSize: '16px' }} // iOS 줌 방지
        />

        {value && (
          <button
            type="button"
            aria-label="검색어 지우기"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              setValue('');
              setTyped(false);
              setOpen(true);
              inputRef.current?.focus();
            }}
            className="text-gray-300 hover:text-gray-500 transition-colors shrink-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}

        <button
          type="button"
          onClick={() => handleSearch()}
          disabled={isLoading || !value.trim()}
          className={`bg-teal-500 hover:bg-teal-600 disabled:opacity-50 text-white font-semibold rounded-lg transition-colors shrink-0 ${compact ? 'px-3 py-1 text-xs' : 'px-4 py-1.5 text-sm rounded-xl'}`}
        >
          {isLoading ? (
            <span className="flex items-center gap-1.5">
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              검색 중
            </span>
          ) : (
            '검색'
          )}
        </button>
      </div>

      {/* 최근 검색 / 히스토리 자동완성 드롭다운 */}
      {showDropdown && (
        <div
          className="absolute top-full mt-2 left-0 right-0 bg-white border border-gray-100 rounded-2xl shadow-xl z-50 overflow-hidden text-left"
        >
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-50">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
              {showingPopular ? '인기 검색어' : typed && value.trim() ? '관련 최근 검색' : '최근 검색'}
            </span>
            {!showingPopular && (
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={clearAll}
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors px-2 py-1 -mr-2"
              >
                전체 삭제
              </button>
            )}
          </div>
          <ul className="py-1 max-h-[min(50vh,420px)] overflow-y-auto overscroll-contain">
            {list.map((kw, i) => (
              <li
                key={kw}
                className={`flex items-center transition-colors ${i === activeIdx ? 'bg-teal-50' : ''}`}
              >
                {/* 검색 버튼 (행 전체) — 삭제 버튼과 형제로 분리해 탭 충돌 제거 */}
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSearch(kw);
                  }}
                  className="flex-1 min-w-0 flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                >
                  {showingPopular ? (
                    <svg className="w-3.5 h-3.5 text-teal-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  ) : (
                    <svg className="w-3.5 h-3.5 text-gray-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                  <span className="flex-1 min-w-0 truncate text-sm text-gray-700">{kw}</span>
                </button>
                {/* 삭제 버튼 — 넉넉한 터치 타깃(≈44px), 검색 트리거와 완전 분리. 인기검색어는 삭제 불가 */}
                {!showingPopular && (
                  <button
                    type="button"
                    aria-label={`'${kw}' 검색어 삭제`}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleRemove(kw);
                    }}
                    className="shrink-0 flex items-center justify-center w-11 h-11 text-gray-300 hover:text-gray-600 active:text-gray-700 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
