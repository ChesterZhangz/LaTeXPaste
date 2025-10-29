import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import { Copy, Download, Check, Eye, EyeOff } from 'lucide-react';

interface MarkdownDisplayProps {
  content: string;
  fileName?: string;
}

const MarkdownDisplay: React.FC<MarkdownDisplayProps> = ({ content, fileName }) => {
  const [copied, setCopied] = useState(false);
  const [showRaw, setShowRaw] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('复制失败:', err);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName || 'converted'}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // 预处理内容，将LaTeX环境转换为Markdown格式
  const preprocessContent = (text: string): string => {
    let processed = text;
    
    // 处理 \begin{problem} 环境 - 转换为Markdown列表
    processed = processed.replace(/\\begin\{problem\}([\s\S]*?)\\end\{problem\}/g, (match, content) => {
      // 提取 \item 内容并转换为Markdown编号列表
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
          return `（${index + 1}）${itemContent}`; // 使用（1）、（2）格式
        }).join('\n\n'); // 题目之间空一行，一行一个题目
        
        return itemList;
      }
      return match;
    });

    // 处理 \begin{tasks} 环境 - 转换为LaTeX样式选择题格式
    processed = processed.replace(/\\begin\{tasks\}\((\d+)\)([\s\S]*?)\\end\{tasks\}/g, (match, columns, content) => {
      // 提取 \task 内容
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
          const letter = String.fromCharCode(65 + index); // A, B, C, D...
          return `**${letter}.** ${taskContent}`;
        });
        
        // 创建Markdown格式的选项列表，使用HTML包装以应用样式
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

  if (!content) {
    return (
      <div className="card">
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Eye className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">暂无内容</h3>
          <p className="text-gray-500">请先上传PDF文件进行扫描</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">扫描结果</h3>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowRaw(!showRaw)}
            className="btn-outline flex items-center text-sm"
          >
            {showRaw ? (
              <>
                <Eye className="w-4 h-4 mr-2" />
                预览模式
              </>
            ) : (
              <>
                <EyeOff className="w-4 h-4 mr-2" />
                源码模式
              </>
            )}
          </button>
          
          <button
            onClick={handleCopy}
            className="btn-outline flex items-center text-sm"
            disabled={copied}
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 mr-2" />
                已复制
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 mr-2" />
                复制
              </>
            )}
          </button>
          
          <button
            onClick={handleDownload}
            className="btn-primary flex items-center text-sm"
          >
            <Download className="w-4 h-4 mr-2" />
            下载
          </button>
        </div>
      </div>

      <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        {showRaw ? (
          <pre className="bg-gray-50 dark:bg-gray-700 p-4 text-sm font-mono overflow-x-auto max-h-96 text-gray-900 dark:text-gray-100 transition-colors duration-300">
            <code>{content}</code>
          </pre>
        ) : (
          <div className="p-6 prose prose-sm max-w-none dark:prose-invert max-h-96 overflow-y-auto" style={{ fontFamily: 'WenYuanSerifSC, Times New Roman, Times, serif' }}>
            <ReactMarkdown
              remarkPlugins={[remarkMath]}
              rehypePlugins={[rehypeRaw, rehypeKatex]}
              components={{
                // 自定义渲染组件
                code: ({ node, className, children, ...props }: any) => {
                  const match = /language-(\w+)/.exec(className || '');
                  const isInline = !match;
                  return !isInline ? (
                    <pre className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4 overflow-x-auto transition-colors duration-300">
                      <code className={className} {...props}>
                        {children}
                      </code>
                    </pre>
                  ) : (
                    <code className="bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded text-sm transition-colors duration-300" {...props}>
                      {children}
                    </code>
                  );
                },
                // 处理LaTeX环境
                div: ({ children, className, ...props }: any) => {
                  if (className?.includes('katex-display')) {
                    return <div className="my-4 text-center">{children}</div>;
                  }
                  return <div className={className} {...props}>{children}</div>;
                },
                // 处理段落样式
                p: ({ children, ...props }: any) => (
                  <p className="mb-4 leading-relaxed text-gray-800 dark:text-gray-200" {...props}>
                    {children}
                  </p>
                ),
                // 处理有序列表样式
                ol: ({ children, ...props }: any) => (
                  <ol className="list-decimal list-inside space-y-2 mb-4" {...props}>
                    {children}
                  </ol>
                ),
                // 处理列表项样式
                li: ({ children, ...props }: any) => (
                  <li className="text-gray-800 dark:text-gray-200 leading-relaxed" {...props}>
                    {children}
                  </li>
                )
              }}
            >
              {preprocessContent(content)}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
};

export default MarkdownDisplay;
