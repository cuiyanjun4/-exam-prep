/**
 * PDF 真实文本提取器
 * 使用 pdf.js 从 PDF 文件中提取文本和检测图片
 * 
 * 功能：
 * 1. 逐页提取文本内容
 * 2. 检测页面中的图片资源（判断是否为含图题）
 * 3. 保留文本排版结构（用于后续题目解析）
 * 4. 支持 File 对象和 ArrayBuffer 输入
 */

import type { TextItem, TextMarkedContent } from 'pdfjs-dist/types/src/display/api';

// ==================== 类型定义 ====================
export interface PDFPageResult {
  pageNum: number;
  text: string;
  /** 该页是否包含图片/图形对象 */
  hasImages: boolean;
  /** 检测到的图片数量 */
  imageCount: number;
}

export interface PDFExtractResult {
  /** 合并后的全文文本 */
  fullText: string;
  /** 逐页结果 */
  pages: PDFPageResult[];
  /** 总页数 */
  totalPages: number;
  /** 含图片的页面 */
  pagesWithImages: number[];
  /** PDF 元信息 */
  metadata?: {
    title?: string;
    author?: string;
    subject?: string;
  };
}

export interface ExtractionProgress {
  currentPage: number;
  totalPages: number;
  percent: number;
  status: string;
}

// ==================== 核心提取逻辑 ====================

/**
 * 动态加载 pdf.js（避免 SSR 问题）
 */
async function loadPdfjs() {
  const pdfjsLib = await import('pdfjs-dist');
  
  // 设置 worker（使用内联 worker 避免路径问题）
  if (typeof window !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
  }
  
  return pdfjsLib;
}

/**
 * 判断 TextItem 是否为 TextItem（而非 TextMarkedContent）
 */
function isTextItem(item: TextItem | TextMarkedContent): item is TextItem {
  return 'str' in item;
}

/**
 * 从 File 对象提取 PDF 文本
 */
export async function extractPDFFromFile(
  file: File,
  onProgress?: (progress: ExtractionProgress) => void
): Promise<PDFExtractResult> {
  const arrayBuffer = await file.arrayBuffer();
  return extractPDFFromBuffer(arrayBuffer, onProgress);
}

/**
 * 从 ArrayBuffer 提取 PDF 文本
 */
export async function extractPDFFromBuffer(
  buffer: ArrayBuffer,
  onProgress?: (progress: ExtractionProgress) => void
): Promise<PDFExtractResult> {
  const pdfjsLib = await loadPdfjs();
  
  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(buffer),
    // 禁用字体警告
    verbosity: 0,
  });
  
  const pdf = await loadingTask.promise;
  const totalPages = pdf.numPages;
  const pages: PDFPageResult[] = [];
  const pagesWithImages: number[] = [];
  
  // 获取元信息
  let metadata: PDFExtractResult['metadata'];
  try {
    const meta = await pdf.getMetadata();
    const info = meta.info as Record<string, string>;
    metadata = {
      title: info?.Title || undefined,
      author: info?.Author || undefined,
      subject: info?.Subject || undefined,
    };
  } catch {
    // 忽略元信息错误
  }
  
  // 逐页提取
  for (let i = 1; i <= totalPages; i++) {
    onProgress?.({
      currentPage: i,
      totalPages,
      percent: Math.round((i / totalPages) * 100),
      status: `正在提取第 ${i}/${totalPages} 页...`,
    });
    
    const page = await pdf.getPage(i);
    
    // 提取文本
    const textContent = await page.getTextContent();
    const pageText = extractPageText(textContent.items);
    
    // 检测图片
    let imageCount = 0;
    let hasImages = false;
    try {
      const ops = await page.getOperatorList();
      const paintImageOps = [
        pdfjsLib.OPS.paintImageXObject,
        pdfjsLib.OPS.paintInlineImageXObject,
        pdfjsLib.OPS.paintImageXObjectRepeat,
      ];
      
      for (const op of ops.fnArray) {
        if (paintImageOps.includes(op)) {
          imageCount++;
          hasImages = true;
        }
      }
    } catch {
      // 某些 PDF 可能不支持操作列表
    }
    
    if (hasImages) {
      pagesWithImages.push(i);
    }
    
    pages.push({
      pageNum: i,
      text: pageText,
      hasImages,
      imageCount,
    });
    
    // 释放页面资源
    page.cleanup();
  }
  
  // 合并全文（用换行分隔页面）
  const fullText = pages.map(p => p.text).join('\n\n');
  
  return {
    fullText,
    pages,
    totalPages,
    pagesWithImages,
    metadata,
  };
}

/**
 * 从文本项数组中提取结构化文本
 * 保留换行和适当的空格，以便后续题目解析
 */
function extractPageText(items: Array<TextItem | TextMarkedContent>): string {
  if (!items || items.length === 0) return '';
  
  const lines: string[] = [];
  let currentLine = '';
  let lastY: number | null = null;
  
  for (const item of items) {
    if (!isTextItem(item)) continue;
    
    const str = item.str;
    if (!str) continue;
    
    // 检测换行（Y坐标变化说明是新的一行）
    const y = item.transform?.[5];
    
    if (lastY !== null && y !== undefined && Math.abs(y - lastY) > 2) {
      // Y 坐标变化 → 新行
      if (currentLine.trim()) {
        lines.push(currentLine.trim());
      }
      currentLine = str;
    } else {
      // 同一行追加
      // 如果有明显间距，加空格
      if (currentLine && item.hasEOL) {
        if (currentLine.trim()) {
          lines.push(currentLine.trim());
        }
        currentLine = str;
      } else {
        currentLine += str;
      }
    }
    
    if (y !== undefined) {
      lastY = y;
    }
  }
  
  if (currentLine.trim()) {
    lines.push(currentLine.trim());
  }
  
  return lines.join('\n');
}

/**
 * 从 Word 文件提取文本（.doc / .docx）
 * 注：这里使用简单的文本提取，docx 本质是 zip 包含 XML
 */
export async function extractWordText(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  
  if (name.endsWith('.txt') || name.endsWith('.md')) {
    return await file.text();
  }
  
  if (name.endsWith('.docx')) {
    return await extractDocxText(file);
  }
  
  // .doc 格式比较古老，浏览器端难以解析
  // 返回提示信息
  return '[不支持.doc格式，请转换为.docx或.pdf后重新上传]';
}

/**
 * 从 .docx 文件提取纯文本
 * .docx 实际上是一个 ZIP 文件，包含 word/document.xml
 */
async function extractDocxText(file: File): Promise<string> {
  try {
    // 动态导入 JSZip 的替代方案：手动解析 ZIP
    // 由于没有 JSZip，我们使用浏览器的 DecompressionStream API
    const buffer = await file.arrayBuffer();
    const blob = new Blob([buffer]);
    
    // 尝试使用简单的 XML 提取
    // docx 中的文本在 word/document.xml 里的 <w:t> 标签中
    const text = await extractTextFromDocxBuffer(buffer);
    return text || '[DOCX解析失败，请用PDF格式上传]';
  } catch {
    return '[DOCX解析失败，请转换为PDF后重新上传]';
  }
}

/**
 * 手动从 docx ZIP 中提取文本
 * 使用原生的 ZIP 读取（简单实现）
 */
async function extractTextFromDocxBuffer(buffer: ArrayBuffer): Promise<string> {
  // docx 是 ZIP 格式，我们需要找到 word/document.xml
  const uint8 = new Uint8Array(buffer);
  
  // 查找 ZIP 本地文件头 (PK\x03\x04)
  let documentXml = '';
  
  // 简单方法：将整个文件当作文本搜索 XML 内容
  // 这不太可靠，但对于基本 docx 可以工作
  try {
    const decoder = new TextDecoder('utf-8', { fatal: false });
    const rawText = decoder.decode(uint8);
    
    // 寻找 <w:t> 标签中的文本
    const textMatches = rawText.match(/<w:t[^>]*>([^<]*)<\/w:t>/g);
    if (textMatches) {
      documentXml = textMatches
        .map(m => {
          const match = m.match(/<w:t[^>]*>([^<]*)<\/w:t>/);
          return match ? match[1] : '';
        })
        .join('');
    }
  } catch {
    // 忽略
  }
  
  return documentXml;
}

// ==================== 增强文本后处理 ====================

/**
 * 对提取的 PDF 文本进行智能清洗和结构化
 * - 修复断行的句子
 * - 识别题目编号并确保正确分隔
 * - 处理特殊字符
 */
export function cleanExtractedText(rawText: string): string {
  let text = rawText;
  
  // 1. 统一换行符
  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  
  // 2. 移除页眉页脚常见模式
  text = text.replace(/第\s*\d+\s*页\s*[共/]*\s*\d*\s*页?/g, '');
  text = text.replace(/- \d+ -/g, '');
  text = text.replace(/page\s*\d+\s*(of\s*\d+)?/gi, '');
  
  // 3. 确保题号前有足够的换行分隔
  text = text.replace(/([^\n])\n?(\d+[\.\、]\s*(?:[^\d]|$))/g, '$1\n\n$2');
  text = text.replace(/([^\n])\n?(第\d+题)/g, '$1\n\n$2');
  
  // 4. 确保选项在新行
  text = text.replace(/([^\n])(\n?[A-D][\.\、]\s)/g, '$1\n$2');
  
  // 5. 合并同一段落内的断行（两行之间如果不是选项/题号/答案，则合并）
  const lines = text.split('\n');
  const merged: string[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) {
      merged.push('');
      continue;
    }
    
    const nextLine = (i + 1 < lines.length) ? lines[i + 1].trim() : '';
    
    // 判断下一行是否应该合并到当前行
    const isNextNewBlock = !nextLine || 
      /^\d+[\.\、]/.test(nextLine) ||           // 题号
      /^第\d+题/.test(nextLine) ||               // 第X题
      /^[A-D][\.\、\s]/.test(nextLine) ||        // 选项
      /^(?:答案|【答案】|解析|【解析】)/.test(nextLine) ||  // 答案/解析
      /^(?:参考答案|正确答案)/.test(nextLine);    // 参考答案
    
    if (isNextNewBlock) {
      merged.push(line);
    } else {
      // 合并断行
      if (merged.length > 0 && merged[merged.length - 1] && !merged[merged.length - 1].endsWith('\n')) {
        merged[merged.length - 1] += line;
      } else {
        merged.push(line);
      }
    }
  }
  
  // 6. 移除连续空行（保留最多一个空行）
  text = merged.join('\n').replace(/\n{3,}/g, '\n\n');
  
  // 7. 去首尾空白
  text = text.trim();
  
  return text;
}

/**
 * 分析提取结果，估算题目数量和质量
 */
export function analyzeExtractedContent(result: PDFExtractResult): {
  estimatedQuestionCount: number;
  hasStructuredFormat: boolean;
  containsImages: boolean;
  imagePageCount: number;
  textQuality: 'high' | 'medium' | 'low';
  warnings: string[];
} {
  const text = result.fullText;
  const warnings: string[] = [];
  
  // 估算题目数量（通过题号匹配）
  const questionNumberMatches = text.match(/(?:^|\n)\s*(?:\d+[\.\、]|第\d+题)/g);
  const estimatedQuestionCount = questionNumberMatches?.length || 0;
  
  // 检查是否有结构化格式（选项 ABCD）
  const optionMatches = text.match(/(?:^|\n)\s*[A-D][\.\、\s]/g);
  const hasStructuredFormat = (optionMatches?.length || 0) > 2;
  
  // 图片页面
  const containsImages = result.pagesWithImages.length > 0;
  const imagePageCount = result.pagesWithImages.length;
  
  // 文本质量评估
  let textQuality: 'high' | 'medium' | 'low' = 'high';
  
  if (text.length < 100) {
    textQuality = 'low';
    warnings.push('提取的文本内容过少，可能是扫描版PDF（图片），建议使用OCR处理后再导入');
  } else if (!hasStructuredFormat) {
    textQuality = 'medium';
    warnings.push('未检测到标准题目格式（A/B/C/D选项），解析结果可能不准确');
  }
  
  if (estimatedQuestionCount === 0 && text.length > 200) {
    warnings.push('未检测到题目编号，可能是非标准格式，建议检查文本内容后手动调整');
  }
  
  if (containsImages) {
    warnings.push(`检测到 ${imagePageCount} 页包含图片，图形推理/图表类题目的图片内容需要查看原始PDF`);
  }
  
  return {
    estimatedQuestionCount,
    hasStructuredFormat,
    containsImages,
    imagePageCount,
    textQuality,
    warnings,
  };
}
