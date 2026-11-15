import { useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Check, Copy, Download, X } from 'lucide-react';
import type { Expense } from '../lib/expenses';
import { formatDate, formatRand } from '../lib/expenses';

type Props = { dateKey: string; expenses: Expense[]; total: number; onClose: () => void };

export function ShareReceipt({ dateKey, expenses, total, onClose }: Props) {
  const [copied, setCopied] = useState(false);
  const receiptText = `Daymark · ${formatDate(dateKey)}\n${expenses.map((item) => `${item.name}  ${formatRand(item.amount)}`).join('\n')}${expenses.length ? '\n' : ''}Total  ${formatRand(total)}\n\nTracked on Daymark`;

  async function copyReceipt() {
    try {
      await navigator.clipboard.writeText(receiptText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      const area = document.createElement('textarea');
      area.value = receiptText;
      document.body.append(area);
      area.select();
      document.execCommand('copy');
      area.remove();
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    }
  }

  function downloadReceipt() {
    const canvas = document.createElement('canvas');
    canvas.width = 900;
    canvas.height = Math.max(520, 340 + expenses.length * 58);
    const context = canvas.getContext('2d');
    if (!context) return;
    context.fillStyle = '#f6f1e6';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = '#315f50';
    context.fillRect(0, 0, canvas.width, 13);
    context.fillStyle = '#315f50';
    context.font = '600 25px Arial';
    context.fillText('daymark.', 66, 82);
    context.fillStyle = '#4b5148';
    context.font = '20px Arial';
    context.fillText(formatDate(dateKey), 66, 128);
    context.strokeStyle = '#d9d1c1';
    context.beginPath(); context.moveTo(66, 161); context.lineTo(834, 161); context.stroke();
    let y = 211;
    context.font = '22px Arial';
    expenses.forEach((item) => {
      context.fillStyle = '#263b32';
      context.fillText(item.name.slice(0, 44), 66, y);
      context.textAlign = 'right';
      context.fillText(formatRand(item.amount), 834, y);
      context.textAlign = 'left';
      y += 56;
    });
    context.strokeStyle = '#d9d1c1';
    context.beginPath(); context.moveTo(66, y - 8); context.lineTo(834, y - 8); context.stroke();
    context.fillStyle = '#315f50';
    context.font = '600 27px Arial';
    context.fillText('Total', 66, y + 43);
    context.textAlign = 'right';
    context.fillText(formatRand(total), 834, y + 43);
    context.textAlign = 'left';
    context.fillStyle = '#73796e';
    context.font = '17px Arial';
    context.fillText('Tracked on Daymark', 66, canvas.height - 48);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `daymark-${dateKey}.png`;
      link.click();
      URL.revokeObjectURL(url);
    }, 'image/png');
  }

  return (
    <DialogPrimitive.Root open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="dialog-backdrop" />
        <DialogPrimitive.Content className="share-dialog" aria-labelledby="share-title" data-testid="dialog-share-receipt">
          <div className="dialog-head">
            <div><span className="section-kicker">A SMALL RECORD OF THE DAY</span><DialogPrimitive.Title id="share-title">Share your day</DialogPrimitive.Title></div>
            <DialogPrimitive.Close asChild>
              <button className="icon-button" type="button" aria-label="Close receipt preview" data-testid="button-close-share"><X size={18} /></button>
            </DialogPrimitive.Close>
          </div>
          <div className="receipt-paper">
            <div className="receipt-brand">daymark<span>.</span></div>
            <p className="receipt-date">{formatDate(dateKey)}</p>
            <div className="receipt-items">
              {expenses.length ? expenses.map((item) => <div className="receipt-line" key={item.id}><span>{item.name}</span><strong>{formatRand(item.amount)}</strong></div>) : <p className="receipt-empty">A quiet day, with nothing noted yet.</p>}
            </div>
            <div className="receipt-total"><span>Total</span><strong>{formatRand(total)}</strong></div>
            <p className="receipt-foot">Tracked on Daymark</p>
          </div>
          <div className="receipt-actions">
            <button type="button" className="secondary-button" onClick={copyReceipt} data-testid="button-copy-receipt">{copied ? <Check size={15} /> : <Copy size={15} />}{copied ? 'Copied' : 'Copy text'}</button>
            <button type="button" className="add-button" onClick={downloadReceipt} data-testid="button-download-receipt"><Download size={15} />Download PNG</button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
