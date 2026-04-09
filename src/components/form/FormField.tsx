"use client";

import { type ChangeEvent } from "react";

const INPUT_CLASS =
  "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300";

interface BaseProps {
  label: string;
  required?: boolean;
  hint?: string;
  className?: string;
}

interface InputProps extends BaseProps {
  type?: "text" | "email" | "password" | "url" | "number";
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  inputClassName?: string;
}

interface TextareaProps extends BaseProps {
  type: "textarea";
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
}

interface SelectProps extends BaseProps {
  type: "select";
  value: string;
  onChange: (value: string) => void;
  options: { label: string; value: string }[];
}

type FormFieldProps = InputProps | TextareaProps | SelectProps;

/**
 * 폼 입력 필드 공통 래퍼.
 *
 * label + required 표시 + input/textarea/select + hint 를 캡슐화한다.
 * admin 페이지 모달에서 반복되는 label + input 블록을 대체한다.
 */
export function FormField(props: FormFieldProps) {
  const { label, required, hint, className } = props;

  function handleChange(
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    props.onChange(e.target.value);
  }

  return (
    <div className={className}>
      <label className="text-xs font-medium text-gray-600 block mb-1">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>

      {props.type === "textarea" ? (
        <textarea
          value={props.value}
          onChange={handleChange}
          placeholder={props.placeholder}
          rows={props.rows ?? 3}
          className={`${INPUT_CLASS} resize-none`}
        />
      ) : props.type === "select" ? (
        <select value={props.value} onChange={handleChange} className={INPUT_CLASS}>
          {props.options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          type={props.type ?? "text"}
          value={props.value}
          onChange={handleChange}
          placeholder={props.placeholder}
          className={`${INPUT_CLASS} ${"inputClassName" in props ? props.inputClassName ?? "" : ""}`}
        />
      )}

      {hint && <p className="text-xs text-gray-400 mt-0.5">{hint}</p>}
    </div>
  );
}
