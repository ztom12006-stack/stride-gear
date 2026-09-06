import { useState } from 'react';
import type { State } from '@/lib/model';
import { validState } from '@/lib/state-validation';
export default function BackupControls({state, saving, restore}: {state: State; saving: boolean; restore: (s: State) => Promise<boolean>}) {
  const [pending, setPending] = useState<State | null>(null);
  const [error, setError] = useState('');
  return <div className="demo-notice">
    <p>记录与图片仅保存在当前浏览器，不会与其他人共享。清理浏览器数据会删除记录，请定期导出备份。</p>
    <button className="outline" disabled={saving} onClick={() => {
      const url = URL.createObjectURL(new Blob([JSON.stringify({format: 'stride-gear', version: 1, state})], {type:'application/json'}));
      const a = document.createElement('a'); a.href = url; a.download = 'stride-backup-' + new Date().toISOString().slice(0,10) + '.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    }}>导出备份</button>{' '}
    <label>选择备份恢复 <input type="file" accept=".json,application/json" disabled={saving} onChange={async e => {
      const file = e.target.files?.[0]; e.target.value = ''; setError(''); setPending(null);
      if (!file) return;
      try {
        if (file.size > 100 * 1024 * 1024) throw Error('备份文件请小于 100 MB。');
        const data = JSON.parse(await file.text());
        if (data.format !== 'stride-gear' || data.version !== 1 || !validState(data.state)) throw Error('备份格式不正确或数据不完整。');
        setPending(data.state);
      } catch (err) { setError((err as Error).message); }
    }} /></label>
    {pending && <p>将用备份中的 {pending.gear.length} 件装备、{pending.workouts.length} 条运动记录替换当前记录。建议先导出当前备份。{' '}
      <button className="outline" disabled={saving} onClick={async () => { if (await restore(pending)) setPending(null); }}>确认恢复</button>{' '}
      <button className="outline" disabled={saving} onClick={() => setPending(null)}>取消</button>
    </p>}
    {error && <p role="alert">{error}</p>}
  </div>;
}
