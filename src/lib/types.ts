export type FileStatus = 'uploaded' | 'parsing' | 'ready' | 'error';

export interface ArchiveFileInfo {
  name: string;
  sizeBytes: number;
  type: 'excel' | 'csv' | 'pdf' | 'docx' | 'image' | 'html' | 'other';
  rowsCount?: number;
  columnsCount?: number;
}

export interface UploadedSource {
  id: string;
  name: string;
  type: 'excel' | 'csv' | 'pdf' | 'docx' | 'image' | 'video' | 'url' | 'archive' | 'html';
  sizeBytes?: number;
  url?: string;
  uploadedAt: string;
  status: FileStatus;
  summary?: string;
  fromArchive?: string; // name of parent archive if extracted from ZIP / RAR
  archiveFiles?: ArchiveFileInfo[];
  parsedDataPreview?: {
    columns?: string[];
    sampleRows?: Record<string, any>[];
    textSnippet?: string;
    totalRows?: number;
  };
}

export interface GroundedFact {
  id: string;
  fact: string;
  metric?: string;
  sourceFile: string;
  sourceLocation: string; // e.g., "Лист 'Финансы', строка 42" or "Чек №814"
  quoteOrData: string;
  confidence: 'high' | 'medium';
}

export interface Bottleneck {
  id: string;
  title: string;
  severity: 'critical' | 'warning' | 'info';
  description: string;
  groundedFactIds: string[]; // references to GroundedFact.id
  evidenceSummary: string;
}

export interface ActionRecommendation {
  id: string;
  priority: 'p1_urgent' | 'p2_medium' | 'p3_strategic';
  title: string;
  recommendation: string;
  expectedImpact: string;
  basedOnData: string; // exact proof from user data
  actionSteps: string[];
  sourceFactIds: string[];
}

export interface MissingDataWarning {
  id: string;
  area: string;
  explanation: string;
  whyItMatters: string;
  recommendedAction: string;
}

export interface VideoChapter {
  timeSeconds: number;
  title: string;
  subtitle: string;
  keyMetric?: string;
  highlightText: string;
  sourceRef?: string;
}

export interface VideoOverviewData {
  status: 'pending' | 'generating' | 'ready' | 'custom_uploaded';
  durationSeconds: number;
  videoUrl?: string; // Direct MP4 or blob URL
  audioUrl?: string;
  transcript: string;
  chapters: VideoChapter[];
  notebookLmExportPackage?: {
    notebookTitle: string;
    formattedSources: string;
  };
}

export interface CaseAuditReport {
  caseId: string;
  generatedAt: string;
  summary: {
    businessName: string;
    businessType: string;
    analyzedPeriod: string;
    totalSourcesCount: number;
    healthScore: number; // 0 - 100
    oneSentenceVerdict: string;
  };
  groundedFacts: GroundedFact[];
  bottlenecks: Bottleneck[];
  actionableRecommendations: ActionRecommendation[];
  missingDataWarnings: MissingDataWarning[];
  videoOverview: VideoOverviewData;
}

export interface BusinessCase {
  id: string;
  title: string;
  businessType: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  status: 'draft' | 'analyzing' | 'completed' | 'failed';
  sources: UploadedSource[];
  report?: CaseAuditReport;
}
