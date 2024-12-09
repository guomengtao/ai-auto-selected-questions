// content.js

// Function to extract questions from the webpage
function extractQuestions() {
  const questions = [];
  const questionElements = document.querySelectorAll('.que');

  questionElements.forEach((element) => {
    const questionText = element.querySelector('.qtext').innerText.trim();
    const choices = [];
    
    // Extract choices with their letters
    element.querySelectorAll('.answer .r0, .answer .r1').forEach(choiceDiv => {
      const letter = choiceDiv.querySelector('.answernumber').innerText.trim();
      const text = choiceDiv.querySelector('.flex-fill').innerText.trim();
      choices.push({ letter, text });
    });

    questions.push({
      questionText,
      choices
    });
  });

  return questions;
}

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extractQuestions') {
    const questions = extractQuestions();
    sendResponse({ questions });
  }
});
