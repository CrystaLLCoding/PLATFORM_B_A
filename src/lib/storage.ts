import { BusinessCase, UploadedSource, CaseAuditReport } from './types';
import { initialCases } from './sampleCases';
import fs from 'fs';
import path from 'path';

const DATA_FILE_PATH = path.join(process.cwd(), 'data_storage.json');

class StorageManager {
  private cases: Map<string, BusinessCase> = new Map();

  constructor() {
    this.loadFromDisk();
    if (this.cases.size === 0) {
      initialCases.forEach(c => this.cases.set(c.id, c));
      this.saveToDisk();
    }
  }

  private loadFromDisk() {
    try {
      if (fs.existsSync(DATA_FILE_PATH)) {
        const raw = fs.readFileSync(DATA_FILE_PATH, 'utf-8');
        const parsed: BusinessCase[] = JSON.parse(raw);
        parsed.forEach(c => this.cases.set(c.id, c));
      }
    } catch (err) {
      console.warn('Could not load data_storage.json, falling back to memory/samples', err);
    }
  }

  private saveToDisk() {
    try {
      const arr = Array.from(this.cases.values());
      fs.writeFileSync(DATA_FILE_PATH, JSON.stringify(arr, null, 2), 'utf-8');
    } catch (err) {
      console.warn('Could not save data_storage.json', err);
    }
  }

  public getAllCases(): BusinessCase[] {
    this.loadFromDisk();
    return Array.from(this.cases.values()).sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }

  public getCaseById(id: string): BusinessCase | undefined {
    this.loadFromDisk();
    return this.cases.get(id);
  }

  public createCase(title: string, businessType: string, description?: string): BusinessCase {
    const id = 'case-' + Date.now().toString(36) + Math.random().toString(36).substr(2, 4);
    const now = new Date().toISOString();
    const newCase: BusinessCase = {
      id,
      title,
      businessType,
      description: description || '',
      createdAt: now,
      updatedAt: now,
      status: 'draft',
      sources: []
    };
    this.cases.set(id, newCase);
    this.saveToDisk();
    return newCase;
  }

  public addSourceToCase(caseId: string, source: Omit<UploadedSource, 'id' | 'uploadedAt' | 'status'>): UploadedSource | null {
    const c = this.cases.get(caseId);
    if (!c) return null;

    const newSource: UploadedSource = {
      ...source,
      id: 'src-' + Date.now().toString(36) + Math.random().toString(36).substr(2, 4),
      uploadedAt: new Date().toISOString(),
      status: 'ready'
    };

    c.sources.push(newSource);
    c.updatedAt = new Date().toISOString();
    this.saveToDisk();
    return newSource;
  }

  public updateCaseReport(caseId: string, report: CaseAuditReport): BusinessCase | null {
    const c = this.cases.get(caseId);
    if (!c) return null;

    c.report = report;
    c.status = 'completed';
    c.updatedAt = new Date().toISOString();
    this.saveToDisk();
    return c;
  }

  public updateCaseStatus(caseId: string, status: BusinessCase['status']): BusinessCase | null {
    const c = this.cases.get(caseId);
    if (!c) return null;

    c.status = status;
    c.updatedAt = new Date().toISOString();
    this.saveToDisk();
    return c;
  }

  public attachVideoToCase(caseId: string, videoUrl: string, durationSeconds?: number): BusinessCase | null {
    const c = this.cases.get(caseId);
    if (!c || !c.report) return null;

    c.report.videoOverview.videoUrl = videoUrl;
    c.report.videoOverview.status = 'custom_uploaded';
    if (durationSeconds) {
      c.report.videoOverview.durationSeconds = durationSeconds;
    }
    c.updatedAt = new Date().toISOString();
    this.saveToDisk();
    return c;
  }
}

export const storage = new StorageManager();
