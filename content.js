// 问题提取和自动选择逻辑

// 缓存机制，避免重复提取
let cachedQuestions = null;

function extractQuestions() {
  console.log('开始提取问题');
  
  // 重置缓存
  cachedQuestions = null;

  const questions = [];
  
  // 更广泛和灵活的选择器
  const questionSelectors = [
    '.que', '.question', '.exam-question', 
    '.quiz-question', '.test-question', 
    '[class*="question"]', '[id*="question"]',
    // 添加更多可能的选择器
    '.q-container', '.question-wrapper', 
    '[data-testid*="question"]', '[aria-label*="question"]',
    // 针对特定网站的选择器
    '.topic', '.exam-item', '.quiz-item'
  ];

  const questionElements = [];
  questionSelectors.forEach(selector => {
    questionElements.push(...document.querySelectorAll(selector));
  });

  // 去重函数
  const uniqueElements = new Set();

  questionElements.forEach((questionEl, index) => {
    // 避免重复处理
    if (uniqueElements.has(questionEl)) return;
    uniqueElements.add(questionEl);

    // 更灵活的问题文本选择器
    const questionTextSelectors = [
      '.qtext', '.question-text', '.exam-question-text', 
      '.quiz-question-text', '.test-question-text', 
      '[class*="question-text"]', '[id*="question-text"]',
      'p', 'span', 'h3', 'h4', 
      // 针对特定文本的选择器
      '.topic-text', '.exam-text', '.quiz-text'
    ];

    let questionTextEl = null;
    for (const selector of questionTextSelectors) {
      questionTextEl = questionEl.querySelector(selector);
      if (questionTextEl) break;
    }

    // 更广泛的选项选择器
    const choiceSelectors = [
      '.answer div', '.choice', '.exam-option', 
      '.quiz-option', '.test-option', 
      '[class*="option"]', '[id*="option"]',
      '.q-choice', '.option-container', 
      '[data-testid*="option"]', '[aria-label*="option"]',
      // 针对特定网站的选择器
      '.topic-choice', '.exam-choice', '.quiz-choice'
    ];

    const choiceElements = [];
    choiceSelectors.forEach(selector => {
      choiceElements.push(...questionEl.querySelectorAll(selector));
    });

    // 如果找到问题文本和选项
    if (questionTextEl && choiceElements.length > 0) {
      const questionText = questionTextEl.textContent.trim();

      // 处理选项去重和清理
      const uniqueChoices = [];
      const choiceTexts = new Set();

      choiceElements.forEach((choiceEl, choiceIndex) => {
        const choiceText = choiceEl.textContent.trim();
        
        // 去除选项中的字母标记和多余空白
        const cleanChoiceText = choiceText
          .replace(/^[A-Z]\.?\s*/, '')  // 移除开头的字母和点
          .replace(/\s+/g, ' ')  // 标准化空白
          .trim();
        
        // 只保留唯一的选项文本
        if (cleanChoiceText && !choiceTexts.has(cleanChoiceText)) {
          uniqueChoices.push({
            letter: String.fromCharCode(65 + uniqueChoices.length),  // A, B, C, D
            text: cleanChoiceText,
            element: choiceEl
          });
          
          choiceTexts.add(cleanChoiceText);
        }
        
        // 限制最多4个选项
        if (uniqueChoices.length >= 4) return false;
      });
      
      // 只有当有效选项大于1时才添加问题
      if (uniqueChoices.length > 1) {
        questions.push({
          text: questionText,
          choices: uniqueChoices
        });
      }
    }
  });

  // 缓存问题
  if (questions.length > 0) {
    cachedQuestions = questions;
    console.log(`提取到 ${questions.length} 个问题`);
  }

  return questions;
}

// 自动选择答案的函数
function autoSelectAnswers(questions) {
  console.group('🎯 自动选择答案');
  console.log(`开始处理 ${questions.length} 个问题`);

  if (!questions || questions.length === 0) {
    console.warn('❌ 没有可选择的问题');
    console.groupEnd();
    return;
  }

  // 选择策略映射
  const selectionStrategies = {
    // 默认策略：根据 AI 答案精确匹配
    default: (question, aiAnswer) => {
      console.log(`🔍 使用默认策略处理问题: ${question.text}`);
      
      if (!aiAnswer || !question.choices) {
        console.warn(`⚠️ 问题 "${question.text}" 缺少答案或选项`);
        return null;
      }

      // 精确匹配 AI 答案
      const matchedChoices = question.choices.filter(choice => 
        aiAnswer.includes(choice.letter)
      );

      if (matchedChoices.length > 0) {
        console.log(`✅ 找到 ${matchedChoices.length} 个匹配选项`);
        return matchedChoices;
      }

      console.warn(`❌ 未找到匹配选项，问题: ${question.text}`);
      return null;
    },

    // 模糊匹配策略：支持部分匹配
    fuzzy: (question, aiAnswer) => {
      console.log(`🔎 使用模糊匹配策略处理问题: ${question.text}`);
      
      if (!aiAnswer || !question.choices) {
        console.warn(`⚠️ 问题 "${question.text}" 缺少答案或选项`);
        return null;
      }

      // 根据文本相似度选择
      const scoredChoices = question.choices.map(choice => ({
        choice,
        score: calculateSimilarity(choice.text, aiAnswer)
      })).sort((a, b) => b.score - a.score);

      const topChoices = scoredChoices.filter(item => item.score > 0.5);
      
      if (topChoices.length > 0) {
        console.log(`✅ 找到 ${topChoices.length} 个相似选项`);
        return topChoices.map(item => item.choice);
      }

      console.warn(`❌ 未找到相似选项，问题: ${question.text}`);
      return null;
    }
  };

  // 文本相似度计算
  function calculateSimilarity(text1, text2) {
    text1 = text1.toLowerCase();
    text2 = text2.toLowerCase();
    
    const commonChars = new Set([...text1].filter(char => text2.includes(char)));
    const totalChars = new Set([...text1, ...text2]);
    
    return commonChars.size / totalChars.size;
  }

  // 选择并点击选项
  function selectAndClickChoices(question, choices) {
    if (!choices || choices.length === 0) return false;

    try {
      // 查找复选框和单选按钮
      const findInputElements = (choice) => {
        // 尝试通过标签文本查找
        const labelWithText = Array.from(document.querySelectorAll('label'))
          .find(label => label.textContent.trim() === choice.text.trim());
        
        if (labelWithText) {
          const input = labelWithText.querySelector('input[type="checkbox"], input[type="radio"]');
          return input || labelWithText;
        }

        // 尝试通过相邻元素查找
        const choiceElements = Array.from(document.querySelectorAll('input[type="checkbox"], input[type="radio"]'))
          .filter(input => {
            const label = input.closest('label') || input.nextElementSibling;
            return label && label.textContent.trim().includes(choice.text.trim());
          });

        return choiceElements.length > 0 ? choiceElements[0] : null;
      };

      // 点击选项
      choices.forEach(choice => {
        const element = findInputElements(choice);
        
        if (element) {
          // 模拟点击
          if (element.type === 'radio' || element.type === 'checkbox') {
            element.checked = true;
            element.dispatchEvent(new Event('change', { bubbles: true }));
          } else if (element.tagName === 'LABEL') {
            element.click();
          }
          
          console.log(`🖱️ 选择问题 "${question.text}" 的选项: ${choice.text}`);
        } else {
          console.warn(`⚠️ 未找到问题 "${question.text}" 的选项: ${choice.text}`);
        }
      });

      return true;
    } catch (error) {
      console.error(`❌ 选择问题 "${question.text}" 的选项时发生错误:`, error);
      return false;
    }
  }

  // 主处理逻辑
  questions.forEach(question => {
    console.log(`🔬 处理问题: ${question.text}`);
    
    // 尝试默认策略
    let selectedChoices = selectionStrategies.default(question, question.aiAnswer);
    
    // 如果默认策略失败，尝试模糊匹配
    if (!selectedChoices) {
      selectedChoices = selectionStrategies.fuzzy(question, question.aiAnswer);
    }

    // 选择并点击选项
    if (selectedChoices) {
      const selectionResult = selectAndClickChoices(question, selectedChoices);
      
      if (selectionResult) {
        console.log(`✅ 成功为问题 "${question.text}" 选择答案`);
      } else {
        console.warn(`⚠️ 无法为问题 "${question.text}" 选择答案`);
      }
    } else {
      console.warn(`❌ 无法为问题 "${question.text}" 确定答案`);
    }
  });

  console.groupEnd();
}

// 使用 runtime.onMessage.addListener 监听消息
function setupMessageListener() {
  console.log('设置消息监听器');
  
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Content Script 收到消息:', request);
    
    try {
      switch (request.action) {
        case 'extractQuestions':
          const questions = extractQuestions();
          console.log('发送问题:', questions);
          sendResponse({ questions: questions });
          return true; // 异步响应
        
        case 'autoSelectAnswers':
          if (request.questions) {
            autoSelectAnswers(request.questions);
            sendResponse({ success: true });
          } else {
            sendResponse({ success: false, error: '未提供问题' });
          }
          return true; // 异步响应
        
        default:
          console.warn('未知的消息类型:', request.action);
          sendResponse({ error: '未知的消息类型' });
          return false;
      }
    } catch (error) {
      console.error('处理消息时发生错误:', error);
      sendResponse({ error: error.message });
      return false;
    }
  });
}

// 页面加载完成后设置监听器
if (document.readyState === 'complete') {
  setupMessageListener();
} else {
  window.addEventListener('load', setupMessageListener);
}

// 立即尝试设置监听器（兼容性）
setupMessageListener();
