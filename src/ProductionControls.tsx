import React, {useLayoutEffect, useRef} from 'react';
import {BAG_IMAGES} from './backpack';
import './production-menu.css';

type RecipeProps = {
 name: string; image: string; detail: string; stock: string;
 label?: string; selected: boolean; onSelect: () => void;
};

export function RecipeChoice({name, image, detail, stock, label, selected, onSelect}: RecipeProps) {
 return <button type="button" className="production-choice" aria-pressed={selected} aria-label={label} onClick={onSelect}>
  <span className="production-art"><img src={image} alt="" /></span>
  <span className="production-choice-copy"><strong>{name}</strong><small>{detail}</small><span>{stock}</span></span>
  {selected && <span className="production-check" aria-hidden="true">✓</span>}
 </button>;
}

type FuelProps = {
 label: string; seconds: number; capacity: number; logs: number; disabled: boolean;
 duration: number; onAdd: () => void;
};

export function FuelControl({label, seconds, capacity, logs, disabled, duration, onAdd}: FuelProps) {
 return <section className="production-utility" aria-label="Fuel">
  <img src={BAG_IMAGES.logs} alt="" />
  <div className="production-utility-copy">
   <strong>{label}</strong>
   <progress value={seconds} max={capacity} aria-label="Fuel remaining" />
   <small>{logs} {logs === 1 ? 'log' : 'logs'} available</small>
  </div>
  <button type="button" className="production-secondary" disabled={disabled}
   aria-label={`Add wood. ${logs} logs available.`} title={`One log adds ${duration} seconds`} onClick={onAdd}>
   {!logs ? 'Need wood' : disabled ? 'Fuel full' : 'Add wood'}
  </button>
 </section>;
}

type JobProps = {
 name: string; image: string; status: string; progress: number;
 cancelLabel: string; canCancel: boolean; onCancel: () => void;
};

export function ProductionJob({name, image, status, progress, cancelLabel, canCancel, onCancel}: JobProps) {
 return <li className="production-job">
  <img src={image} alt="" />
  <div><strong>{name}</strong><small>{status}</small></div>
  <progress value={progress} max={1} aria-label={`${name} progress`} />
  <button type="button" className="production-icon" disabled={!canCancel} aria-label={cancelLabel} title={cancelLabel} onClick={onCancel}><span aria-hidden="true">×</span></button>
 </li>;
}

type BatchProps = {
 name: string; detail: string; blocked?: boolean; infoLabel?: string; onInfo?: () => void;
 amount: number; limit: number; action: string; actionLabel: string;
 onQuantity: (n: number) => void; onSubmit: () => void;
};

export function BatchAction({name, detail, blocked, infoLabel, onInfo, amount, limit, action, actionLabel, onQuantity, onSubmit}: BatchProps) {
 return <section className="production-batch" aria-label="Selected batch">
  <div className="production-batch-summary">
   <strong>{name}</strong>
   {onInfo && <button type="button" className="production-icon" aria-label={infoLabel} aria-haspopup="dialog" onClick={onInfo}><span className="production-info-mark" aria-hidden="true">i</span></button>}
   <span data-blocked={blocked || undefined}>{detail}</span>
  </div>
  <div className="production-actions">
   <div className="production-stepper" role="group" aria-label="Batch quantity">
    <button type="button" disabled={amount <= 1} aria-label="Decrease quantity" onClick={() => onQuantity(amount - 1)}><span aria-hidden="true">−</span></button>
    <output aria-label="Selected quantity" aria-live="polite">{amount}</output>
    <button type="button" disabled={!limit || amount >= limit} aria-label="Increase quantity" onClick={() => onQuantity(amount + 1)}><span aria-hidden="true">+</span></button>
   </div>
   <button type="button" className="production-secondary" aria-label="Select maximum quantity" disabled={!limit} onClick={() => onQuantity(limit)}>Max</button>
   <button type="button" className="production-primary" disabled={!limit} aria-label={actionLabel} onClick={onSubmit}>{action}</button>
  </div>
 </section>;
}

export function ProductionDialog({title, closeLabel = 'Close details', onClose, children}: {title: string; closeLabel?: string; onClose: () => void; children: React.ReactNode}) {
 const dialog = useRef<HTMLDivElement>(null);
 const close = useRef<HTMLButtonElement>(null);
 useLayoutEffect(() => {
  const previous = document.activeElement as HTMLElement | null;
  const fallback = dialog.current?.closest('.station-menu')?.querySelector<HTMLButtonElement>('.station-menu-close');
  close.current?.focus({preventScroll:true});
  return () => (previous?.isConnected && !previous.matches(':disabled') ? previous : fallback)?.focus({preventScroll:true});
 }, []);
 const onKeyDown = (event: React.KeyboardEvent) => {
  event.stopPropagation();
  if (event.key === 'Escape') { event.preventDefault(); onClose(); return; }
  if (event.key !== 'Tab') return;
  const buttons = dialog.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)');
  if (!buttons?.length) return;
  const first = buttons[0], last = buttons[buttons.length - 1];
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
 };
 return <div className="production-scrim" onClick={onClose}>
  <div ref={dialog} className="production-dialog" role="dialog" aria-modal="true" aria-label={title} onClick={e => e.stopPropagation()} onKeyDown={onKeyDown}>
   <header><h3>{title}</h3><button ref={close} type="button" className="production-icon" aria-label={closeLabel} onClick={onClose}><span aria-hidden="true">×</span></button></header>
   <div className="production-dialog-content">{children}</div>
  </div>
 </div>;
}
