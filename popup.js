// popup.js

// Azure OpenAI configuration
const AZURE_CONFIG = {
  apiKey: 'Cr9ICNzoHoS679HhHqqoSiihxhWQh3t9qZlt5W3zndPlVcJQ4sxxJQQJ99AJACYeBjFXJ3w3AAAFACOGAyXD',
  endpoint: 'https://tom912.cognitiveservices.azure.com'
};

let currentQuestions = [];

function showStatus(message, isError = false) {
  const status = document.getElementById('status');
  status.textContent = message;
  status.style.display = 'block';
  status.className = isError ? 'error' : 'success';
}

async function getAIAnswer(question, choices) {
  const prompt = `Question: ${question}\nChoices:\n${choices.map(c => `${c.letter}. ${c.text}`).join('\n')}\n\nPlease provide the correct answer with a brief explanation.`;
  
  try {
    const response = await fetch(`${AZURE_CONFIG.endpoint}/openai/deployments/gpt-35-turbo/chat/completions?api-version=2023-05-15`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': AZURE_CONFIG.apiKey
      },
      body: JSON.stringify({
        messages: [
          { role: "system", content: "You are a helpful AI assistant that answers multiple choice questions with explanations." },
          { role: "user", content: prompt }
        ],
        max_tokens: 150
      })
    });

    if (!response.ok) {
      throw new Error('Failed to get AI response');
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error('Error getting AI answer:', error);
    return 'Error: Could not get AI answer';
  }
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

async function handleAIAnswers() {
  const aiButton = document.getElementById('get-ai-answers');
  aiButton.disabled = true;
  aiButton.innerHTML = 'Getting Answers... <span class="loading">↻</span>';
  
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
    loadingDiv.innerHTML = 'Getting AI answer... <span class="loading">↻</span>';
    li.appendChild(loadingDiv);
    
    // Get AI answer
    const answer = await getAIAnswer(question.questionText, question.choices);
    
    // Update with actual answer
    const answerDiv = document.createElement('div');
    answerDiv.className = 'ai-answer';
    answerDiv.innerHTML = `<div class="ai-answer-label">AI Answer:</div>${answer}`;
    li.replaceChild(answerDiv, loadingDiv);
  }
  
  aiButton.innerHTML = 'Get AI Answers';
  aiButton.disabled = false;
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
