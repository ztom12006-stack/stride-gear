import { useEffect, useState, type FormEvent } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { sports, type SavedOutfit } from '@/lib/model';

export function OutfitSaveDialog({
  open,
  defaultSport,
  itemCount,
  onClose,
  onSave,
}: {
  open: boolean;
  defaultSport: string;
  itemCount: number;
  onClose: () => void;
  onSave: (input: Pick<SavedOutfit, 'name' | 'sport' | 'note'>) => void;
}) {
  const [name, setName] = useState('');
  const [sport, setSport] = useState(defaultSport);
  const [note, setNote] = useState('');
  useEffect(() => { if (open) { setName(''); setSport(defaultSport); setNote(''); } }, [open, defaultSport]);
  function submit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    onSave({ name: name.trim(), sport, note: note.trim() || undefined });
  }
  return <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
    <DialogContent className="outfit-dialog">
      <DialogTitle>保存这套搭配</DialogTitle>
      <DialogDescription>会记住当前人物比例、配色和已选装备，之后可继续编辑或做成分享卡。</DialogDescription>
      <form onSubmit={submit} className="outfit-save-form">
        <label>套装名称<input autoFocus maxLength={200} placeholder="例如：周末 10K 轻装" value={name} onChange={(event) => setName(event.target.value)} /></label>
        <label>运动项目<select value={sport} onChange={(event) => setSport(event.target.value)}>{sports.map((item) => <option value={item} key={item}>{item}</option>)}</select></label>
        <label>一句说明（可选）<textarea maxLength={200} placeholder="适合什么天气、路线或心情？" value={note} onChange={(event) => setNote(event.target.value)} /></label>
        <p className="outfit-save-hint">已选 {itemCount} 件装备</p>
        <div className="dialog-actions"><button type="button" className="outline" onClick={onClose}>取消</button><button className="primary" type="submit" disabled={!name.trim() || !itemCount}>保存套装</button></div>
      </form>
    </DialogContent>
  </Dialog>;
}
