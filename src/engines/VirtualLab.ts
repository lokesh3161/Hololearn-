export interface DataPoint {
  time: number;
  [key: string]: number;
}

export interface ExperimentState {
  hypothesis: string;
  isLogging: boolean;
  dataLog: DataPoint[];
  startTime: number;
}

export class VirtualLabLogger {
  private log: DataPoint[] = [];
  private isLogging: boolean = false;
  private startTime: number = 0;
  private hypothesis: string = '';

  startLogging(hypothesis: string = 'Observe live physical parameters over time') {
    this.hypothesis = hypothesis;
    this.log = [];
    this.isLogging = true;
    this.startTime = performance.now();
  }

  stopLogging() {
    this.isLogging = false;
  }

  clearLog() {
    this.log = [];
  }

  recordDataPoint(metrics: Record<string, number>) {
    if (!this.isLogging) return;
    const time = (performance.now() - this.startTime) / 1000;
    this.log.push({
      time: Number(time.toFixed(3)),
      ...metrics,
    });
  }

  getDataLog(): DataPoint[] {
    return this.log;
  }

  getHypothesis(): string {
    return this.hypothesis;
  }

  exportToCSV(filename: string = 'hololearn_lab_data.csv'): string {
    if (this.log.length === 0) return '';

    const headers = Object.keys(this.log[0]);
    const csvRows: string[] = [];

    // Header row
    csvRows.push(headers.join(','));

    // Data rows
    for (const row of this.log) {
      const values = headers.map((header) => {
        const val = row[header];
        return typeof val === 'number' ? val.toFixed(4) : val;
      });
      csvRows.push(values.join(','));
    }

    const csvContent = csvRows.join('\n');

    // Trigger browser download
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }

    return csvContent;
  }
}

export const virtualLab = new VirtualLabLogger();
