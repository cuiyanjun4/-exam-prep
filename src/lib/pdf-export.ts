'use client';

/**
 * PDF Export Utility - 使用浏览器打印功能生成PDF
 * 无需额外依赖，利用 window.print() 和 CSS @media print
 */

interface ExportQuestion {
  content: string;
  options: { key: string; text: string }[];
  answer: string;
  explanation: string;
  module: string;
  subType: string;
}

export function exportToPDF(
  title: string,
  questions: ExportQuestion[],
  options?: { showAnswers?: boolean; showExplanations?: boolean }
) {
  const { showAnswers = true, showExplanations = true } = options || {};

  const html = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: "Microsoft YaHei", "SimHei", Arial, sans-serif; color: #1e293b; padding: 40px; line-height: 1.6; }
    h1 { text-align: center; font-size: 22px; margin-bottom: 8px; }
    .subtitle { text-align: center; color: #64748b; font-size: 13px; margin-bottom: 30px; }
    .question { margin-bottom: 24px; page-break-inside: avoid; }
    .q-header { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
    .q-num { font-weight: bold; color: #3b82f6; font-size: 14px; }
    .q-tag { display: inline-block; padding: 1px 8px; border-radius: 4px; font-size: 11px; background: #eff6ff; color: #3b82f6; }
    .q-content { font-size: 14px; margin-bottom: 8px; }
    .q-options { margin-left: 16px; }
    .q-option { font-size: 13px; margin-bottom: 3px; }
    .q-option.correct { color: #16a34a; font-weight: bold; }
    .answer-section { margin-top: 8px; padding: 8px 12px; background: #f0fdf4; border-radius: 6px; border-left: 3px solid #22c55e; }
    .answer-label { font-size: 12px; font-weight: bold; color: #16a34a; }
    .explanation { font-size: 12px; color: #475569; margin-top: 4px; }
    .divider { border: none; border-top: 1px dashed #e2e8f0; margin: 16px 0; }
    .footer { text-align: center; color: #94a3b8; font-size: 11px; margin-top: 40px; padding-top: 16px; border-top: 1px solid #e2e8f0; }
    @media print {
      body { padding: 20px; }
      .question { page-break-inside: avoid; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <div class="subtitle">共 ${questions.length} 题 | 导出时间：${new Date().toLocaleDateString('zh-CN')} | 考公行测题库</div>

  ${questions.map((q, i) => `
    <div class="question">
      <div class="q-header">
        <span class="q-num">${i + 1}.</span>
        <span class="q-tag">${q.module}</span>
        <span class="q-tag" style="background:#f8fafc;color:#64748b;">${q.subType}</span>
      </div>
      <div class="q-content">${q.content}</div>
      <div class="q-options">
        ${q.options.map(opt => `
          <div class="q-option ${showAnswers && opt.key === q.answer ? 'correct' : ''}">
            ${opt.key}. ${opt.text}${showAnswers && opt.key === q.answer ? ' ✓' : ''}
          </div>
        `).join('')}
      </div>
      ${showAnswers ? `
        <div class="answer-section">
          <span class="answer-label">正确答案：${q.answer}</span>
          ${showExplanations ? `<div class="explanation">${q.explanation}</div>` : ''}
        </div>
      ` : ''}
    </div>
    ${i < questions.length - 1 ? '<hr class="divider">' : ''}
  `).join('')}

  <div class="footer">
    📘 考公行测题库 - 智能学习提分系统 | cuiyanjun1.me
  </div>

  <div class="no-print" style="text-align:center;margin-top:20px;">
    <button onclick="window.print()" style="padding:10px 32px;background:#3b82f6;color:white;border:none;border-radius:8px;font-size:16px;cursor:pointer;">
      🖨️ 打印 / 保存PDF
    </button>
    <button onclick="window.close()" style="padding:10px 32px;background:#e2e8f0;color:#475569;border:none;border-radius:8px;font-size:16px;cursor:pointer;margin-left:12px;">
      关闭
    </button>
  </div>
</body>
</html>
  `;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
  }
}

// Quick export for mistakes
export function exportMistakes(mistakes: ExportQuestion[]) {
  exportToPDF('❌ 错题本导出', mistakes, { showAnswers: true, showExplanations: true });
}

// Quick export for favorites
export function exportFavorites(favorites: ExportQuestion[]) {
  exportToPDF('⭐ 收藏题目导出', favorites, { showAnswers: true, showExplanations: true });
}

// Export as practice (no answers)
export function exportPractice(questions: ExportQuestion[], title: string = '练习题导出') {
  exportToPDF(title, questions, { showAnswers: false, showExplanations: false });
}
