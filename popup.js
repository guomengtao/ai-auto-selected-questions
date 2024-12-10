// popup.js

// Coze AI Configuration
const COZE_API_KEY = 'pat_2R3oaaWVgYYzwl6fE17d4TUXI7Vrj2axBHAq9itiSvaQCSfDRdP1TB6EUxK17xBC';
const COZE_BOT_ID = '7446605387228397603';
const COZE_API_URL = 'https://api.coze.cn/open_api/v2/chat';

async function getCozeAIAnswer(question, choices) {
  try {
    // 构建详细的提示词
    const prompt = `问题：${question}\n\n选项：\n${choices.map(c => `${c.letter}. ${c.text}`).join('\n')}\n\n请仔细分析以下多选题，并严格按照以下要求回答：
1. 返回格式[答案是 A、B、C、D 或其组合（如 AD）]
2. 不要提供任何其他解释或详细信息,返回格式"答案是"三个字必须有
3. 直接给出最准确的答案`;

    // 准备请求负载
    const payload = {
      bot_id: COZE_BOT_ID,
      user: "extension_user",
      query: prompt,
      stream: false
    };

    // 发起 API 请求
    const response = await fetch(COZE_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${COZE_API_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    // 详细的错误处理
    if (!response.ok) {
      const errorBody = await response.text();
      const fullErrorInfo = {
        status: response.status,
        statusText: response.statusText,
        errorBody: errorBody
      };
      
      console.error('Coze API 完整错误信息:', fullErrorInfo);
      
      // 特定错误处理
      if (response.status === 403) {
        return {
          error: '错误：访问被拒绝。可能是API密钥问题。',
          fullErrorInfo: fullErrorInfo
        };
      }
      
      return {
        error: `错误：API请求失败 (状态码: ${response.status})`,
        fullErrorInfo: fullErrorInfo
      };
    }

    // 解析响应
    const data = await response.json();

    // 记录完整的 API 响应
    console.log('完整的 Coze API 响应:', JSON.stringify(data, null, 2));

    // 从多个消息中提取最终答案
    let aiResponse = '';
    const answerMessage = data.messages.find(msg => 
      msg.type === 'answer' && msg.content_type === 'text'
    );

    if (answerMessage) {
      aiResponse = answerMessage.content;
    }

    // 如果没有找到答案消息，尝试从最后一个消息获取
    if (!aiResponse && data.messages.length > 0) {
      aiResponse = data.messages[data.messages.length - 1].content;
    }

    // 提取答案
    const correctAnswer = extractCorrectAnswer(aiResponse);

    // 准备详细的响应信息
    const responseDetails = {
      originalQuestion: question,
      choices: choices,
      aiRawResponse: aiResponse,
      matchedChoice: null,
      fullApiResponse: data
    };

    console.log('AI 响应详细信息:', responseDetails);

    return {
      answer: correctAnswer,
      rawResponse: aiResponse,
      responseDetails: responseDetails
    };

  } catch (error) {
    console.error('获取AI答案时发生完整错误:', error);
    return {
      error: `错误：${error.message}`,
      fullError: error
    };
  }
}

async function getAIAnswersForQuestions(questions) {
  console.log('开始获取 AI 答案', questions);
  
  // 检查是否有问题
  if (!questions || questions.length === 0) {
    throw new Error('没有可解答的问题');
  }

  try {
    const processedQuestions = [];
    for (const question of questions) {
      try {
        const aiResult = await getCozeAIAnswer(question.text, question.choices);
        
        // 处理不同类型的 AI 结果
        if (aiResult.error) {
          processedQuestions.push({
            ...question,
            aiAnswer: `错误：${aiResult.error}`,
            status: 'error',
            responseDetails: aiResult
          });
        } else if (aiResult.answer) {
          // 尝试解析 AI 响应
          const finalAIAnswer = aiResult.answer;
          
          const processedQuestion = {
            ...question,
            aiAnswer: finalAIAnswer,
            status: 'success',
            aiResponse: aiResult.rawResponse
          };

          processedQuestions.push(processedQuestion);

          // 历史记录保存已禁用
          console.log('历史记录保存已禁用');
        } else {
          processedQuestions.push({
            ...question,
            aiAnswer: 'AI未能提供有效答案',
            status: 'error'
          });
        }
      } catch (error) {
        console.error(`处理问题 "${question.text}" 时发生错误:`, error);
        processedQuestions.push({
          ...question,
          aiAnswer: `错误：${error.message}`,
          status: 'error'
        });
      }
    }

    return processedQuestions;
  } catch (error) {
    console.error('处理 AI 答案时发生全局错误:', error);
    
    // 创建错误详情模态框
    const errorModal = document.createElement('div');
    errorModal.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 90%;
      max-width: 600px;
      background-color: white;
      border: 2px solid red;
      border-radius: 10px;
      padding: 20px;
      z-index: 1000;
    `;

    errorModal.innerHTML = `
      <h2 style="color: red;">AI 请求发生错误</h2>
      <p>错误详情: ${error.message}</p>
      <pre>${JSON.stringify(error, null, 2)}</pre>
      <button id="close-error-modal" style="
        background-color: red; 
        color: white; 
        border: none; 
        padding: 10px 20px; 
        border-radius: 5px; 
        cursor: pointer;
      ">关闭</button>
    `;

    const closeButton = errorModal.querySelector('#close-error-modal');
    closeButton.addEventListener('click', () => {
      document.body.removeChild(errorModal);
    });

    document.body.appendChild(errorModal);

    return [];
  }
}

function renderQuestions(questions) {
  const questionsContainer = document.getElementById('questions-container');
  questionsContainer.innerHTML = ''; // 清空之前的内容

  questions.forEach((question, index) => {
    const questionElement = document.createElement('div');
    questionElement.classList.add('question');

    // 问题文本
    const questionTextElement = document.createElement('p');
    questionTextElement.textContent = question.text;
    questionElement.appendChild(questionTextElement);

    // 选项
    const choicesElement = document.createElement('div');
    question.choices.forEach(choice => {
      const choiceElement = document.createElement('p');
      choiceElement.textContent = `${choice.letter}. ${choice.text}`;
      
      choicesElement.appendChild(choiceElement);
    });
    questionElement.appendChild(choicesElement);

    // AI 答案
    const aiAnswerElement = document.createElement('p');
    aiAnswerElement.innerHTML = `<strong>AI答案:</strong> ${question.aiAnswer || '暂无AI答案'}`;
    questionElement.appendChild(aiAnswerElement);

    questionsContainer.appendChild(questionElement);
  });
}

let currentQuestions = [];
let lastAIAnswers = [];

// 按钮状态管理工具
const ButtonStateManager = {
  // 更新按钮状态
  updateButtonState(buttonId, state) {
    const button = document.getElementById(buttonId);
    if (!button) return;

    switch (state) {
      case 'processing':
        button.disabled = true;
        button.classList.add('processing');
        button.style.backgroundColor = '#FFA500'; // 橙色
        button.style.color = 'white';
        break;
      case 'success':
        button.disabled = false;
        button.classList.remove('processing');
        button.style.backgroundColor = '#4CAF50'; // 绿色
        button.style.color = 'white';
        break;
      case 'error':
        button.disabled = false;
        button.classList.remove('processing');
        button.style.backgroundColor = '#FF6347'; // 红色
        button.style.color = 'white';
        break;
      case 'reset':
        button.disabled = false;
        button.classList.remove('processing');
        button.style.backgroundColor = ''; // 恢复默认
        button.style.color = '';
        break;
    }
  },

  // 设置按钮文本
  setButtonText(buttonId, text) {
    const button = document.getElementById(buttonId);
    if (button) {
      button.textContent = text;
    }
  }
};

// 初始化按钮事件监听器
function initializeButtonListeners() {
  // 获取按钮元素，并添加安全检查
  const extractQuestionsButton = document.getElementById('get-questions');
  const getAIAnswersButton = document.getElementById('get-ai-answers');
  const autoSelectAnswersButton = document.getElementById('auto-select-answers');
  const viewHistoryButton = document.getElementById('view-history');

  // 安全检查：确保所有按钮都存在
  const buttonsToCheck = [
    { id: 'get-questions', name: '提取问题' },
    { id: 'get-ai-answers', name: '获取AI答案' },
    { id: 'auto-select-answers', name: '自动选择答案' },
    { id: 'view-history', name: '查看历史' }
  ];

  const missingButtons = buttonsToCheck.filter(btn => {
    const button = document.getElementById(btn.id);
    if (!button) {
      console.error(`缺少 ${btn.name} 按钮`);
      return true;
    }
    return false;
  });

  // 如果有缺失的按钮，中断初始化
  if (missingButtons.length > 0) {
    console.error('无法初始化按钮监听器，缺少以下按钮:', 
      missingButtons.map(btn => btn.name).join(', '));
    return;
  }

  // 初始状态：禁用 AI 解答和自动选择按钮
  getAIAnswersButton.disabled = true;
  autoSelectAnswersButton.style.display = 'none';

  // 提取问题按钮
  extractQuestionsButton.addEventListener('click', async () => {
    try {
      // 更新按钮状态为处理中
      ButtonStateManager.updateButtonState('get-questions', 'processing');
      ButtonStateManager.setButtonText('get-questions', '正在提取问题...');

      // 检查当前是否在支持的网页上
      const activeTab = await new Promise((resolve, reject) => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (chrome.runtime.lastError) {
            reject(new Error('无法获取当前活动标签页'));
          } else {
            resolve(tabs[0]);
          }
        });
      });

      // 检查网页协议
      if (!activeTab.url.startsWith('http://') && !activeTab.url.startsWith('https://')) {
        throw new Error('当前页面不是有效的网页');
      }

      currentQuestions = await extractQuestionsFromPage();
      
      // 检查提取的问题数量
      if (currentQuestions.length === 0) {
        throw new Error('未检测到任何问题');
      }

      renderQuestions(currentQuestions);

      // 更新按钮状态为成功
      ButtonStateManager.updateButtonState('get-questions', 'success');
      ButtonStateManager.setButtonText('get-questions', `提取问题 ✓ (${currentQuestions.length}个)`);

      // 启用 AI 解答按钮
      getAIAnswersButton.disabled = false;
      ButtonStateManager.updateButtonState('get-ai-answers', 'reset');

      // 显示详细信息
      const statusDiv = document.getElementById('status');
      statusDiv.textContent = `成功提取 ${currentQuestions.length} 个问题`;
      statusDiv.style.color = 'green';
    } catch (error) {
      console.error('提取问题时发生错误:', error);
      
      // 更新按钮状态为错误
      ButtonStateManager.updateButtonState('get-questions', 'error');
      ButtonStateManager.setButtonText('get-questions', '提取问题 ✘');

      // 显示详细错误信息
      const statusDiv = document.getElementById('status');
      statusDiv.textContent = `错误: ${error.message}`;
      statusDiv.style.color = 'red';

      // 可能的错误原因分析
      let detailedErrorMessage = '';
      if (error.message.includes('无法获取当前活动标签页')) {
        detailedErrorMessage = '无法获取当前标签页，请确保插件有权限访问当前页面';
      } else if (error.message.includes('当前页面不是有效的网页')) {
        detailedErrorMessage = '仅支持 HTTP/HTTPS 协议的网页';
      } else if (error.message.includes('未检测到任何问题')) {
        detailedErrorMessage = '页面中未找到符合要求的问题，请检查页面内容';
      } else if (error.message.includes('发送消息失败')) {
        detailedErrorMessage = '与内容脚本通信失败，请检查插件权限';
      } else {
        detailedErrorMessage = '未知错误，请检查网页和插件设置';
      }

      // 在控制台和状态区域显示详细错误信息
      console.error('详细错误信息:', detailedErrorMessage);
      statusDiv.textContent += `\n${detailedErrorMessage}`;
    }
  });

  // 获取 AI 答案按钮
  getAIAnswersButton.addEventListener('click', async () => {
    // 检查是否有问题
    if (currentQuestions.length === 0) {
      alert('请先提取问题');
      return;
    }

    try {
      // 更新按钮状态为处理中
      ButtonStateManager.updateButtonState('get-ai-answers', 'processing');
      ButtonStateManager.setButtonText('get-ai-answers', '正在获取AI答案...');

      // 获取 AI 答案
      const aiAnswers = await getAIAnswersForQuestions(currentQuestions);
      
      // 渲染问题和 AI 答案
      renderQuestions(aiAnswers);
      
      // 保存 AI 答案
      lastAIAnswers = aiAnswers;

      // 更新按钮状态为成功
      ButtonStateManager.updateButtonState('get-ai-answers', 'success');
      ButtonStateManager.setButtonText('get-ai-answers', '获取AI答案 ✓');

      // 显示自动选择答案按钮
      autoSelectAnswersButton.style.display = 'block';
      ButtonStateManager.updateButtonState('auto-select-answers', 'reset');

      // 更新状态信息
      const statusDiv = document.getElementById('status');
      statusDiv.textContent = `成功获取 ${aiAnswers.length} 个问题的 AI 答案`;
      statusDiv.style.color = 'green';
    } catch (error) {
      console.error('获取 AI 答案时发生错误:', error);
      
      // 更新按钮状态为错误
      ButtonStateManager.updateButtonState('get-ai-answers', 'error');
      ButtonStateManager.setButtonText('get-ai-answers', '获取AI答案 ✘');

      // 显示错误信息
      const statusDiv = document.getElementById('status');
      statusDiv.textContent = `错误: ${error.message}`;
      statusDiv.style.color = 'red';

      // 详细错误分析
      let detailedErrorMessage = '';
      if (error.message.includes('没有可解答的问题')) {
        detailedErrorMessage = '未找到可以解答的问题';
      } else if (error.message.includes('API 请求失败')) {
        detailedErrorMessage = 'AI 服务请求失败，请检查网络连接';
      } else {
        detailedErrorMessage = '未知错误，请稍后重试';
      }

      console.error('详细错误信息:', detailedErrorMessage);
      statusDiv.textContent += `\n${detailedErrorMessage}`;
    }
  });

  // 自动选择答案按钮
  autoSelectAnswersButton.addEventListener('click', async () => {
    if (lastAIAnswers.length === 0) {
      alert('请先获取 AI 答案');
      return;
    }

    try {
      // 更新按钮状态为处理中
      ButtonStateManager.updateButtonState('auto-select-answers', 'processing');
      ButtonStateManager.setButtonText('auto-select-answers', '正在选择答案...');

      const activeTab = await new Promise((resolve, reject) => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve(tabs[0]);
          }
        });
      });

      // 发送选择答案的消息
      chrome.tabs.sendMessage(activeTab.id, {
        action: 'autoSelectAnswers',
        questions: lastAIAnswers
      });

      // 更新按钮状态为成功
      ButtonStateManager.updateButtonState('auto-select-answers', 'success');
      ButtonStateManager.setButtonText('auto-select-answers', '自动选择答案 ✓');

      // 更新状态信息
      const statusDiv = document.getElementById('status');
      statusDiv.textContent = `成功为 ${lastAIAnswers.length} 个问题选择答案`;
      statusDiv.style.color = 'green';
    } catch (error) {
      console.error('自动选择答案时发生错误:', error);
      
      // 更新按钮状态为错误
      ButtonStateManager.updateButtonState('auto-select-answers', 'error');
      ButtonStateManager.setButtonText('auto-select-answers', '自动选择答案 ✘');

      // 显示错误信息
      const statusDiv = document.getElementById('status');
      statusDiv.textContent = `错误: ${error.message}`;
      statusDiv.style.color = 'red';
    }
  });

  // 查看历史按钮
  viewHistoryButton.addEventListener('click', () => {
    alert('历史记录功能已禁用');
  });
}

// Chrome API 调试函数
function debugChromeAPI() {
  try {
    // 检查基本 Chrome API
    if (typeof chrome === 'undefined') {
      console.error('Chrome API 未定义');
      return false;
    }

    // 检查常用 API
    const requiredAPIs = [
      'runtime', 
      'tabs', 
      'storage'
    ];

    const missingAPIs = requiredAPIs.filter(api => !chrome[api]);

    if (missingAPIs.length > 0) {
      console.warn('缺少以下 Chrome API:', missingAPIs);
      // 对于可选的 API，我们只给出警告，而不是完全阻止
      return true;
    }

    console.log('Chrome API 基本检查通过');
    return true;
  } catch (error) {
    console.error('Chrome API 检查发生错误:', error);
    return false;
  }
}

// 状态显示函数
function showStatus(message, isError = false) {
  const statusElement = document.getElementById('status');
  if (statusElement) {
    statusElement.textContent = message;
    statusElement.style.color = isError ? 'red' : 'green';
  } else {
    console.error('状态元素未找到');
  }
}

// 页面加载时的初始化
document.addEventListener('DOMContentLoaded', async () => {
  // 调试 Chrome API
  if (!debugChromeAPI()) {
    showStatus('Chrome API 检查失败', true);
    return;
  }

  // 初始化按钮事件监听器
  initializeButtonListeners();

  // 禁用 AI 解答按钮
  const getAIAnswersButton = document.getElementById('get-ai-answers');
  if (getAIAnswersButton) {
    getAIAnswersButton.disabled = true;
    getAIAnswersButton.classList.add('disabled');
  }

  // 隐藏自动选择答案按钮
  const autoSelectAnswersButton = document.getElementById('auto-select-answers');
  if (autoSelectAnswersButton) {
    autoSelectAnswersButton.style.display = 'none';
  }
});

// 从 AI 答案中提取括号内的答案
function extractAnswersFromParentheses(aiAnswer) {
  // 正则表达式匹配括号内的大写字母
  const parenthesesMatch = aiAnswer.match(/[（(]([A-Z]+)[）)]/);
  
  if (parenthesesMatch) {
    return parenthesesMatch[1].split('').map(letter => letter.trim());
  }
  
  // 如果没有找到括号，尝试其他匹配方式
  const otherMatch = aiAnswer.match(/答案[是：:]([A-Z]+)/);
  if (otherMatch) {
    return otherMatch[1].split('').map(letter => letter.trim());
  }
  
  return [];
}

// 格式化 AI 答案
function formatAIAnswer(aiAnswer, extractedAnswers, question) {
  // 首先尝试从 AI 答案中提取答案
  const answerLetters = extractedAnswers.length > 0 
    ? extractedAnswers.join('')
    : (question.aiSelectedChoice ? question.aiSelectedChoice.letter : '未知');

  // 构建答案的第一行
  let formattedAnswer = `The answer is (${answerLetters})`;

  // 如果有更多详细信息，添加到第二行
  if (aiAnswer && aiAnswer.trim() !== '') {
    formattedAnswer += `\n\n详细解析：${aiAnswer}`;
  }

  return formattedAnswer;
}

// 本地存储管理工具
async function saveQuestionHistory(question, aiResponse, correctAnswer) {
  console.log('历史记录保存已禁用');
}

// 提取问题的函数，增加错误处理
async function extractQuestionsFromPage() {
  try {
    // 获取当前活动标签页
    const activeTab = await new Promise((resolve, reject) => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (chrome.runtime.lastError) {
          reject(new Error('无法获取当前活动标签页'));
        } else {
          resolve(tabs[0]);
        }
      });
    });

    // 发送消息提取问题
    return new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(activeTab.id, { action: 'extractQuestions' }, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error('发送消息失败'));
          return;
        }

        if (!response) {
          reject(new Error('未收到内容脚本的响应'));
          return;
        }

        if (!response.questions || response.questions.length === 0) {
          reject(new Error('未检测到任何问题'));
          return;
        }

        // 使用 Set 去重
        const uniqueQuestions = Array.from(
          new Set(response.questions.map(q => JSON.stringify({
            text: q.text,
            choices: q.choices.map(c => c.text)
          })))
        ).map(q => JSON.parse(q));

        const processedQuestions = uniqueQuestions.map(uq => 
          response.questions.find(q => 
            q.text === uq.text && 
            q.choices.some(c => uq.choices.includes(c.text))
          )
        );

        resolve(processedQuestions);
      });
    });
  } catch (error) {
    console.error('提取问题时发生错误:', error);
    throw error; // 重新抛出错误以便在调用处处理
  }
}

// 提取正确答案的函数
function extractCorrectAnswer(aiResponse) {
  console.group('🔍 提取正确答案');
  console.log('原始 AI 响应:', aiResponse);

  // 如果响应为空，返回 null
  if (!aiResponse) {
    console.warn('❌ AI 响应为空');
    console.groupEnd();
    return null;
  }

  // 正则表达式匹配带顿号的答案格式
  const answerRegex = /答案是\s*([A-D、]+)/i;
  const match = aiResponse.match(answerRegex);

  if (match) {
    // 替换顿号，并去重
    const extractedAnswer = match[1]
      .replace(/、/g, '')  // 移除顿号
      .toUpperCase()       // 转大写
      .split('')           // 转为数组
      .filter((v, i, arr) => arr.indexOf(v) === i)  // 去重
      .sort()              // 排序
      .join('');           // 转回字符串

    console.log('✅ 提取的答案:', extractedAnswer);
    console.groupEnd();
    return extractedAnswer;
  }

  // 如果没有匹配到 "答案是"，尝试更宽松的匹配
  const looseRegex = /([ABCD、]+)/i;
  const looseMatch = aiResponse.match(looseRegex);

  if (looseMatch) {
    const extractedAnswer = looseMatch[1]
      .replace(/、/g, '')  // 移除顿号
      .toUpperCase()       // 转大写
      .split('')           // 转为数组
      .filter((v, i, arr) => arr.indexOf(v) === i)  // 去重
      .sort()              // 排序
      .join('');           // 转回字符串

    console.warn('⚠️ 使用宽松匹配提取答案:', extractedAnswer);
    console.groupEnd();
    return extractedAnswer;
  }

  console.warn('❌ 未能从 AI 响应中提取正确答案');
  console.groupEnd();
  return null;
}
