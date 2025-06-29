document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Element References ---
    const chatBox = document.getElementById('chat-box');
    const userInput = document.getElementById('user-input');
    const sendBtn = document.getElementById('send-btn');

    // --- API Configuration ---
    // This is your live backend URL from Fly.io
    const API_URL = 'https://making-chatbot.fly.dev/api/ask';

    // --- Core Functions ---

    /**
     * Handles sending the user's message to the backend.
     */
    const sendMessage = async () => {
        const question = userInput.value.trim();
        if (!question) return; // Don't send empty messages

        // Display user's question immediately
        appendMessage(question, 'user');
        userInput.value = ''; // Clear the input field
        userInput.focus();

        // Show a loading indicator while waiting for the response
        const loadingMessageEl = showLoadingIndicator();

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ question }),
            });

            // Remove the loading indicator once we have a response
            chatBox.removeChild(loadingMessageEl);

            if (!response.ok) {
                // Handle HTTP errors (e.g., 500, 503 from your backend)
                const errorData = await response.json();
                throw new Error(errorData.detail || `Server error: ${response.status}`);
            }

            const data = await response.json();
            // Display the bot's answer and sources
            appendMessage(data.answer, 'bot', data.sources);

        } catch (error) {
            console.error('Failed to fetch from API:', error);
            // Ensure loading indicator is removed on error too
            if (chatBox.contains(loadingMessageEl)) {
                chatBox.removeChild(loadingMessageEl);
            }
            // Display a user-friendly error message
            const errorMessage = `Sorry, I'm having trouble connecting. Please try again later. (Error: ${error.message})`;
            appendMessage(errorMessage, 'bot');
        }
    };

    /**
     * Appends a message to the chat box.
     * @param {string} text - The message content.
     * @param {'user' | 'bot'} sender - The sender of the message.
     * @param {Array} [sources=[]] - An array of source documents.
     */
    const appendMessage = (text, sender, sources = []) => {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', `${sender}-message`);

        const p = document.createElement('p');
        p.textContent = text;
        messageDiv.appendChild(p);

        // If sources are provided, create and append them
        if (sources && sources.length > 0) {
            const sourcesContainer = createSourcesContainer(sources);
            messageDiv.appendChild(sourcesContainer);
        }

        chatBox.appendChild(messageDiv);
        scrollToBottom();
    };
    
    /**
     * Creates a container with source document snippets.
     * @param {Array} sources - The source documents array.
     * @returns {HTMLDivElement} The container element for sources.
     */
    function createSourcesContainer(sources) {
        const container = document.createElement('div');
        container.classList.add('sources-container');

        const header = document.createElement('h4');
        header.textContent = 'Sources:';
        container.appendChild(header);

        sources.forEach(source => {
            const sourceDiv = document.createElement('div');
            sourceDiv.classList.add('source');
            
            const sourceName = document.createElement('strong');
            sourceName.textContent = `From: ${source.source_document || 'Unknown Document'}\n`;
            
            const sourceContent = document.createTextNode(source.content);

            sourceDiv.appendChild(sourceName);
            sourceDiv.appendChild(sourceContent);
            container.appendChild(sourceDiv);
        });
        return container;
    }

    /**
     * Displays a temporary loading animation in the chat.
     * @returns {HTMLDivElement} The loading message element.
     */
    const showLoadingIndicator = () => {
        const loadingDiv = document.createElement('div');
        loadingDiv.classList.add('message', 'loading-message');
        loadingDiv.innerHTML = `<p><span class="loading-dot"></span><span class="loading-dot"></span><span class="loading-dot"></span></p>`;
        chatBox.appendChild(loadingDiv);
        scrollToBottom();
        return loadingDiv;
    };

    /**
     * Automatically scrolls the chat box to the latest message.
     */
    const scrollToBottom = () => {
        chatBox.scrollTop = chatBox.scrollHeight;
    };

    // --- Event Listeners ---
    sendBtn.addEventListener('click', sendMessage);
    userInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault(); // Prevents new line in input
            sendMessage();
        }
    });

});
