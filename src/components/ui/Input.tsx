import React from 'react'
import { classNames } from '@/utils/format'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  leftIcon,
  rightIcon,
  className,
  id,
  ...props
}) => {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={inputId}
          style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 500 }}
        >
          {label}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 opacity-50">
            {leftIcon}
          </div>
        )}
        <input
          {...props}
          id={inputId}
          className={classNames(
            'input',
            leftIcon ? 'pl-9' : undefined,
            rightIcon ? 'pr-9' : undefined,
            error ? 'border-red-500' : undefined,
            className,
          )}
        />
        {rightIcon && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 opacity-50">
            {rightIcon}
          </div>
        )}
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  options: Array<{ value: string; label: string }>
  placeholder?: string
}

export const Select: React.FC<SelectProps> = ({
  label,
  error,
  options,
  placeholder,
  className,
  id,
  ...props
}) => {
  const selectId = id || label?.toLowerCase().replace(/\s+/g, '-')

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={selectId}
          style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 500 }}
        >
          {label}
        </label>
      )}
      <select
        {...props}
        id={selectId}
        className={classNames('input', error && 'border-red-500', className)}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

export const Textarea: React.FC<TextareaProps> = ({
  label,
  error,
  className,
  id,
  ...props
}) => {
  const textareaId = id || label?.toLowerCase().replace(/\s+/g, '-')

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={textareaId}
          style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 500 }}
        >
          {label}
        </label>
      )}
      <textarea
        {...props}
        id={textareaId}
        className={classNames('input resize-none', error && 'border-red-500', className)}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
