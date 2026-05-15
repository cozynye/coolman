'use client';

import { useState, useRef, useEffect, KeyboardEvent } from 'react';

interface Props {
  onSearch: (keyword: string) => void;
  isLoading: boolean;
  compact?: boolean;
}

const RECENT_KEY = 'junggo_recent_v2';
const MAX_RECENT = 10;

function getRecent(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveRecent(keyword: string) {
  const prev = getRecent().filter((k) => k !== keyword);
  localStorage.setItem(RECENT_KEY, JSON.stringify([keyword, ...prev].slice(0, MAX_RECENT)));
}

function removeRecent(keyword: string) {
  localStorage.setItem(
    RECENT_KEY,
    JSON.stringify(getRecent().filter((k) => k !== keyword))
  );
}

export function saveRecentSearch(keyword: string) {
  saveRecent(keyword);
}

export default function SearchBar({ onSearch, isLoading, compact = false }: Props) {
  const [value, setValue] = useState('');
  const [recent, setRecent] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [focused, setFocused] = useState(false);
  const [focusedIdx, setFocusedIdx] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setRecent(getRecent());
  }, []);

  const showDropdown = focused && suggestions.length > 0;

  function updateSuggestions(val: string) {
    const r = getRecent();
    setRecent(r);
    if (!val.trim()) {
      setSuggestions(r);
    } else {
      setSuggestions(r.filter((k) => k.toLowerCase().includes(val.toLowerCase())));
    }
    setFocusedIdx(-1);
  }

  function handleSearch(kw?: string) {
    const keyword = (kw ?? value).trim();
    if (!keyword) return;
    saveRecent(keyword);
    setValue(keyword);
    setSuggestions([]);
    setFocused(false);
    onSearch(keyword);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIdx((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIdx((i) => Math.max(i - 1, -1));
    } else if (e.key === 'Escape') {
      setSuggestions([]);
      setFocused(false);
    } else if (e.key === 'Enter') {
      if (focusedIdx >= 0 && suggestions[focusedIdx]) {
        handleSearch(suggestions[focusedIdx]);
      } else {
        handleSearch();
      }
    }
  }

  function clearAll() {
    localStorage.removeItem(RECENT_KEY);
    setRecent([]);
    setSuggestions([]);
  }

  function handleRemove(kw: string, e: React.MouseEvent) {
    e.stopPropagation();
    removeRecent(kw);
    updateSuggestions(value);
  }

  return (
    <div className="relative w-full">
      <div
        className={`flex items-center gap-2 bg-white transition-colors ${
          compact
            ? 'border rounded-lg px-2.5 py-1'
            : 'border-2 rounded-2xl px-4 py-3 shadow-sm'
        } ${focused
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
          type="text"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            updateSuggestions(e.target.value);
          }}
          onFocus={() => {
            setFocused(true);
            updateSuggestions(value);
          }}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          onKeyDown={handleKeyDown}
          placeholder="찾으시는 상품을 입력하세요"
          className={`flex-1 outline-none text-gray-800 placeholder-gray-400 bg-transparent ${compact ? 'text-sm' : 'text-base'}`}
          autoComplete="off"
          style={{ fontSize: '16px' }} // iOS 줌 방지
        />

        {value && (
          <button
            type="button"
            onClick={() => {
              setValue('');
              setSuggestions(recent);
              inputRef.current?.focus();
            }}
            className="text-gray-300 hover:text-gray-500 transition-colors"
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

      {/* 자동완성 드롭다운 */}
      {showDropdown && (
        <div
          ref={dropdownRef}
          className="absolute top-full mt-2 left-0 right-0 bg-white border border-gray-100 rounded-2xl shadow-xl z-50 overflow-hidden"
        >
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-50">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">최근 검색</span>
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={clearAll}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              전체 삭제
            </button>
          </div>
          <ul className="py-1 max-h-64 overflow-y-auto">
            {suggestions.map((kw, i) => (
              <li key={kw}>
                <div
                  className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${
                    i === focusedIdx ? 'bg-teal-50' : 'hover:bg-gray-50'
                  }`}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSearch(kw);
                  }}
                >
                  <svg className="w-3.5 h-3.5 text-gray-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="flex-1 text-sm text-gray-700">{kw}</span>
                  <button
                    onMouseDown={(e) => handleRemove(kw, e)}
                    className="text-gray-300 hover:text-gray-500 p-0.5"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
