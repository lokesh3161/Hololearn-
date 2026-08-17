import { useState, useCallback } from 'react';

export function useDataLogger<T extends Record<string, any>>(columns: string[]) {
  const [rows, setRows] = useState<(T & { timestamp: string })[]>([]);

  const record = useCallback((data: T) => {
    setRows((prev) => [...prev, { ...data, timestamp: new Date().toLocaleTimeString() }]);
  }, []);

  const clear = useCallback(() => setRows([]), []);

  const exportCSV = useCallback(() => {
    if (rows.length === 0) return;
    const header = [...columns, 'timestamp'].join(',');
    const body = rows
      .map((r) => columns.map((c) => r[c as keyof T] ?? '').join(','))
      .join('\n');
    const blob = new Blob([header + '\n' + body], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'lab-data.csv';
    a.click();
    URL.revokeObjectURL(url);
  }, [rows, columns]);

  return { rows, record, clear, exportCSV };
}
