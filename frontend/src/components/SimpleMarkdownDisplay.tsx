import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import CodeMirror from '@uiw/react-codemirror';
import { markdown } from '@codemirror/lang-markdown';
import { oneDark } from '@codemirror/theme-one-dark';
import { Extension } from '@codemirror/state';
import { Decoration, DecorationSet, ViewPlugin, ViewUpdate } from '@codemirror/view';
import { useThemeStore } from '../stores/themeStore';

export type ViewMode = 'raw' | 'edit' | 'preview';

// LaTeX语法高亮扩展
const latexHighlight = (): Extension => {
  const latexDecoration = Decoration.mark({
    class: 'cm-latex-math'
  });
  
  const latexInlineDecoration = Decoration.mark({
    class: 'cm-latex-inline'
  });

  const commandDecoration = Decoration.mark({
    class: 'cm-latex-command'
  });

  return ViewPlugin.fromClass(class {
    decorations: DecorationSet;

    constructor(view: any) {
      this.decorations = this.buildDecorations(view);
    }

    update(update: ViewUpdate) {
      if (update.docChanged) {
        this.decorations = this.buildDecorations(update.view);
      }
    }

    buildDecorations(view: any) {
      const decorations: any[] = [];
      const doc = view.state.doc;
      
      for (let i = 0; i < doc.length; i++) {
        const line = doc.lineAt(i);
        const text = line.text;
        
        // 匹配 $$...$$ 块级数学公式
        const blockMathRegex = /\$\$([^$]+)\$\$/g;
        let match;
        while ((match = blockMathRegex.exec(text)) !== null) {
          const from = line.from + match.index;
          const to = from + match[0].length;
          decorations.push(latexDecoration.range(from, to));
        }
        
        // 匹配 $...$ 行内数学公式
        const inlineMathRegex = /\$([^$]+)\$/g;
        while ((match = inlineMathRegex.exec(text)) !== null) {
          const from = line.from + match.index;
          const to = from + match[0].length;
          decorations.push(latexInlineDecoration.range(from, to));
        }
        
        // 匹配 \begin{...} 和 \end{...} 环境
        const envRegex = /\\(begin|end)\{[^}]+\}/g;
        while ((match = envRegex.exec(text)) !== null) {
          const from = line.from + match.index;
          const to = from + match[0].length;
          decorations.push(commandDecoration.range(from, to));
        }
        
        // 匹配 \item, \task, \underlines 等命令
        const commandRegex = /\\(item|task|underlines|dotfill|qquad|frac|dfrac|mathbb|mathbf)\b/g;
        while ((match = commandRegex.exec(text)) !== null) {
          const from = line.from + match.index;
          const to = from + match[0].length;
          decorations.push(commandDecoration.range(from, to));
        }
      }
      
      return Decoration.set(decorations);
    }
  }, {
    decorations: (v) => v.decorations
  });
};

interface SimpleMarkdownDisplayProps {
  content: string;
  fileName?: string;
  onContentChange?: (newContent: string) => void;
  className?: string;
}

const SimpleMarkdownDisplay: React.FC<SimpleMarkdownDisplayProps> = ({
  content,
  fileName,
  onContentChange,
  className = ''
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('preview');
  const [editContent, setEditContent] = useState(content);
  const [processedContent, setProcessedContent] = useState('');
  const { isDark } = useThemeStore();

  // 当外部content变化时，同步到编辑内容
  useEffect(() => {
    setEditContent(content);
  }, [content]);

  // 当编辑内容变化时，重新处理内容
  useEffect(() => {
    setProcessedContent(preprocessContent(editContent));
  }, [editContent]);

  // 处理内容变化
  const handleContentChange = (newContent: string) => {
    setEditContent(newContent);
    onContentChange?.(newContent);
  };

  // 预处理内容（与MarkdownDisplay.tsx保持一致）
  const preprocessContent = (text: string): string => {
    let processed = text;
    
    // 处理 \begin{problem} 环境 - 转换为Markdown列表
    processed = processed.replace(/\\begin\{problem\}([\s\S]*?)\\end\{problem\}/g, (match, content) => {
      const itemPattern = /\\item\s*([\s\S]*?)(?=\\item|$)/g;
      const items: string[] = [];
      let itemMatch;
      while ((itemMatch = itemPattern.exec(content)) !== null) {
        const itemContent = itemMatch[1].trim();
        if (itemContent) {
          items.push(itemContent);
        }
      }
      if (items.length > 0) {
        const itemList = items.map((itemContent: string, index: number) => {
          return `（${index + 1}）${itemContent}`;
        }).join('\n\n');
        return itemList;
      }
      return match;
    });

    // 处理 \begin{tasks} 环境 - 转换为LaTeX样式选择题格式
    processed = processed.replace(/\\begin\{tasks\}\((\d+)\)([\s\S]*?)\\end\{tasks\}/g, (match, columns, content) => {
      const taskPattern = /\\task\s*([\s\S]*?)(?=\\task|$)/g;
      const tasks: string[] = [];
      let taskMatch;
      while ((taskMatch = taskPattern.exec(content)) !== null) {
        const taskContent = taskMatch[1].trim();
        if (taskContent) {
          tasks.push(taskContent);
        }
      }
      if (tasks.length > 0) {
        const numColumns = parseInt(columns) || 1;
        const taskList = tasks.map((taskContent: string, index: number) => {
          const letter = String.fromCharCode(65 + index);
          return `**${letter}.** ${taskContent.trim()}`;
        });
        const markdownContent = taskList.join('\n\n');
        return `<div class="tasks-container" data-columns="${numColumns}">\n\n${markdownContent}\n\n</div>`;
      }
      return match;
    });
    
    // 处理 \underlines 命令 - 转换为下划线
    processed = processed.replace(/\\underlines/g, '________');
    
    // 处理 \dotfill（\qquad \qquad）命令 - 转换为简单括号格式
    processed = processed.replace(/\\dotfill（\\qquad \\qquad）/g, '（       ）');
    processed = processed.replace(/\\dotfill\(\\qquad \\qquad\)/g, '（       ）');
    
    // 处理普通的 \item 命令 - 转换为Markdown编号列表
    // 先保护所有特殊环境，避免在环境内部处理\item
    const problemPlaceholder = '___PROBLEM_PLACEHOLDER___';
    const tasksPlaceholder = '___TASKS_PLACEHOLDER___';
    const problemMatches: string[] = [];
    const tasksMatches: string[] = [];
    
    // 保护 \begin{problem} 环境
    processed = processed.replace(/\\begin\{problem\}[\s\S]*?\\end\{problem\}/g, (match) => {
      problemMatches.push(match);
      return problemPlaceholder;
    });
    
    // 保护 \begin{tasks} 环境
    processed = processed.replace(/\\begin\{tasks\}\((\d+)\)[\s\S]*?\\end\{tasks\}/g, (match) => {
      tasksMatches.push(match);
      return tasksPlaceholder;
    });
    
    // 全局计数 \item，确保连续编号
    let globalItemCounter = 1;
    processed = processed.replace(/\\item\s*([^\n]+)/g, (_, content) => {
      return `${globalItemCounter++}. ${content.trim()}`;
    });
    
    // 恢复 \begin{problem} 环境
    processed = processed.replace(problemPlaceholder, () => {
      return problemMatches.shift() || '';
    });
    
    // 恢复 \begin{tasks} 环境
    processed = processed.replace(tasksPlaceholder, () => {
      return tasksMatches.shift() || '';
    });
    
    return processed;
  };

  // 渲染内容
  const renderContent = () => {
    switch (viewMode) {
      case 'raw':
        return (
          <pre className="bg-gray-50 dark:bg-gray-700 p-4 text-sm font-mono overflow-x-auto max-h-96 text-gray-900 dark:text-gray-100 transition-colors duration-300">
            <code>{editContent}</code>
          </pre>
        );
      
      case 'edit':
        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-96">
            {/* 左侧编辑器 */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden flex flex-col">
              <div className="bg-gray-50 dark:bg-gray-700 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-600 flex-shrink-0">
                编辑模式
              </div>
              <div className="flex-1 overflow-hidden">
                <CodeMirror
                  value={editContent}
                  onChange={(value) => handleContentChange(value)}
                  extensions={[markdown(), latexHighlight()]}
                  theme={isDark ? oneDark : undefined}
                  basicSetup={{
                    lineNumbers: true,
                    foldGutter: true,
                    dropCursor: false,
                    allowMultipleSelections: false,
                    indentOnInput: true,
                    bracketMatching: true,
                    closeBrackets: true,
                    autocompletion: true,
                    highlightSelectionMatches: false,
                    searchKeymap: true,
                  }}
                  className="text-sm h-full overflow-auto"
                  style={{
                    fontSize: '14px',
                    fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
                    height: '100%',
                    overflow: 'auto'
                  }}
                />
              </div>
            </div>

            {/* 右侧预览 */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden flex flex-col">
              <div className="bg-gray-50 dark:bg-gray-700 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-600 flex-shrink-0">
                实时预览
              </div>
              <div 
                className="p-4 prose prose-sm max-w-none dark:prose-invert flex-1 overflow-y-auto" 
                style={{ fontFamily: 'WenYuanSerifSC, Times New Roman, Times, serif' }}
              >
                <ReactMarkdown
                  remarkPlugins={[remarkMath]}
                  rehypePlugins={[rehypeRaw, rehypeKatex]}
                  components={{
                    code: ({ node, className, children, ...props }) => {
                      const match = /language-(\w+)/.exec(className || '');
                      const isInline = !match;
                      return !isInline ? (
                        <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg overflow-x-auto">
                          <code className={className} {...props}>
                            {children}
                          </code>
                        </pre>
                      ) : (
                        <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-sm" {...props}>
                          {children}
                        </code>
                      );
                    },
                    h1: ({ children }) => <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">{children}</h1>,
                    h2: ({ children }) => <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">{children}</h2>,
                    h3: ({ children }) => <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">{children}</h3>,
                    p: ({ children }) => <p className="text-gray-800 dark:text-gray-200 mb-3 leading-relaxed">{children}</p>,
                    ul: ({ children }) => <ul className="list-disc list-inside mb-4 space-y-1">{children}</ul>,
                    ol: ({ children }) => <ol className="list-decimal list-inside mb-4 space-y-1">{children}</ol>,
                    li: ({ children }) => <li className="text-gray-800 dark:text-gray-200">{children}</li>,
                    blockquote: ({ children }) => (
                      <blockquote className="border-l-4 border-blue-500 pl-4 italic text-gray-700 dark:text-gray-300 my-4">
                        {children}
                      </blockquote>
                    ),
                    table: ({ children }) => (
                      <div className="overflow-x-auto my-4">
                        <table className="min-w-full border border-gray-300 dark:border-gray-600">
                          {children}
                        </table>
                      </div>
                    ),
                    th: ({ children }) => (
                      <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 bg-gray-100 dark:bg-gray-700 font-semibold text-gray-900 dark:text-white">
                        {children}
                      </th>
                    ),
                    td: ({ children }) => (
                      <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-gray-800 dark:text-gray-200">
                        {children}
                      </td>
                    ),
                  }}
                >
                  {processedContent}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        );
      
      case 'preview':
      default:
        return (
          <div 
            className="p-6 prose prose-sm max-w-none dark:prose-invert max-h-96 overflow-y-auto transition-colors duration-300" 
            style={{ fontFamily: 'WenYuanSerifSC, Times New Roman, Times, serif' }}
          >
            <ReactMarkdown
              remarkPlugins={[remarkMath]}
              rehypePlugins={[rehypeRaw, rehypeKatex]}
              components={{
                code: ({ node, className, children, ...props }) => {
                  const match = /language-(\w+)/.exec(className || '');
                  const isInline = !match;
                  return !isInline ? (
                    <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg overflow-x-auto">
                      <code className={className} {...props}>
                        {children}
                      </code>
                    </pre>
                  ) : (
                    <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-sm" {...props}>
                      {children}
                    </code>
                  );
                },
                h1: ({ children }) => <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">{children}</h1>,
                h2: ({ children }) => <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">{children}</h2>,
                h3: ({ children }) => <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">{children}</h3>,
                p: ({ children }) => <p className="text-gray-800 dark:text-gray-200 mb-3 leading-relaxed">{children}</p>,
                ul: ({ children }) => <ul className="list-disc list-inside mb-4 space-y-1">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal list-inside mb-4 space-y-1">{children}</ol>,
                li: ({ children }) => <li className="text-gray-800 dark:text-gray-200">{children}</li>,
                blockquote: ({ children }) => (
                  <blockquote className="border-l-4 border-blue-500 pl-4 italic text-gray-700 dark:text-gray-300 my-4">
                    {children}
                  </blockquote>
                ),
                table: ({ children }) => (
                  <div className="overflow-x-auto my-4">
                    <table className="min-w-full border border-gray-300 dark:border-gray-600">
                      {children}
                    </table>
                  </div>
                ),
                th: ({ children }) => (
                  <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 bg-gray-100 dark:bg-gray-700 font-semibold text-gray-900 dark:text-white">
                    {children}
                  </th>
                ),
                td: ({ children }) => (
                  <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-gray-800 dark:text-gray-200">
                    {children}
                  </td>
                ),
              }}
            >
              {preprocessContent(editContent)}
            </ReactMarkdown>
          </div>
        );
    }
  };

  if (!editContent) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <div className="text-gray-500 dark:text-gray-400">
          <p>暂无内容</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 模式切换按钮 */}
      <div className="flex items-center justify-between">
        <div className="flex space-x-2">
          <button
            onClick={() => setViewMode('raw')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors duration-200 ${
              viewMode === 'raw'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            原始模式
          </button>
          <button
            onClick={() => setViewMode('edit')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors duration-200 ${
              viewMode === 'edit'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            编辑模式
          </button>
          <button
            onClick={() => setViewMode('preview')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors duration-200 ${
              viewMode === 'preview'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            预览模式
          </button>
        </div>
        
        {fileName && (
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {fileName}
          </div>
        )}
      </div>

      {/* 内容区域 */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        {renderContent()}
      </div>
    </div>
  );
};

export default SimpleMarkdownDisplay;
