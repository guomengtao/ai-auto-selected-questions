# Webpage Question Extractor Chrome Extension

## Overview
The Webpage Question Extractor is a Chrome extension designed to automatically extract questions and their options from web pages, specifically targeting online quiz and exam platforms. It also integrates with Azure's AI services to provide answers to these questions.

## Features
- Extracts question text and multiple-choice options from web pages.
- Displays extracted questions and options in a user-friendly popup interface.
- Sends questions to Azure's AI for automated answering.

## Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/ai-auto-selected-questions.git
   ```
2. Open Chrome and navigate to `chrome://extensions/`.
3. Enable "Developer mode" in the top right corner.
4. Click "Load unpacked" and select the extension directory.

## Usage
1. Navigate to a webpage containing questions.
2. Click the extension icon and press "Extract Questions".
3. View extracted questions and options.
4. Optionally, click "Get AI Answers" to retrieve answers from Azure's AI.

## Files
- `manifest.json`: Configuration file for the Chrome extension.
- `content.js`: Contains the logic for extracting questions from web pages.
- `popup.html`: Defines the structure of the popup interface.
- `popup.js`: Handles interactions within the popup, including communication with Azure's AI.
- `images/`: Contains icons for the extension.

## Permissions
- `activeTab`: Allows the extension to access the currently active tab.
- `scripting`: Enables the execution of scripts on the current tab.

## Dependencies
- Azure Cognitive Services for AI-powered answers.

## Contributing
Feel free to fork the repository and submit pull requests. For major changes, please open an issue first to discuss what you would like to change.

## License
This project is licensed under the MIT License.

## Contact
For any questions or suggestions, please contact [your email].
