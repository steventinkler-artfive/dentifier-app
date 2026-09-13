import React, { useEffect, useMemo, useRef, useState } from "react";
import debounce from "lodash/debounce";
import { Search, X } from "lucide-react";

/**
 * Shared debounced search input for the Quotes and Invoices screens.
 * Reports the term to the parent after ~300ms of quiet typing, and
 * immediately when cleared.
 */
export default function ListSearchInput({ onSearch, placeholder = "Search" }) {
  const [text, setText] = useState("");

  const onSearchRef = useRef(onSearch);
  useEffect(() => {
    onSearchRef.current = onSearch;
  });

  const debouncedSearch = useMemo(
    () => debounce((value) => onSearchRef.current(value), 300),
    []
  );

  useEffect(() => () => debouncedSearch.cancel(), [debouncedSearch]);

  const handleChange = (e) => {
    const value = e.target.value;
    setText(value);
    if (!value.trim()) {
      debouncedSearch.cancel();
      onSearchRef.current("");
    } else {
      debouncedSearch(value);
    }
  };

  const handleClear = () => {
    debouncedSearch.cancel();
    setText("");
    onSearchRef.current("");
  };

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
      <input
        type="text"
        value={text}
        onChange={handleChange}
        placeholder={placeholder}
        className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-9 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-rose-600"
      />
      {text && (
        <button
          type="button"
          onClick={handleClear}
          aria-label="Clear search"
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}