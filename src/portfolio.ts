import { readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { analyze } from './analyzers/index.js';
import { evaluateConformance } from './conformance.js';
import type { AnalysisResult } from './types.js';

export interface PortfolioRepoResult {
  path: string;
  score: number;
  grade: string;
  level: number;
  findings: number;
  critical: number;
  alwaysLoadedTokens: number;
  estimatedMonthlyTokenWaste: number;
  estimatedMonthlyCostWaste: number;
}

export interface PortfolioResult {
  rootPath: string;
  repos: PortfolioRepoResult[];
  totals: {
    repos: number;
    findings: number;
    critical: number;
    estimatedMonthlyTokenWaste: number;
    estimatedMonthlyCostWaste: number;
  };
}

export async function scanPortfolio(rootPath: string): Promise<PortfolioResult> {
  const root = resolve(rootPath);
  const entries = await readdir(root, { withFileTypes: true });
  const dirs = entries.filter(e => e.isDirectory() && !e.name.startsWith('.') && e.name !== 'node_modules')
    .map(e => join(root, e.name));

  const repos: PortfolioRepoResult[] = [];
  for (const dir of dirs) {
    const result: AnalysisResult = await analyze({ repoPath: dir });
    if (result.discovery.files.length === 0) continue;
    const conformance = evaluateConformance(result);
    repos.push({
      path: dir,
      score: result.score.overall,
      grade: result.score.grade,
      level: conformance.level,
      findings: result.findings.length,
      critical: result.score.criticalCount,
      alwaysLoadedTokens: result.discovery.alwaysLoadedTokens,
      estimatedMonthlyTokenWaste: result.score.estimatedMonthlyTokenWaste,
      estimatedMonthlyCostWaste: result.score.estimatedMonthlyCostWaste,
    });
  }

  return {
    rootPath: root,
    repos,
    totals: {
      repos: repos.length,
      findings: repos.reduce((sum, r) => sum + r.findings, 0),
      critical: repos.reduce((sum, r) => sum + r.critical, 0),
      estimatedMonthlyTokenWaste: repos.reduce((sum, r) => sum + r.estimatedMonthlyTokenWaste, 0),
      estimatedMonthlyCostWaste: repos.reduce((sum, r) => sum + r.estimatedMonthlyCostWaste, 0),
    },
  };
}
