import { BusinessCase, UploadedSource, CaseAuditReport } from './types';
import { initialCases } from './sampleCases';
import fs from 'fs';
import path from 'path';

const DATA_FILE_PATH = path.join(process.cwd(), 'data_storage.json');
const TMP_DATA_FILE_PATH = path.join('/tmp', 'data_storage.json');

// Vercel KV & Upstash Redis credentials
const KV_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const KV_KEY = 'platform_business_cases_v1';

class StorageManager {
  private cases: Map<string, BusinessCase> = new Map();
  private hasInitializedCloud = false;
  private isSyncing = false;

  constructor() {
    // 1. Initial local load
    this.loadFromDisk();
    if (this.cases.size === 0) {
      initialCases.forEach(c => this.cases.set(c.id, c));
      this.saveToDisk();
    }

    // 2. Trigger async cloud hydration if Vercel KV credentials present
    if (this.isCloudConfigured()) {
      this.syncFromCloud().catch(err => {
        console.warn('[StorageManager] Cloud init error:', err);
      });
    }
  }

  public isCloudConfigured(): boolean {
    return Boolean(KV_URL && KV_TOKEN);
  }

  public getStorageProvider(): 'vercel_kv' | 'local_disk' | 'read_only_fallback' {
    if (this.isCloudConfigured()) return 'vercel_kv';
    try {
      fs.accessSync(process.cwd(), fs.constants.W_OK);
      return 'local_disk';
    } catch {
      return 'read_only_fallback';
    }
  }

  // --- CLOUD SYNC (VERCEL KV / UPSTASH) ---
  public async syncFromCloud(): Promise<void> {
    if (!this.isCloudConfigured() || this.isSyncing) return;
    this.isSyncing = true;
    try {
      const url = `${KV_URL}/get/${KV_KEY}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${KV_TOKEN}` },
        cache: 'no-store'
      });

      if (res.ok) {
        const json = await res.json();
        let rawData = json?.result;
        if (typeof rawData === 'string') {
          try { rawData = JSON.parse(rawData); } catch {}
        }

        if (Array.isArray(rawData) && rawData.length > 0) {
          rawData.forEach((c: BusinessCase) => {
            if (c?.id) this.cases.set(c.id, c);
          });
          this.hasInitializedCloud = true;
          this.saveToDisk();
        } else if (this.cases.size > 0) {
          // Cloud store is empty on first deployment, seed it with current cases
          await this.saveToCloud();
          this.hasInitializedCloud = true;
        }
      }
    } catch (err) {
      console.warn('[StorageManager] Failed to fetch from Vercel KV:', err);
    } finally {
      this.isSyncing = false;
    }
  }

  public async saveToCloud(): Promise<boolean> {
    if (!this.isCloudConfigured()) return false;
    try {
      const payload = JSON.stringify(Array.from(this.cases.values()));
      const url = `${KV_URL}/set/${KV_KEY}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${KV_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      return res.ok;
    } catch (err) {
      console.error('[StorageManager] Failed to save to Vercel KV:', err);
      return false;
    }
  }

  // --- LOCAL DISK LOAD & SAVE ---
  private loadFromDisk() {
    // Check cwd first
    try {
      if (fs.existsSync(DATA_FILE_PATH)) {
        const raw = fs.readFileSync(DATA_FILE_PATH, 'utf-8');
        const parsed: BusinessCase[] = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          parsed.forEach(c => this.cases.set(c.id, c));
          return;
        }
      }
    } catch (err) {
      console.warn('Could not read data_storage.json from cwd:', err);
    }

    // Check /tmp if in serverless environment
    try {
      if (fs.existsSync(TMP_DATA_FILE_PATH)) {
        const raw = fs.readFileSync(TMP_DATA_FILE_PATH, 'utf-8');
        const parsed: BusinessCase[] = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          parsed.forEach(c => this.cases.set(c.id, c));
        }
      }
    } catch {}
  }

  private saveToDisk() {
    const arr = Array.from(this.cases.values());
    const dataStr = JSON.stringify(arr, null, 2);

    // Try cwd
    try {
      fs.writeFileSync(DATA_FILE_PATH, dataStr, 'utf-8');
      return;
    } catch (err: any) {
      // If read-only filesystem (standard on Vercel), write to /tmp
      try {
        fs.writeFileSync(TMP_DATA_FILE_PATH, dataStr, 'utf-8');
      } catch {}
    }
  }

  // --- PUBLIC API ---
  public async ensureFresh(): Promise<void> {
    if (this.isCloudConfigured() && !this.hasInitializedCloud) {
      await this.syncFromCloud();
    }
  }

  public getAllCases(): BusinessCase[] {
    this.loadFromDisk();
    return Array.from(this.cases.values()).sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }

  public async getAllCasesAsync(): Promise<BusinessCase[]> {
    await this.ensureFresh();
    return this.getAllCases();
  }

  public getCaseById(id: string): BusinessCase | undefined {
    this.loadFromDisk();
    return this.cases.get(id);
  }

  public async getCaseByIdAsync(id: string): Promise<BusinessCase | undefined> {
    await this.ensureFresh();
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
    this.saveToCloud();
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
    this.saveToCloud();
    return newSource;
  }

  public updateCaseReport(caseId: string, report: CaseAuditReport): BusinessCase | null {
    const c = this.cases.get(caseId);
    if (!c) return null;

    c.report = report;
    c.status = 'completed';
    c.updatedAt = new Date().toISOString();
    this.saveToDisk();
    this.saveToCloud();
    return c;
  }

  public updateCaseStatus(caseId: string, status: BusinessCase['status']): BusinessCase | null {
    const c = this.cases.get(caseId);
    if (!c) return null;

    c.status = status;
    c.updatedAt = new Date().toISOString();
    this.saveToDisk();
    this.saveToCloud();
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
    this.saveToCloud();
    return c;
  }

  public updateCasePipelineProject(caseId: string, project: import('./videoPipelineTypes').VideoPipelineProject): BusinessCase | null {
    const c = this.cases.get(caseId);
    if (!c) return null;

    c.pipelineProject = project;
    c.updatedAt = new Date().toISOString();
    this.saveToDisk();
    this.saveToCloud();
    return c;
  }

  public deleteCase(caseId: string): boolean {
    const deleted = this.cases.delete(caseId);
    if (deleted) {
      this.saveToDisk();
      this.saveToCloud();
    }
    return deleted;
  }
}

export const storage = new StorageManager();
