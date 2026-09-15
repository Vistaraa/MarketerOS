"use client";

import React, { useEffect } from "react";
import { AlertTriangle, CheckCircle2, Info, XCircle, HelpCircle, X } from "lucide-react";

export type DialogType = "info" | "success" | "warning" | "error" | "confirm";

export interface CustomDialogProps {
  isOpen: boolean;
  title?: string;
  message: string;
  type?: DialogType;
  confirmText?: string;
  cancelText?: string;
  confirmTone?: "primary" | "danger" | "warning";
  onConfirm?: () => void;
  onCancel?: () => void;
  onClose: () => void;
}

export function CustomDialog({
  isOpen,
  title,
  message,
  type = "info",
  confirmText = "Confirm",
  cancelText = "Cancel",
  confirmTone = "danger",
  onConfirm,
  onCancel,
  onClose
}: CustomDialogProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === "Escape") {
        if (type === "confirm" && onCancel) {
          onCancel();
        } else {
          onClose();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, type, onCancel, onClose]);

  if (!isOpen) return null;

  const isConfirm = type === "confirm";

  const defaultTitles: Record<DialogType, string> = {
    info: "Information",
    success: "Success",
    warning: "Warning",
    error: "Error",
    confirm: "Confirmation Required"
  };

  const getIcon = () => {
    switch (type) {
      case "success":
        return <CheckCircle2 className="h-6 w-6 text-emerald-500 shrink-0" />;
      case "warning":
        return <AlertTriangle className="h-6 w-6 text-amber-500 shrink-0" />;
      case "error":
        return <XCircle className="h-6 w-6 text-rose-500 shrink-0" />;
      case "confirm":
        return <HelpCircle className="h-6 w-6 text-indigo-500 dark:text-indigo-400 shrink-0" />;
      case "info":
      default:
        return <Info className="h-6 w-6 text-sky-500 shrink-0" />;
    }
  };

  const getConfirmButtonStyles = () => {
    if (confirmTone === "danger") {
      return "bg-rose-600 hover:bg-rose-700 text-white dark:bg-rose-600 dark:hover:bg-rose-500 shadow-sm";
    }
    if (confirmTone === "warning") {
      return "bg-amber-600 hover:bg-amber-700 text-white dark:bg-amber-600 dark:hover:bg-amber-500 shadow-sm";
    }
    return "bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 shadow-sm";
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-md overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95 p-6 shadow-2xl backdrop-blur-xl transition-all scale-100"
        role="dialog"
        aria-modal="true"
      >
        <button
          onClick={() => {
            if (isConfirm && onCancel) {
              onCancel();
            } else {
              onClose();
            }
          }}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 transition"
          aria-label="Close dialog"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-start gap-4">
          <div className="rounded-full bg-zinc-100 dark:bg-zinc-800/80 p-2.5">
            {getIcon()}
          </div>

          <div className="flex-1 pr-4">
            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              {title || defaultTitles[type]}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400 whitespace-pre-line">
              {message}
            </p>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2.5">
          {isConfirm ? (
            <>
              <button
                type="button"
                onClick={() => {
                  if (onCancel) onCancel();
                  onClose();
                }}
                className="rounded-xl border border-zinc-300 dark:border-zinc-700 bg-transparent px-4 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
              >
                {cancelText}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onConfirm) onConfirm();
                  onClose();
                }}
                className={`rounded-xl px-4 py-2 text-xs font-semibold transition ${getConfirmButtonStyles()}`}
              >
                {confirmText}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-zinc-900 px-5 py-2 text-xs font-semibold text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 transition shadow-sm"
            >
              OK
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
