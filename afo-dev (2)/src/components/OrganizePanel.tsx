import { useState } from 'react';
import { Card, CardHeader, CardRow, CardFooter } from './ui/Card';
import { SegmentedControl } from './ui/SegmentedControl';
import { Toggle } from './ui/Toggle';
import { Button } from './ui/Button';

type Method = 'extension' | 'date' | 'rename';

export function OrganizePanel() {
  const [directory, setDirectory] = useState<string | null>(null);
  const [method, setMethod] = useState<Method>('extension');
  const [dryRun, setDryRun] = useState(true);

  return (
    <main className="flex-1 overflow-auto px-11 py-9">
      <h1 className="mb-1 text-2xl font-bold tracking-tight text-text">Organize Files</h1>
      <p className="mb-6 text-[13px] text-text-dim">
        Select a directory and choose how to organize your files.
      </p>

      <Card>
        <CardHeader>Source</CardHeader>
        <CardRow>
          <span className="text-[12.5px] text-text-dim">
            {directory ?? 'No directory selected'}
          </span>
          {/* wire to your Tauri dialog command, e.g. invoke('pick_directory') */}
          <Button onClick={() => void 0}>Choose Directory</Button>
        </CardRow>
      </Card>

      <Card>
        <CardHeader>Method</CardHeader>
        <CardRow>
          <SegmentedControl
            value={method}
            onChange={setMethod}
            options={[
              { value: 'extension', label: 'By Extension' },
              { value: 'date', label: 'By Date' },
              { value: 'rename', label: 'Batch Rename' },
            ]}
          />
        </CardRow>
        <CardRow>
          <span className="text-[13.5px] font-medium text-text">Preview only (dry run)</span>
          <Toggle checked={dryRun} onChange={setDryRun} label="Preview only" />
        </CardRow>
      </Card>

      <Card>
        <CardHeader>Preview</CardHeader>
        <div className="px-[18px] py-6 text-center text-[13px] text-text-dim">
          {directory ? 'Scanning…' : 'Choose a directory to see what will change.'}
        </div>
        <CardFooter>
          <Button variant="ghost">Scan</Button>
          <Button variant="primary">Execute</Button>
        </CardFooter>
      </Card>
    </main>
  );
}
