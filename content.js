// 内容脚本主入口
(function() {
  // 确保脚本只执行一次
  if (window.contentScriptInjected) return;
  window.contentScriptInjected = true;

  console.log('[AI Question Assistant] Content script initializing');

  // 全局状态变量
  let currentQuestions = [];
  let lastAIAnswers = [];

  // 创建按钮的辅助函数
  function createButton(text, onClick) {
    const button = document.createElement('button');
    button.textContent = text;
    button.style.cssText = `
      width: 100%;
      padding: 10px;
      background-color: #4CAF50;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.3s ease;
      position: relative;
      margin-bottom: 10px;
    `;

    // 状态指示器
    const statusIndicator = document.createElement('span');
    statusIndicator.style.cssText = `
      position: absolute;
      right: 10px;
      top: 50%;
      transform: translateY(-50%);
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background-color: transparent;
      transition: all 0.3s ease;
    `;
    button.appendChild(statusIndicator);

    button.addEventListener('click', () => {
      // 重置所有按钮状态
      const buttons = document.querySelectorAll('#ai-question-assistant-container button');
      buttons.forEach(btn => {
        if (btn.querySelector('span')) {
          btn.style.backgroundColor = '#4CAF50';
          btn.querySelector('span').style.backgroundColor = 'transparent';
        }
      });

      // 当前按钮变色
      button.style.backgroundColor = '#45a049';
      if (statusIndicator) {
        statusIndicator.style.backgroundColor = '#FFA500'; // 橙色表示处理中
      }

      // 调用点击事件处理函数
      onClick();
    });

    return { button, statusIndicator };
  }

  // 创建悬浮容器的函数
  function createFloatingContainer() {
    const container = document.createElement('div');
    container.id = 'ai-question-assistant-container';
    container.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      width: 400px;
      background-color: white;
      border: 1px solid #ccc;
      border-radius: 8px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      z-index: 10000;
      padding: 15px;
      max-height: 80vh;
      overflow-y: auto;
      font-family: Arial, sans-serif;
    `;

    const titleBar = document.createElement('div');
    titleBar.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
      border-bottom: 1px solid #eee;
      padding-bottom: 10px;
    `;

    const title = document.createElement('h2');
    title.textContent = 'AI Question Assistant';
    title.style.margin = '0';
    title.style.fontSize = '18px';

    const closeButton = document.createElement('button');
    closeButton.textContent = '×';
    closeButton.style.cssText = `
      background: none;
      border: none;
      font-size: 24px;
      cursor: pointer;
      color: #888;
    `;
    closeButton.addEventListener('click', () => {
      container.style.display = 'none';
    });

    titleBar.appendChild(title);
    titleBar.appendChild(closeButton);
    container.appendChild(titleBar);

    // 创建按钮容器
    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-top: 10px;
    `;

    // 创建按钮并添加事件处理
    const { button: extractQuestionsButton, statusIndicator: extractIndicator } = createButton('Extract Questions', () => {
      try {
        const questions = extractQuestions();
        
        if (questions.length === 0) {
          throw new Error('No questions found on the page');
        }

        currentQuestions = questions;
        renderQuestionsInPage(questions);
        updateDetailArea('success', `Successfully extracted ${questions.length} questions`);
        
        // 高亮问题元素
        highlightQuestionElements(questions);

        if (extractIndicator) {
          extractIndicator.style.backgroundColor = '#00FF00'; // 绿色表示成功
        }
      } catch (error) {
        updateDetailArea('error', error.message);
        if (extractIndicator) {
          extractIndicator.style.backgroundColor = '#FF0000'; // 红色表示失败
        }
      }
    });

    const { button: getAIAnswersButton, statusIndicator: aiAnswersIndicator } = createButton('Get AI Answers', () => {
      try {
        if (currentQuestions.length === 0) {
          throw new Error('Please extract questions first');
        }

        const aiAnswers = getAIAnswersForQuestions(currentQuestions);
        lastAIAnswers = aiAnswers;
        renderAIAnswersInPage(aiAnswers);
        updateDetailArea('success', `Successfully generated AI answers for ${aiAnswers.length} questions`);
        
        if (aiAnswersIndicator) {
          aiAnswersIndicator.style.backgroundColor = '#00FF00';
        }
      } catch (error) {
        updateDetailArea('error', error.message);
        if (aiAnswersIndicator) {
          aiAnswersIndicator.style.backgroundColor = '#FF0000';
        }
      }
    });

    const { button: autoSelectAnswersButton, statusIndicator: autoSelectIndicator } = createButton('Auto Select Answers', () => {
      try {
        if (lastAIAnswers.length === 0) {
          throw new Error('Please get AI answers first');
        }

        autoSelectAnswers(lastAIAnswers);
        updateDetailArea('success', `Successfully auto-selected answers for ${lastAIAnswers.length} questions`);
        
        if (autoSelectIndicator) {
          autoSelectIndicator.style.backgroundColor = '#00FF00';
        }
      } catch (error) {
        updateDetailArea('error', error.message);
        if (autoSelectIndicator) {
          autoSelectIndicator.style.backgroundColor = '#FF0000';
        }
      }
    });

    // 为所有问题随机选择答案的函数
    function randomFillAllQuestions() {
      try {
        // 查找所有问题容器
        const questionContainers = document.querySelectorAll('.que');
        
        // 存储随机填充的结果
        const randomFillResults = [];
        
        questionContainers.forEach((container, index) => {
          // 提取问题文本
          const questionTextElement = container.querySelector('.qtext, .formulation');
          const questionText = questionTextElement ? questionTextElement.textContent.trim() : `Question ${index + 1}`;
          
          // 查找输入元素（单选、复选框）
          const inputs = container.querySelectorAll('input[type="radio"], input[type="checkbox"]');
          const labels = container.querySelectorAll('label');
          
          if (inputs.length > 0) {
            // 随机选择一个输入元素
            const randomIndex = Math.floor(Math.random() * inputs.length);
            const selectedInput = inputs[randomIndex];
            const selectedLabel = labels[randomIndex];
            
            // 获取选项文本，如果没有则使用输入元素的属性
            const choiceText = selectedLabel 
              ? selectedLabel.textContent.trim() 
              : (selectedInput.value || selectedInput.id || `Choice ${randomIndex + 1}`);
            
            // 模拟点击
            selectedInput.click();
            
            // 触发 change 事件
            const event = new Event('change', { bubbles: true });
            selectedInput.dispatchEvent(event);
            
            // 记录随机填充结果
            randomFillResults.push({
              questionIndex: index + 1,
              questionText: questionText,
              selectedChoice: choiceText
            });
            
            console.log(`Randomly selected answer for question ${index + 1}: ${choiceText}`);
          }
        });

        // 清空并渲染随机填充结果
        const resultArea = document.getElementById('ai-question-result-area');
        if (resultArea) {
          resultArea.innerHTML = ''; // 清空之前的结果
          
          const titleElement = document.createElement('h3');
          titleElement.textContent = `Random Fill Results (${randomFillResults.length} questions)`;
          titleElement.style.cssText = `
            background-color: #f0f0f0;
            padding: 10px;
            margin-bottom: 15px;
            border-radius: 4px;
            text-align: center;
          `;
          resultArea.appendChild(titleElement);

          randomFillResults.forEach(result => {
            const resultElement = document.createElement('div');
            resultElement.style.cssText = `
              background-color: #f9f9f9;
              border: 1px solid #e0e0e0;
              border-radius: 4px;
              padding: 10px;
              margin-bottom: 10px;
              font-size: 14px;
            `;

            const questionTitle = document.createElement('strong');
            questionTitle.textContent = `Question ${result.questionIndex}: `;
            resultElement.appendChild(questionTitle);

            const questionText = document.createElement('span');
            questionText.textContent = result.questionText;
            resultElement.appendChild(questionText);

            const choiceElement = document.createElement('div');
            choiceElement.style.cssText = `
              margin-top: 5px;
              color: #4CAF50;
              font-weight: bold;
            `;
            choiceElement.textContent = `Selected Choice: ${result.selectedChoice}`;
            
            resultElement.appendChild(choiceElement);
            resultArea.appendChild(resultElement);
          });
        }

        // 更新详细信息区域
        updateDetailArea('success', `Randomly filled ${questionContainers.length} questions`);
        
        return randomFillResults;
      } catch (error) {
        console.error('Error randomly filling questions:', error);
        updateDetailArea('error', `Failed to randomly fill questions: ${error.message}`);
        return [];
      }
    }

    const { button: randomFillButton, statusIndicator: randomFillIndicator } = createButton('Random Fill All', () => {
      try {
        randomFillAllQuestions();
        
        if (randomFillIndicator) {
          randomFillIndicator.style.backgroundColor = '#00FF00';
        }
      } catch (error) {
        updateDetailArea('error', error.message);
        if (randomFillIndicator) {
          randomFillIndicator.style.backgroundColor = '#FF0000';
        }
      }
    });

    buttonContainer.appendChild(extractQuestionsButton);
    buttonContainer.appendChild(getAIAnswersButton);
    buttonContainer.appendChild(autoSelectAnswersButton);
    buttonContainer.appendChild(randomFillButton);

    container.appendChild(buttonContainer);

    // 结果显示区域
    const resultArea = document.createElement('div');
    resultArea.id = 'ai-question-result-area';
    resultArea.style.cssText = `
      margin-top: 15px;
      max-height: 300px;
      overflow-y: auto;
      border-top: 1px solid #eee;
      padding-top: 10px;
    `;
    container.appendChild(resultArea);

    // 详细信息展示区域
    const detailArea = document.createElement('div');
    detailArea.id = 'ai-question-detail-area';
    detailArea.style.cssText = `
      margin-top: 15px;
      padding: 10px;
      border-radius: 4px;
      font-size: 14px;
      max-height: 150px;
      overflow-y: auto;
    `;
    container.appendChild(detailArea);

    document.body.appendChild(container);
    return container;
  }

  // 高亮问题元素（针对 Moodle 考试页面优化）
  function highlightQuestionElements(questions) {
    // 移除之前的高亮
    const existingHighlights = document.querySelectorAll('.ai-question-highlight');
    existingHighlights.forEach(el => el.remove());

    // 创建问题总数显示区域
    const questionCountDisplay = document.createElement('div');
    questionCountDisplay.id = 'ai-question-count-display';
    questionCountDisplay.style.cssText = `
      position: fixed;
      top: 10px;
      left: 50%;
      transform: translateX(-50%);
      background-color: rgba(255, 107, 107, 0.9);
      color: white;
      padding: 10px 20px;
      border-radius: 20px;
      z-index: 10001;
      font-size: 16px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.2);
      font-weight: bold;
    `;
    questionCountDisplay.textContent = `Found ${questions.length} Questions`;
    document.body.appendChild(questionCountDisplay);

    // Moodle 特定的问题选择器
    const questionSelectors = [
      '.qtext',
      '.question-text', 
      '.quiz-question', 
      '.multiple-choice',
      '.exam-question',
      '[class*="question"]',
      '[id*="question"]'
    ];

    questions.forEach((question, index) => {
      // 尝试找到对应的问题元素
      let questionElement = null;
      
      // 在 Moodle 中，使用更精确的选择方式
      const questionContainers = document.querySelectorAll('.que');
      questionContainers.forEach(container => {
        const questionTextEl = container.querySelector('.qtext');
        if (questionTextEl && questionTextEl.textContent.includes(question.text.substring(0, 50))) {
          questionElement = container;
        }
      });

      if (!questionElement) return;

      // 创建高亮圆圈
      const highlightCircle = document.createElement('div');
      highlightCircle.classList.add('ai-question-highlight');
      highlightCircle.style.cssText = `
        position: absolute;
        border: 3px solid #FF6B6B;
        border-radius: 15px;
        pointer-events: none;
        z-index: 9999;
        animation: pulse 1.5s infinite;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        background-color: rgba(255, 107, 107, 0.2);
        text-shadow: 1px 1px 2px rgba(0,0,0,0.5);
      `;

      // 定位高亮圆圈
      const rect = questionElement.getBoundingClientRect();
      highlightCircle.style.width = `${Math.max(rect.width, 100)}px`;
      highlightCircle.style.height = `${Math.max(rect.height, 50)}px`;
      highlightCircle.style.left = `${rect.left + window.scrollX - 10}px`;
      highlightCircle.style.top = `${rect.top + window.scrollY - 10}px`;
      
      // 添加问题序号和类型
      const questionType = questionElement.classList.contains('truefalse') ? 'T/F' : 
                           questionElement.classList.contains('multichoice') ? 'MC' : 'Q';
      highlightCircle.textContent = `${questionType} ${index + 1}`;

      // 添加脉冲动画
      const styleSheet = document.createElement('style');
      styleSheet.textContent = `
        @keyframes pulse {
          0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255, 107, 107, 0.4); }
          70% { transform: scale(1.02); box-shadow: 0 0 0 15px rgba(255, 107, 107, 0); }
          100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255, 107, 107, 0); }
        }
      `;
      document.head.appendChild(styleSheet);

      document.body.appendChild(highlightCircle);
    });
  }

  // 提取问题的通用函数（针对 Moodle 考试页面优化）
  function extractQuestions() {
    console.log('开始提取问题');
    
    const questions = [];
    const questionContainers = document.querySelectorAll('.que');

    questionContainers.forEach((container, index) => {
      // 跳过信息类型的问题容器
      if (container.classList.contains('description')) return;

      const questionTextEl = container.querySelector('.qtext');
      if (!questionTextEl) return;

      const questionText = questionTextEl.textContent.trim();
      
      // 处理不同类型的问题
      let choices = [];
      if (container.classList.contains('truefalse')) {
        // 判断题
        choices = [
          { letter: 'A', text: '对' },
          { letter: 'B', text: '错' }
        ];
      } else if (container.classList.contains('multichoice')) {
        // 多选题
        const choiceEls = container.querySelectorAll('.answer .d-flex');
        choiceEls.forEach((choiceEl, choiceIndex) => {
          const letter = String.fromCharCode(65 + choiceIndex);
          const text = choiceEl.textContent.trim().replace(/^[A-Z]\. /, '');
          choices.push({ letter, text });
        });
      }

      if (questionText && choices.length > 0) {
        questions.push({ text: questionText, choices });
      }
    });

    return questions;
  }

  // 自动选择答案的函数（针对 Moodle 考试页面优化）
  function autoSelectAnswers(aiAnswers) {
    // 先高亮问题元素
    highlightQuestionElements(aiAnswers);

    const questionContainers = document.querySelectorAll('.que');

    aiAnswers.forEach((answer, index) => {
      const container = questionContainers[index];
      if (!container) return;

      // 处理判断题
      if (container.classList.contains('truefalse')) {
        const radioButtons = container.querySelectorAll('input[type="radio"]');
        const selectedChoice = answer.selectedChoice.text === '对' ? radioButtons[0] : radioButtons[1];
        if (selectedChoice) {
          selectedChoice.click();
        }
      } 
      // 处理多选题
      else if (container.classList.contains('multichoice')) {
        const radioButtons = container.querySelectorAll('input[type="radio"]');
        const selectedButton = Array.from(radioButtons).find(radio => {
          const label = radio.closest('label');
          return label && label.textContent.trim().includes(answer.selectedChoice.text);
        });

        if (selectedButton) {
          selectedButton.click();
        }
      }
    });
  }

  // 模拟 AI 生成答案的函数
  function getAIAnswersForQuestions(questions) {
    return questions.map((question, index) => {
      // 根据问题类型和内容生成模拟答案
      let answerText = '';
      
      // 判断题逻辑
      if (question.choices[0].text === '对') {
        // 随机选择 true 或 false
        answerText = Math.random() > 0.5 ? '对' : '错';
      } 
      // 多选题逻辑
      else if (question.choices.length > 0) {
        // 如果有选项，随机选择一个
        const randomIndex = Math.floor(Math.random() * question.choices.length);
        answerText = question.choices[randomIndex].text;
      } 
      // 简答题或其他类型
      else {
        // 生成一个通用的回答
        answerText = `AI generated answer for question ${index + 1}`;
      }

      return {
        questionIndex: index,
        text: answerText,
        selectedChoice: { text: answerText },
        confidence: Math.random().toFixed(2) // 随机置信度
      };
    });
  }

  // 更新详细信息区域的函数
  function updateDetailArea(type, message) {
    const detailArea = document.getElementById('ai-question-detail-area');
    if (!detailArea) return;

    detailArea.innerHTML = ''; // 清空之前的内容
    const messageElement = document.createElement('div');
    
    messageElement.style.cssText = `
      padding: 10px;
      border-radius: 4px;
      font-size: 14px;
      margin-bottom: 10px;
    `;

    switch(type) {
      case 'success':
        messageElement.style.backgroundColor = 'rgba(76, 175, 80, 0.1)';
        messageElement.style.color = '#4CAF50';
        messageElement.style.border = '1px solid rgba(76, 175, 80, 0.3)';
        break;
      case 'error':
        messageElement.style.backgroundColor = 'rgba(244, 67, 54, 0.1)';
        messageElement.style.color = '#F44336';
        messageElement.style.border = '1px solid rgba(244, 67, 54, 0.3)';
        break;
      case 'info':
      default:
        messageElement.style.backgroundColor = 'rgba(33, 150, 243, 0.1)';
        messageElement.style.color = '#2196F3';
        messageElement.style.border = '1px solid rgba(33, 150, 243, 0.3)';
    }

    messageElement.textContent = message;
    detailArea.appendChild(messageElement);
  }

  // 渲染问题到页面的函数
  function renderQuestionsInPage(questions) {
    const resultArea = document.getElementById('ai-question-result-area');
    if (!resultArea) return;

    resultArea.innerHTML = ''; // 清空之前的结果

    questions.forEach((question, index) => {
      const questionElement = document.createElement('div');
      questionElement.style.cssText = `
        background-color: #f9f9f9;
        border: 1px solid #e0e0e0;
        border-radius: 4px;
        padding: 10px;
        margin-bottom: 10px;
        font-size: 14px;
      `;

      const questionTitle = document.createElement('strong');
      questionTitle.textContent = `Question ${index + 1}: `;
      questionElement.appendChild(questionTitle);

      const questionText = document.createElement('span');
      questionText.textContent = question.text || 'No question text available';
      questionElement.appendChild(questionText);

      // 如果有选项，显示选项
      if (question.choices && question.choices.length > 0) {
        const choicesList = document.createElement('ul');
        choicesList.style.paddingLeft = '20px';
        choicesList.style.marginTop = '5px';

        question.choices.forEach(choice => {
          const choiceItem = document.createElement('li');
          choiceItem.textContent = choice.text;
          choicesList.appendChild(choiceItem);
        });

        questionElement.appendChild(choicesList);
      }

      resultArea.appendChild(questionElement);
    });
  }

  // 渲染 AI 答案到页面的函数
  function renderAIAnswersInPage(answers) {
    const resultArea = document.getElementById('ai-question-result-area');
    if (!resultArea) return;

    resultArea.innerHTML = ''; // 清空之前的结果

    answers.forEach((answer, index) => {
      const answerElement = document.createElement('div');
      answerElement.style.cssText = `
        background-color: #f0f7ff;
        border: 1px solid #b3d9ff;
        border-radius: 4px;
        padding: 10px;
        margin-bottom: 10px;
        font-size: 14px;
      `;

      const answerTitle = document.createElement('strong');
      answerTitle.textContent = `AI Answer for Question ${answer.questionIndex + 1}: `;
      answerElement.appendChild(answerTitle);

      const answerText = document.createElement('span');
      answerText.textContent = answer.text || 'No AI answer available';
      answerElement.appendChild(answerText);

      resultArea.appendChild(answerElement);
    });
  }

  // 初始化函数
  function initContentScript() {
    console.log('[AI Question Assistant] Initializing content script');
    
    // 创建悬浮容器
    createFloatingContainer();
  }

  // 根据页面加载状态初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initContentScript);
  } else {
    initContentScript();
  }

  console.log('[AI Question Assistant] Content script loaded');
})();
