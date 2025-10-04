'use client';

import React, { useState, useRef, useEffect } from 'react';
import { clsx } from 'clsx';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps {
  options: SelectOption[];
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  disabled?: boolean;
  searchable?: boolean;
  className?: string;
}

export const Select: React.FC<SelectProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Select an option',
  label,
  error,
  disabled = false,
  searchable = false,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  const filteredOptions = searchable
    ? options.filter((opt) => opt.label.toLowerCase().includes(searchTerm.toLowerCase()))
    : options;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && searchable && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen, searchable]);

  const handleToggle = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
      if (isOpen) {
        setSearchTerm('');
      }
    }
  };

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
    setSearchTerm('');
  };

  return (
    <div className={clsx('form-group', className)}>
      {label && <label className="form-label">{label}</label>}
      <div ref={containerRef} className="select-container">
        <button
          type="button"
          className={clsx('select-trigger', {
            'select-trigger-open': isOpen,
            'select-trigger-error': error,
            'select-trigger-disabled': disabled,
          })}
          onClick={handleToggle}
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
        >
          <span className="select-value">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <span className="select-arrow">{isOpen ? '▲' : '▼'}</span>
        </button>
        {isOpen && (
          <div className="select-dropdown">
            {searchable && (
              <div className="select-search">
                <input
                  ref={searchInputRef}
                  type="text"
                  className="input"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            )}
            <ul className="select-options" role="listbox">
              {filteredOptions.length === 0 ? (
                <li className="select-option-empty">No options found</li>
              ) : (
                filteredOptions.map((option) => (
                  <li
                    key={option.value}
                    className={clsx('select-option', {
                      'select-option-selected': option.value === value,
                      'select-option-disabled': option.disabled,
                    })}
                    onClick={() => !option.disabled && handleSelect(option.value)}
                    role="option"
                    aria-selected={option.value === value}
                    aria-disabled={option.disabled}
                  >
                    {option.label}
                  </li>
                ))
              )}
            </ul>
          </div>
        )}
      </div>
      {error && <p className="form-error">{error}</p>}
    </div>
  );
};