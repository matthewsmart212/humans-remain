import React, {useEffect, useId, useLayoutEffect, useRef, useState} from 'react';
import {BAG_IMAGES} from './backpack';
import './production-menu.css';

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

type ProductionRecipeProps = {
 name: string; image: string; detail: string; blocked: string; disabled?: boolean;
 action: string; actionLabel: string;
 onDetails: () => void; onSubmit: () => void;
};

export function ProductionRecipe({name, image, detail, blocked, disabled = !!blocked, action, actionLabel, onDetails, onSubmit}: ProductionRecipeProps) {
 const summaryId = useId();
 return <li className="production-recipe">
  <button type="button" className="production-recipe-info" aria-label={`About ${name.toLowerCase()}`} aria-haspopup="dialog" aria-describedby={summaryId} onClick={onDetails}>
   <img src={image} alt="" />
   <span><strong>{name}<span className="production-disclosure" aria-hidden="true">›</span></strong><small id={summaryId} data-blocked={!!blocked || undefined}>{blocked || detail}</small></span>
  </button>
  <button type="button" className="production-primary" disabled={disabled} aria-label={actionLabel} aria-describedby={summaryId} onClick={onSubmit}>{action}</button>
 </li>;
}

type BatchProps = {
 name: string; action: string; limit: number; blocked: string;
 actionLabel: (n: number) => string; onSubmit: (n: number) => void;
};

export function ProductionBatch({name, action, limit, blocked, actionLabel, onSubmit}: BatchProps) {
 const [chosen, setChosen] = useState(1);
 const amount = Math.max(1, Math.min(limit, chosen));
 useEffect(() => {if (chosen !== amount) setChosen(amount);}, [chosen, amount]);
 return <div className="production-batch">
  {limit > 1 && <label>Quantity<select className="production-quantity" aria-label={`Quantity for ${name.toLowerCase()}`}
   value={amount} onChange={e => setChosen(Number(e.currentTarget.value))}>
   {Array.from({length: limit}, (_,i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}
  </select></label>}
  {blocked && <span data-blocked="true">{blocked}</span>}
  <button type="button" className="production-primary" disabled={!limit} aria-label={actionLabel(amount)}
   onClick={() => onSubmit(amount)}>{action}{amount > 1 ? ` ×${amount}` : ''}</button>
 </div>;
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
  const buttons = dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled), select:not(:disabled)');
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
