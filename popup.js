// popup.js

// Coze AI Configuration
const COZE_API_KEY = 'pat_2R3oaaWVgYYzwl6fE17d4TUXI7Vrj2axBHAq9itiSvaQCSfDRdP1TB6EUxK17xBC';
const COZE_BOT_ID = '7446605387228397603';
const COZE_API_URL = 'https://api.coze.cn/open_api/v2/chat';

async function getCozeAIAnswer(question, choices) {
  try {
    // Construct a detailed prompt for the AI
    const prompt = `问题：${question}\n\n选项：\n${choices.map(c => `${c.letter}. ${c.text}`).join('\n')}\n\n请仔细分析这个问题，并给出最可能的正确答案。请提供简要解释，说明为什么这个选项是最佳答案。`;

    // Prepare the request payload
    const payload = {
      bot_id: COZE_BOT_ID,
      user: "extension_user",
      query: prompt,
      stream: false
    };

    // Make API request to Coze
    const response = await fetch(COZE_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${COZE_API_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    // Detailed error logging
    if (!response.ok) {
      const errorBody = await response.text();
      console.error('Coze API Error:', {
        status: response.status,
        statusText: response.statusText,
        errorBody: errorBody
      });
      
      // Specific error handling
      if (response.status === 403) {
        return '错误：访问被拒绝。可能是API密钥问题。';
      }
      
      return `错误：API请求失败 (状态码: ${response.status})`;
    }

    // Parse the response
    const data = await response.json();

    // Validate response
    if (!data || !data.messages || data.messages.length === 0) {
      console.error('Unexpected API response:', data);
      return '错误：未能获取AI答案';
    }

    // Extract the AI's response
    const aiResponse = data.messages.find(msg => msg.type === 'answer')?.content || 
                       data.messages[data.messages.length - 1]?.content;

    if (!aiResponse) {
      console.error('No valid response found:', data);
      return '错误：未能生成有效答案';
    }

    console.log('AI Answer received successfully');
    return aiResponse.trim();

  } catch (error) {
    console.error('获取Coze AI答案时发生错误:', error);
    
    // More specific error handling
    if (error.name === 'TypeError') {
      return '错误：网络连接问题，请检查您的网络';
    }
    
    return '错误：无法获取AI答案';
  }
}

async function handleAIAnswers() {
  const aiButton = document.getElementById('get-ai-answers');
  aiButton.disabled = true;
  aiButton.innerHTML = '正在获取答案... <span class="loading">↻</span>';
  
  for (let i = 0; i < currentQuestions.length; i++) {
    const question = currentQuestions[i];
    const li = document.getElementById(`question-${i}`);
    
    // Remove existing AI answer if any
    const existingAnswer = li.querySelector('.ai-answer');
    if (existingAnswer) {
      existingAnswer.remove();
    }
    
    // Create and add loading indicator
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'ai-answer';
    loadingDiv.innerHTML = '正在获取AI答案... <span class="loading">↻</span>';
    li.appendChild(loadingDiv);
    
    // Get AI answer
    const answer = await getCozeAIAnswer(question.questionText, question.choices);
    
    // Update with actual answer
    const answerDiv = document.createElement('div');
    answerDiv.className = 'ai-answer';
    answerDiv.innerHTML = `<div class="ai-answer-label">AI答案：</div>${answer}`;
    li.replaceChild(answerDiv, loadingDiv);
  }
  
  aiButton.innerHTML = '获取AI答案';
  aiButton.disabled = false;
}

let currentQuestions = [];

function showStatus(message, isError = false) {
  const status = document.getElementById('status');
  status.textContent = message;
  status.style.display = 'block';
  status.className = isError ? 'error' : 'success';
}

function displayQuestions(questions) {
  const questionList = document.getElementById('question-list');
  const aiButton = document.getElementById('get-ai-answers');
  questionList.innerHTML = '';
  currentQuestions = questions;
  
  if (questions.length === 0) {
    showStatus('No questions found on this page.', true);
    aiButton.disabled = true;
    return;
  }

  showStatus(`Found ${questions.length} questions on this page!`);
  aiButton.disabled = false;
  
  questions.forEach((q, index) => {
    const li = document.createElement('li');
    li.id = `question-${index}`;
    
    // Create question text
    const questionText = document.createElement('div');
    questionText.className = 'question-text';
    questionText.innerHTML = `<strong>Question ${index + 1}:</strong> ${q.questionText}`;
    
    // Create choices container
    const choices = document.createElement('div');
    choices.className = 'choices';
    q.choices.forEach(choice => {
      const choiceSpan = document.createElement('span');
      choiceSpan.className = 'choice';
      choiceSpan.innerHTML = `${choice.letter} ${choice.text}`;
      choices.appendChild(choiceSpan);
    });
    
    li.appendChild(questionText);
    li.appendChild(choices);
    questionList.appendChild(li);
  });
}

// Event Listeners
document.getElementById('get-questions').addEventListener('click', () => {
  const status = document.getElementById('status');
  status.style.display = 'block';
  showStatus('Searching for questions...');

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs.length === 0) {
      showStatus('No active tab found', true);
      return;
    }

    chrome.tabs.sendMessage(tabs[0].id, { action: 'extractQuestions' }, (response) => {
      if (chrome.runtime.lastError) {
        showStatus('Error: Could not find a question form on this page.', true);
        return;
      }

      if (response && response.questions) {
        console.log('Extracted Questions:', response.questions);
        displayQuestions(response.questions);
      } else {
        showStatus('No questions found on this page.', true);
      }
    });
  });
});

document.getElementById('get-ai-answers').addEventListener('click', handleAIAnswers);
