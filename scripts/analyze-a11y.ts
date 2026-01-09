#!/usr/bin/env tsx

/**
 * Script for analyzing accessibility issues in the codebase
 * Generates a detailed report with violations and recommendations
 */

import { glob } from 'glob';
import { readFileSync } from 'fs';
import { join } from 'path';

interface A11yIssue {
  file: string;
  line: number;
  type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  recommendation: string;
  code?: string;
}

const issues: A11yIssue[] = [];

// Patterns to check
const patterns = [
  {
    regex: /<button[^>]*>(?!.*aria-label)(?!.*\w+).*<(?:svg|[A-Z])/g,
    type: 'button-without-label',
    severity: 'high' as const,
    description: 'Button with icon but no accessible label',
    recommendation: 'Add aria-label or visible text to button',
  },
  {
    regex: /<img(?![^>]*alt=)/g,
    type: 'img-without-alt',
    severity: 'critical' as const,
    description: 'Image without alt attribute',
    recommendation: 'Add alt attribute to image',
  },
  {
    regex: /<div[^>]*onClick=(?![^>]*role=)/g,
    type: 'div-with-onclick',
    severity: 'high' as const,
    description: 'Div with onClick but no role',
    recommendation: 'Use button element or add role="button" and tabIndex={0}',
  },
  {
    regex: /<input(?![^>]*aria-label)(?![^>]*id=)/g,
    type: 'input-without-label',
    severity: 'high' as const,
    description: 'Input without label or aria-label',
    recommendation: 'Add label with htmlFor or aria-label attribute',
  },
  {
    regex: /color:\s*["'](?:red|blue|green|yellow)["']/g,
    type: 'hardcoded-color',
    severity: 'medium' as const,
    description: 'Hardcoded color value',
    recommendation: 'Use design tokens or CSS variables for colors',
  },
  {
    regex: /<[^>]*tabIndex=["']?[1-9]/g,
    type: 'positive-tabindex',
    severity: 'medium' as const,
    description: 'Positive tabIndex found',
    recommendation: 'Avoid positive tabIndex values; use natural tab order',
  },
];

async function analyzeFile(filePath: string) {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    patterns.forEach((pattern) => {
      let match;
      const regex = new RegExp(pattern.regex);

      lines.forEach((line, index) => {
        regex.lastIndex = 0;
        if (regex.test(line)) {
          issues.push({
            file: filePath.replace(process.cwd(), ''),
            line: index + 1,
            type: pattern.type,
            severity: pattern.severity,
            description: pattern.description,
            recommendation: pattern.recommendation,
            code: line.trim(),
          });
        }
      });
    });
  } catch (error) {
    console.error(`Error analyzing ${filePath}:`, error);
  }
}

async function main() {
  console.log('🔍 Analyzing accessibility issues...\n');

  const files = await glob('client/src/**/*.{ts,tsx}', {
    ignore: ['**/node_modules/**', '**/dist/**'],
    cwd: process.cwd(),
  });

  console.log(`Found ${files.length} files to analyze\n`);

  for (const file of files) {
    await analyzeFile(join(process.cwd(), file));
  }

  // Generate report
  console.log('📊 ACCESSIBILITY AUDIT REPORT');
  console.log('═'.repeat(80));
  console.log('');

  const criticalIssues = issues.filter((i) => i.severity === 'critical');
  const highIssues = issues.filter((i) => i.severity === 'high');
  const mediumIssues = issues.filter((i) => i.severity === 'medium');
  const lowIssues = issues.filter((i) => i.severity === 'low');

  console.log('📈 SUMMARY');
  console.log('─'.repeat(80));
  console.log(`Total Issues: ${issues.length}`);
  console.log(`  Critical: ${criticalIssues.length}`);
  console.log(`  High:     ${highIssues.length}`);
  console.log(`  Medium:   ${mediumIssues.length}`);
  console.log(`  Low:      ${lowIssues.length}`);
  console.log('');

  // Group by type
  const byType = issues.reduce((acc, issue) => {
    acc[issue.type] = (acc[issue.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  console.log('🔤 ISSUES BY TYPE');
  console.log('─'.repeat(80));
  Object.entries(byType)
    .sort(([, a], [, b]) => b - a)
    .forEach(([type, count]) => {
      console.log(`  ${type.padEnd(30)} ${count}`);
    });
  console.log('');

  // Group by file
  const byFile = issues.reduce((acc, issue) => {
    acc[issue.file] = (acc[issue.file] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  console.log('📁 TOP 10 FILES WITH MOST ISSUES');
  console.log('─'.repeat(80));
  Object.entries(byFile)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .forEach(([file, count]) => {
      console.log(`  ${count.toString().padStart(3)} - ${file}`);
    });
  console.log('');

  // Show critical issues
  if (criticalIssues.length > 0) {
    console.log('🚨 CRITICAL ISSUES (First 10)');
    console.log('─'.repeat(80));
    criticalIssues.slice(0, 10).forEach((issue, idx) => {
      console.log(`${idx + 1}. ${issue.file}:${issue.line}`);
      console.log(`   Type: ${issue.type}`);
      console.log(`   Issue: ${issue.description}`);
      console.log(`   Fix: ${issue.recommendation}`);
      if (issue.code) {
        console.log(`   Code: ${issue.code.substring(0, 100)}${issue.code.length > 100 ? '...' : ''}`);
      }
      console.log('');
    });
  }

  // Calculate score
  const totalChecks = files.length * patterns.length;
  const score = Math.max(0, Math.round(((totalChecks - issues.length) / totalChecks) * 100));

  console.log('🎯 ACCESSIBILITY SCORE');
  console.log('─'.repeat(80));
  console.log(`Score: ${score}/100`);
  console.log('');

  if (score >= 90) {
    console.log('✅ Excellent! Your codebase has very few accessibility issues.');
  } else if (score >= 70) {
    console.log('⚠️  Good, but there is room for improvement.');
  } else if (score >= 50) {
    console.log('⚠️  Fair. Please address the critical and high priority issues.');
  } else {
    console.log('❌ Poor. Immediate action required to improve accessibility.');
  }

  console.log('');
  console.log('💡 RECOMMENDATIONS');
  console.log('─'.repeat(80));
  console.log('1. Fix all critical issues immediately');
  console.log('2. Address high priority issues in the next sprint');
  console.log('3. Run automated tests: npm run test:a11y');
  console.log('4. Use ESLint with jsx-a11y plugin: npm run lint');
  console.log('5. Test with screen readers (NVDA, JAWS, VoiceOver)');
  console.log('6. Verify keyboard navigation on all pages');
  console.log('7. Check color contrast ratios (minimum 4.5:1)');
  console.log('');

  process.exit(issues.length > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
