/**
 * LaTeX 格式转换器
 * 将 Mathpix 输出的 Markdown 转换为标准 LaTeX 格式
 */
export class FormatConverter {
  /**
   * 转换 Markdown 为 LaTeX 格式
   */
  static convertToLatexFormat(markdown: string): string {
    let converted = markdown;

    // 1. 预处理：清理内容
    converted = this.preprocessContent(converted);

    // 2. 按题号分割题目
    const questionSegments = this.splitQuestions(converted);

    console.log(`✅ 成功分割出 ${questionSegments.length} 个题目`);

    // 3. 处理每个题目
    const convertedQuestions: string[] = [];
    
    for (let i = 0; i < questionSegments.length; i++) {
      const segment = questionSegments[i];
      
      try {
        const convertedQuestion = this.convertQuestion(segment, i + 1);
        if (convertedQuestion) {
          convertedQuestions.push(convertedQuestion);
        }
      } catch (error: any) {
        console.error(`❌ 处理第 ${i + 1} 题失败:`, error.message);
        // 保留原始内容
        convertedQuestions.push(segment);
      }
    }

    return convertedQuestions.join('\n\n');
  }

  /**
   * 预处理内容：移除标题、作者、注意事项等
   */
  private static preprocessContent(content: string): string {
    let cleaned = content;

    // 移除\title{}
    cleaned = cleaned.replace(/\\title\{[\s\S]*?\}/g, '');

    // 移除\author{}
    cleaned = cleaned.replace(/\\author\{[\s\S]*?\}/g, '');

    // 移除注意事项部分
    cleaned = cleaned.replace(/\\section\*\{注意事项：?\}[\s\S]*?(?=\\section|$)/gi, '');

    // 移除题型标题（一、选择题：...）
    cleaned = cleaned.replace(/\\section\*\{[一二三四五六七八九十]、[^}]+\}/g, '');

    // 移除学校信息等页眉
    cleaned = cleaned.replace(/^[^\n]*(?:实验中学|育才中学|师大|附中)[\s\S]*?\n/gm, '');
    
    // 移除公众号相关内容
    cleaned = cleaned.replace(/公众号[^。]*。/g, '');
    cleaned = cleaned.replace(/（B）公众号[^。]*。/g, '');
    cleaned = cleaned.replace(/公众号[^。]*$/gm, '');
    cleaned = cleaned.replace(/（B）公众号[^。]*$/gm, '');
    
    // 移除图片引用
    cleaned = cleaned.replace(/图\s*$/gm, '');
    cleaned = cleaned.replace(/图\s*公众号[^。]*$/gm, '');

    // LaTeX命令替换
    cleaned = this.replaceLatexCommands(cleaned);

    return cleaned.trim();
  }

  /**
   * 替换LaTeX命令
   */
  private static replaceLatexCommands(content: string): string {
    let processed = content;
    
    // 智能分数替换：只替换顶层的 \frac，保持嵌套和指数中的 \frac
    processed = this.replaceTopLevelFrac(processed);
    
    // 将 \mathbf 替换为 \mathbb（粗体数学符号改为黑板粗体）
    processed = processed.replace(/\\mathbf\b/g, '\\mathbb');
    
    return processed;
  }

  /**
   * 智能计算每行选项数量
   */
  private static calculateOptimalColumns(options: string[]): number {
    if (options.length === 0) return 1;
    if (options.length === 1) return 1;
    
    // 计算平均选项长度（去除LaTeX命令后的纯文本长度）
    const avgLength = options.reduce((sum, option) => {
      // 移除LaTeX命令，只计算实际文本长度
      const cleanText = option.replace(/\$[^$]*\$/g, '').replace(/\\[a-zA-Z]+\{[^}]*\}/g, '').trim();
      return sum + cleanText.length;
    }, 0) / options.length;
    
    // 根据平均长度和选项数量智能判断
    if (avgLength > 30) {
      // 长选项，每行1-2个
      return options.length <= 2 ? options.length : 2;
    } else if (avgLength > 15) {
      // 中等长度选项，每行2-3个
      return options.length <= 3 ? options.length : 3;
    } else if (avgLength > 8) {
      // 较短选项，每行3-4个
      return options.length <= 4 ? options.length : 4;
    } else {
      // 很短选项，每行4-6个
      return options.length <= 6 ? options.length : 6;
    }
  }

  /**
   * 智能替换顶层分数，保持嵌套分数和指数中的分数不变
   */
  private static replaceTopLevelFrac(content: string): string {
    let processed = content;
    
    // 先保护指数中的分数
    const exponentPattern = /\^\{[^}]*\\frac[^}]*\}/g;
    const protectedExponents: string[] = [];
    processed = processed.replace(exponentPattern, (match) => {
      protectedExponents.push(match);
      return `__PROTECTED_EXPONENT_${protectedExponents.length - 1}__`;
    });
    
    // 再保护嵌套分数（在分数内部的分数）
    const nestedFracPattern = /\\dfrac\{[^}]*\\frac[^}]*\}/g;
    const protectedNested: string[] = [];
    processed = processed.replace(nestedFracPattern, (match) => {
      protectedNested.push(match);
      return `__PROTECTED_NESTED_${protectedNested.length - 1}__`;
    });
    
    // 现在替换剩余的 \frac 为 \dfrac
    processed = processed.replace(/\\frac\b/g, '\\dfrac');
    
    // 恢复保护的指数
    processed = processed.replace(/__PROTECTED_EXPONENT_(\d+)__/g, (_, index) => {
      return protectedExponents[parseInt(index)] || '';
    });
    
    // 恢复保护的嵌套分数
    processed = processed.replace(/__PROTECTED_NESTED_(\d+)__/g, (_, index) => {
      return protectedNested[parseInt(index)] || '';
    });
    
    return processed;
  }

  /**
   * 按题号分割题目
   */
  private static splitQuestions(content: string): string[] {
    const questions: string[] = [];
    
    // 先保护LaTeX公式，避免在分割时被破坏
    const latexPlaceholders: string[] = [];
    let protectedContent = content;
    
    // 保护数学公式 $...$ 和 $$...$$
    protectedContent = protectedContent.replace(/\$\$[\s\S]*?\$\$/g, (match) => {
      latexPlaceholders.push(match);
      return `__LATEX_BLOCK_${latexPlaceholders.length - 1}__`;
    });
    
    protectedContent = protectedContent.replace(/\$[^$]*\$/g, (match) => {
      latexPlaceholders.push(match);
      return `__LATEX_INLINE_${latexPlaceholders.length - 1}__`;
    });
    
    // 先按大题分割（一．、二．、三．等）
    const sectionPattern = /(?:^|\n)([一二三四五六七八九十]+)．/gm;
    const sections = protectedContent.split(sectionPattern);
    
    // 处理第一个大题之前的内容（通常包含选择题）
    if (sections[0] && sections[0].trim().length > 10) {
      const beforeFirstSection = sections[0].trim();
      const questionPattern = /(?:^|\n)(\d+)[．\.\、]\s*/gm;
      const questionParts = beforeFirstSection.split(questionPattern);
      
      // questionParts[0]是第一个小题之前的内容，跳过
      // questionParts[1]是第一个小题号，questionParts[2]是第一小题内容
      for (let j = 1; j < questionParts.length; j += 2) {
        const questionContent = questionParts[j + 1];
        if (questionContent && questionContent.trim().length > 10) {
          // 恢复LaTeX公式
          let restoredContent = questionContent.trim();
          restoredContent = restoredContent.replace(/__LATEX_BLOCK_(\d+)__/g, (_, index) => {
            return latexPlaceholders[parseInt(index)] || '';
          });
          restoredContent = restoredContent.replace(/__LATEX_INLINE_(\d+)__/g, (_, index) => {
            return latexPlaceholders[parseInt(index)] || '';
          });
          
          // 检查是否有子问题（1）、（2）、（3）等
          const hasSubQuestions = /[（(]\d+[）)]/.test(restoredContent);
          
          if (hasSubQuestions) {
            // 如果有子问题，需要problem环境
            const converted = this.convertQuestionWithSubProblems(restoredContent);
            questions.push(converted);
          } else {
            // 为每道题目添加 \item 前缀
            questions.push(`\\item ${restoredContent}`);
          }
        }
      }
    }
    
    // 处理各个大题的内容
    // sections[1]是第一个大题号，sections[2]是第一大题内容
    for (let i = 1; i < sections.length; i += 2) {
      const sectionContent = sections[i + 1];
      if (sectionContent && sectionContent.trim().length > 10) {
        // 在大题内容中按小题分割（数字 + 点号/顿号）
        const questionPattern = /(?:^|\n)(\d+)[．\.\、]\s*/gm;
        const questionParts = sectionContent.split(questionPattern);
        
        // questionParts[0]是第一个小题之前的内容，跳过
        // questionParts[1]是第一个小题号，questionParts[2]是第一小题内容
        for (let j = 1; j < questionParts.length; j += 2) {
          const questionContent = questionParts[j + 1];
          if (questionContent && questionContent.trim().length > 10) {
            // 恢复LaTeX公式
            let restoredContent = questionContent.trim();
            restoredContent = restoredContent.replace(/__LATEX_BLOCK_(\d+)__/g, (_, index) => {
              return latexPlaceholders[parseInt(index)] || '';
            });
            restoredContent = restoredContent.replace(/__LATEX_INLINE_(\d+)__/g, (_, index) => {
              return latexPlaceholders[parseInt(index)] || '';
            });
            
            // 检查是否有子问题（1）、（2）、（3）等
            const hasSubQuestions = /[（(]\d+[）)]/.test(restoredContent);
            
            if (hasSubQuestions) {
              // 如果有子问题，需要problem环境
              const converted = this.convertQuestionWithSubProblems(restoredContent);
              questions.push(converted);
            } else {
              // 为每道题目添加 \item 前缀
              questions.push(`\\item ${restoredContent}`);
            }
          }
        }
      }
    }

    // 如果没有找到任何题目，尝试将整个内容作为一个题目处理
    if (questions.length === 0 && content.trim().length > 10) {
      questions.push(`\\item ${content.trim()}`);
    }

    return questions;
  }

  /**
   * 转换单个题目
   */
  private static convertQuestion(content: string, questionNumber: number): string {
    // 移除可能存在的 \item 前缀，因为我们在splitQuestions中已经添加了
    let cleanContent = content.replace(/^\\item\s*/, '');
    
    // 1. 检测题型
    const type = this.detectQuestionType(cleanContent);
    console.log(`📝 题目 ${questionNumber}: 类型=${type}`);

    // 2. 根据题型处理内容
    let converted: string;

    if (type === 'choice' || type === 'multiple-choice') {
      // 选择题：转换为 \begin{tasks} 环境
      converted = this.convertChoiceQuestion(cleanContent);
    } else if (type === 'fill') {
      // 填空题：替换下划线为 \underlines
      converted = this.convertFillQuestion(cleanContent);
    } else {
      // 解答题：转换为 \begin{problem} 环境
      converted = this.convertSolutionQuestion(cleanContent);
    }

    // 3. 确保结果以 \item 开头
    if (!converted.startsWith('\\item')) {
      converted = `\\item ${converted}`;
    }

    return converted;
  }

  /**
   * 检测题目类型
   */
  private static detectQuestionType(text: string): 'choice' | 'multiple-choice' | 'fill' | 'solution' {
    // 移除图片和表格占位符
    const cleanText = text.replace(/\[IMAGE_\d+\]/g, '').replace(/\[TABLE_\d+\]/g, '');

    // 1. 检测选择题（有ABCD选项）
    const hasOptions = /[A-D][．\.\)、]\s*[^\n]+/g.test(cleanText);
    if (hasOptions) {
      // 检查是否为多选题
      if (/多选|不定项选择|多项选择/.test(cleanText)) {
        return 'multiple-choice';
      }
      return 'choice';
    }

    // 2. 检测填空题
    // 方式1: 明确的填空标记（包括LaTeX格式的下划线）
    if (/_{3,}|\$_{3,}\$|\$\\_\\_\\_\\_\$|\\\\_{3,}/.test(cleanText)) {
      return 'fill';
    }

    // 方式2: 填空题特征词（即使没有明确标记）
    const fillPatterns = [
      /则.{0,15}[为是][:：]\s*[．。]?\s*$/,  // "则...为："
      /若.{0,30}[，,].{0,15}则.{0,15}[:：]\s*[．。]?\s*$/,  // "若...则...："
      /.{0,15}=\s*[．。]?\s*$/,  // "...="
      /.{0,15}的值为\s*[．。]?\s*$/,  // "...的值为"
      /求.{0,15}[:：]\s*[．。]?\s*$/,  // "求...："
      /计算.{0,15}[:：]\s*[．。]?\s*$/,  // "计算...："
    ];

    for (const pattern of fillPatterns) {
      if (pattern.test(cleanText)) {
        return 'fill';
      }
    }

    // 3. 默认为解答题
    return 'solution';
  }

  /**
   * 转换选择题
   */
  private static convertChoiceQuestion(content: string): string {
    // 找到第一个选项的位置
    const firstOptionMatch = content.match(/\n[A-D][．\.\)、]\s*/);
    
    if (!firstOptionMatch || firstOptionMatch.index === undefined) {
      return content;
    }

    const firstOptionIndex = firstOptionMatch.index;
    let stem = content.substring(0, firstOptionIndex).trim();
    const optionsText = content.substring(firstOptionIndex);

    // 提取所有选项
    const optionPattern = /([A-D])[．\.\)、]\s*([^\n]+?)(?=\n[A-D][．\.\)、]|\n\n|$)/gs;
    const options: string[] = [];

    let match;
    while ((match = optionPattern.exec(optionsText)) !== null) {
      const optionText = match[2].trim();
      if (optionText) {
        options.push(optionText);
      }
    }

    console.log(`   ├─ 题干长度: ${stem.length}, 选项数: ${options.length}`);

    // 移除分值信息
    stem = this.removeScoreInfo(stem);

    // 将题干中的（）替换为\dotfill（\qquad \qquad）
    stem = stem.replace(/（\s*）/g, '\\dotfill（\\qquad \\qquad）');
    stem = stem.replace(/\(\s*\)/g, '\\dotfill（\\qquad \\qquad）');

    // 智能判断每行选项数量
    const optimalColumns = this.calculateOptimalColumns(options);
    
    // 构建LaTeX格式
    let latex = stem + '\n\n';
    latex += `\\begin{tasks}(${optimalColumns})\n`;
    
    options.forEach(option => {
      latex += `\\task ${option}\n`;
    });
    
    latex += '\\end{tasks}';

    return latex;
  }

  /**
   * 转换填空题
   */
  private static convertFillQuestion(content: string): string {
    let converted = content.trim();
    
    // 移除分值信息
    converted = this.removeScoreInfo(converted);

    // 1. 替换各种LaTeX格式的填空
    // $____$, $\_\_\_\_$, $$____$$, $$\_\_\_\_$$
    converted = converted.replace(/\$\$_{3,}\$\$/g, '\\underlines');      // 块级LaTeX填空 $____$
    converted = converted.replace(/\$\$\\_\\_\\_\\_\$\$/g, '\\underlines');    // 块级LaTeX填空 $\_\_\_\_$
    converted = converted.replace(/\$_{3,}\$/g, '\\underlines');          // 行内LaTeX填空 $____$
    converted = converted.replace(/\$\\_\\_\\_\\_\$/g, '\\underlines');        // 行内LaTeX填空 $\_\_\_\_$
    
    // 2. 替换纯下划线填空：____ 或 ___ 等
    converted = converted.replace(/(?<!\$)\\?_{3,}(?!\$)/g, '\\underlines');

    // 3. 如果没有明确的填空标记，检查是否需要添加
    if (!converted.includes('\\underlines')) {
      // 检查是否以填空题特征结尾
      if (/[:：=]\s*[．。]?\s*$/.test(converted)) {
        converted = converted.replace(/[．。]?\s*$/, ' \\underlines ．');
      }
    }

    return converted;
  }

  /**
   * 转换解答题
   */
  private static convertSolutionQuestion(content: string): string {
    let converted = content.trim();

    // 移除分值信息
    converted = this.removeScoreInfo(converted);

    // 移除题目编号和来源信息（如"14．（22－23 高三上 上海杨浦 • 阶段练习）"）
    // 匹配：数字 + 点号/顿号 + 来源信息
    converted = converted.replace(/^\d+[．\.\、]\s*[（(（][^）)]*[）)]\s*/g, '');
    
    // 只删除开头位置的来源信息，避免误删区间表示法如$(-1,5)$
    converted = converted.replace(/^[（(（][^）)]*[阶段练习|期中|期末|月考|模拟|联考|调研|测试|考试|试卷][^）)]*[）)]\s*/g, '');
    // 也删除其他常见的开头来源格式
    converted = converted.replace(/^[（(（][^）)]*[高三|高二|高一|初中|小学][^）)]*[）)]\s*/g, '');
    converted = converted.replace(/^[（(（][^）)]*[上海|北京|广东|江苏|浙江|山东|河南|四川|湖北|湖南|安徽|福建|江西|辽宁|黑龙江|吉林|河北|山西|陕西|甘肃|青海|宁夏|新疆|西藏|内蒙古|广西|海南|贵州|云南|重庆|天津][^）)]*[）)]\s*/g, '');

    // 检查是否有多道题目（通过检测多个子问题编号）
    const subQuestionMatches = converted.match(/[（(]\d+[）)]/g);
    const hasMultipleQuestions = subQuestionMatches && subQuestionMatches.length > 1;

    if (hasMultipleQuestions) {
      // 有多道题目，每道题都需要用\item处理
      return this.convertMultipleSolutionQuestions(converted);
    } else {
      // 单道题目，检查是否有子问题
      const { stem, subQuestions } = this.separateStemAndSubQuestions(converted);

      if (subQuestions.length === 0) {
        // 如果没有子问题，直接返回原内容
        return converted;
      }

      // 如果有子问题，需要problem环境
      let result = stem;
      if (stem.trim()) {
        result += '\n\n';
      }
      
      result += '\\begin{problem}\n';
      result += subQuestions.join('\n');
      result += '\n\\end{problem}';

      return result;
    }
  }

  /**
   * 转换有子问题的题目
   */
  private static convertQuestionWithSubProblems(content: string): string {
    // 分离题干和子问题
    const { stem, subQuestions } = this.separateStemAndSubQuestions(content);
    
    if (subQuestions.length === 0) {
      return `\\item ${content}`;
    }
    
    // 构建problem环境，题干在外面，子问题在里面
    let result = stem;
    if (stem.trim()) {
      result += '\n\n';
    }
    
    result += '\\begin{problem}\n';
    result += subQuestions.join('\n');
    result += '\n\\end{problem}';
    
    return result;
  }

  /**
   * 转换多道解答题
   */
  private static convertMultipleSolutionQuestions(content: string): string {
    // 按子问题编号分割题目
    const subQuestionPattern = /[（(](\d+)[）)]\s*(.+?)(?=[（(]\d+[）)]|$)/gs;
    const questions: string[] = [];
    
    let match;
    while ((match = subQuestionPattern.exec(content)) !== null) {
      const questionContent = match[2].trim();
      if (questionContent) {
        questions.push(`\\item ${questionContent}`);
      }
    }

    if (questions.length === 0) {
      return content;
    }

    // 检查是否是多道独立题目（通过检测是否有题干部分）
    const hasStem = content.includes('已知') || content.includes('设') || content.includes('若') || 
                   content.includes('求') || content.includes('证明') || content.includes('求证');
    
    if (hasStem && questions.length > 1) {
      // 多道独立题目，每道题单独处理，不需要problem环境
      return questions.join('\n\n');
    } else {
      // 一道大题包含多个小问，需要problem环境
      let result = '\\begin{problem}\n';
      result += questions.join('\n');
      result += '\n\\end{problem}';
      return result;
    }
  }

  /**
   * 分离题干和子问题
   */
  private static separateStemAndSubQuestions(content: string): { stem: string; subQuestions: string[] } {
    // 找到第一个子问题的位置
    const firstSubQuestionMatch = content.match(/[（(]\d+[）)]/);
    
    if (!firstSubQuestionMatch) {
      // 没有子问题，整个内容都是题干
      return { stem: content, subQuestions: [] };
    }

    const firstSubQuestionIndex = firstSubQuestionMatch.index!;
    const stem = content.substring(0, firstSubQuestionIndex).trim();
    
    // 提取所有子问题
    const subQuestionPattern = /[（(](\d+)[）)]\s*(.+?)(?=[（(]\d+[）)]|$)/gs;
    const subQuestions: string[] = [];
    
    let match;
    while ((match = subQuestionPattern.exec(content)) !== null) {
      const questionContent = match[2].trim();
      if (questionContent) {
        subQuestions.push(`\\item ${questionContent}`);
      }
    }

    return { stem, subQuestions };
  }

  /**
   * 转换嵌套小问
   */
  private static convertNestedSubproblems(content: string): string {
    let converted = content;

    // 将 ① ② 等转换为 \item
    converted = converted.replace(/[①②③④⑤⑥⑦⑧⑨⑩]\s*/g, '\\item ');

    // 找到嵌套结构并包装
    const lines = converted.split('\n');
    const result: string[] = [];
    let inSubproblem = false;
    let subproblemItems: string[] = [];

    for (const line of lines) {
      if (line.includes('\\item') && !inSubproblem) {
        // 开始新的主问题
        if (subproblemItems.length > 0) {
          result.push('\\begin{problem}');
          result.push(...subproblemItems);
          result.push('\\end{problem}');
          subproblemItems = [];
        }
        subproblemItems.push(line);
        inSubproblem = true;
      } else if (line.includes('\\item') && inSubproblem) {
        // 检查是否是子问题（缩进更多）
        if (line.startsWith('  ') || line.startsWith('\t')) {
          // 这是子问题
          if (subproblemItems.length > 0 && !subproblemItems[subproblemItems.length - 1].includes('\\begin{subproblem}')) {
            subproblemItems.push('\\begin{subproblem}');
          }
          subproblemItems.push(line.replace(/^\s+/, ''));
        } else {
          // 这是新的主问题
          if (subproblemItems.length > 0) {
            if (subproblemItems[subproblemItems.length - 1].includes('\\begin{subproblem}')) {
              subproblemItems.push('\\end{subproblem}');
            }
            result.push('\\begin{problem}');
            result.push(...subproblemItems);
            result.push('\\end{problem}');
            subproblemItems = [];
          }
          subproblemItems.push(line);
        }
      } else if (inSubproblem) {
        subproblemItems.push(line);
      } else {
        result.push(line);
      }
    }

    // 处理最后的问题
    if (subproblemItems.length > 0) {
      if (subproblemItems[subproblemItems.length - 1].includes('\\begin{subproblem}')) {
        subproblemItems.push('\\end{subproblem}');
      }
      result.push('\\begin{problem}');
      result.push(...subproblemItems);
      result.push('\\end{problem}');
    }

    return result.join('\n');
  }

  /**
   * 移除各种形式的分值信息
   */
  private static removeScoreInfo(content: string): string {
    let formatted = content.trim();

    // 1. 本小题满分X分
    formatted = formatted.replace(/[（(]本小题满分\s*\d+\s*分[）)]/g, '');
    
    // 2. (X分)、（X分）等各种分值格式
    formatted = formatted.replace(/[（(]\s*\d+\s*分\s*[）)]/g, '');
    
    // 3. X分、X分等单独的分值
    formatted = formatted.replace(/\b\d+\s*分\b/g, '');
    
    // 4. 分值在题目开头的格式：如"1. (4分) 题目内容"
    formatted = formatted.replace(/^(\d+[．\.\、]\s*)[（(]\s*\d+\s*分\s*[）)]\s*/gm, '$1');
    
    // 5. 分值在题目结尾的格式：如"题目内容 (4分)"
    formatted = formatted.replace(/\s*[（(]\s*\d+\s*分\s*[）)]\s*$/gm, '');
    
    // 6. 分值在题目中间的格式：如"题目内容(4分)继续内容"
    formatted = formatted.replace(/\s*[（(]\s*\d+\s*分\s*[）)]\s*/g, ' ');

    return formatted.trim();
  }
}

