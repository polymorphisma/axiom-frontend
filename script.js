document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Element References ---
    const chatBubble = document.getElementById('chat-bubble');
    const chatWindow = document.getElementById('chat-window');
    const closeBtn = document.getElementById('close-btn');
    const chatBox = document.getElementById('chat-box');
    const userInput = document.getElementById('user-input');
    const sendBtn = document.getElementById('send-btn');

    // --- API Configuration ---
    const API_URL = 'https://making-chatbot.fly.dev/api/ask';

    // --- Event Listeners for UI ---
    chatBubble.addEventListener('click', () => {
        chatWindow.classList.toggle('open');
    });

    closeBtn.addEventListener('click', () => {
        chatWindow.classList.remove('open');
    });

    sendBtn.addEventListener('click', sendMessage);
    userInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            sendMessage();
        }
    });

    // --- Core Functions (largely unchanged) ---

    async function sendMessage() {
        const question = userInput.value.trim();
        if (!question) return;

        appendMessage(question, 'user');
        userInput.value = '';
        userInput.focus();

        const loadingMessageEl = showLoadingIndicator();

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question }),
            });

            chatBox.removeChild(loadingMessageEl);

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || `Server error: ${response.status}`);
            }

            const data = await response.json();
            appendMessage(data.answer, 'bot', data.sources);

        } catch (error) {
            console.error('Failed to fetch from API:', error);
            if (chatBox.contains(loadingMessageEl)) {
                chatBox.removeChild(loadingMessageEl);
            }
            const errorMessage = `Sorry, an error occurred. Please try again.`;
            appendMessage(errorMessage, 'bot');
        }
    }

    function appendMessage(text, sender, sources = []) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', `${sender}-message`);

        const p = document.createElement('p');
        p.textContent = text;
        messageDiv.appendChild(p);

        if (sources && sources.length > 0) {
            const sourcesContainer = createSourcesContainer(sources);
            messageDiv.appendChild(sourcesContainer);
        }

        chatBox.appendChild(messageDiv);
        scrollToBottom();
    }

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
            sourceName.textContent = `From: ${source.source_document || 'Unknown'}\n`;
            const sourceContent = document.createTextNode(source.content);
            sourceDiv.appendChild(sourceName);
            sourceDiv.appendChild(sourceContent);
            container.appendChild(sourceDiv);
        });
        return container;
    }

    function showLoadingIndicator() {
        const loadingDiv = document.createElement('div');
        loadingDiv.classList.add('message', 'loading-message');
        loadingDiv.innerHTML = `<p><span class="loading-dot"></span><span class="loading-dot"></span><span class="loading-dot"></span></p>`;
        chatBox.appendChild(loadingDiv);
        scrollToBottom();
        return loadingDiv;
    }

    function scrollToBottom() {
        chatBox.scrollTop = chatBox.scrollHeight;
    }
});