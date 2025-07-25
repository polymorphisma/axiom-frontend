document.addEventListener("DOMContentLoaded", () => {
  // --- DOM Element References ---
  const chatBubble = document.getElementById("chat-bubble");
  const chatWindow = document.getElementById("chat-window");
  const closeBtn = document.getElementById("close-btn");
  const chatBox = document.getElementById("chat-box");
  const userInput = document.getElementById("user-input");
  const sendBtn = document.getElementById("send-btn");
//   const API_URL = "http://localhost:8000/api/chat";
  const API_URL = "https://making-chatbot.fly.dev/api/chat";
    // const API_URL = "https://axiom.sandbox.adex.ltd/api/chat";

  let conversationHistory = [];

  // (All other functions like warmupBackend, initializeChat, etc., are unchanged)
  async function warmupBackend() {
    try {
      console.log("🔥 Warming up backend...");
      updateChatBubbleStatus(true);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [{ role: "user", content: "ping" }] }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (response.ok) console.log("✅ Backend warmed up successfully");
      else console.log("⚠️ Backend warmup completed with status:", response.status);
    } catch (error) {
      if (error.name === "AbortError") console.log("⏱️ Backend warmup timed out");
      else console.log("🔄 Backend warmup failed:", error.message);
    } finally {
      setTimeout(() => updateChatBubbleStatus(false), 1000);
    }
  }
  function updateChatBubbleStatus(isWarming = false) {
    if (isWarming) {
      chatBubble.classList.add("warming");
      chatBubble.setAttribute("title", "Warming up chatbot...");
    } else {
      chatBubble.classList.remove("warming");
      chatBubble.setAttribute("title", "Chat with Jasper IT Assistant");
    }
  }
  chatBubble.addEventListener("click", () => {
    chatWindow.classList.toggle("open");
    if (chatWindow.classList.contains("open")) userInput.focus();
  });
  closeBtn.addEventListener("click", () => chatWindow.classList.remove("open"));
  sendBtn.addEventListener("click", handleSendMessage);
  userInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleSendMessage();
    }
  });

  const quickActions = ["What services do you offer?", "Tell me about your company", "How can I get started?"];
  initializeChat();

  function initializeChat() {
    chatBox.innerHTML = "";
    const savedHistory = localStorage.getItem("jasperChatHistory");
    if (savedHistory) {
      conversationHistory = JSON.parse(savedHistory);
      conversationHistory.forEach(message => {
        if (message.role === 'user' || message.role === 'assistant') {
          if (message.role === 'assistant') appendEnhancedMessage(message.content, message.sources);
          else appendMessage(message.content, "user");
        }
      });
    } else {
      conversationHistory = [];
      const welcomeMessageDiv = document.createElement("div");
      welcomeMessageDiv.classList.add("message", "bot-message");
      welcomeMessageDiv.innerHTML = `<div class="welcome-message"><p>👋 Hello! I'm your Jasper IT Solutions assistant. How can I help you today?</p></div>`;
      welcomeMessageDiv.appendChild(createQuickActions());
      chatBox.appendChild(welcomeMessageDiv);
    }
    scrollToBottom();
  }
  function handleSendMessage() {
    const userText = userInput.value.trim();
    if (!userText) return;
    appendMessage(userText, "user");
    updateHistory({ role: "user", content: userText });
    userInput.value = "";
    userInput.focus();
    sendHistoryToApi();
  }
  async function sendHistoryToApi() {
    const loadingMessageEl = showLoadingIndicator();
    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: conversationHistory }),
      });
      chatBox.removeChild(loadingMessageEl);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `Server error: ${response.status}`);
      }
      const data = await response.json();
      appendEnhancedMessage(data.answer, data.sources);
      updateHistory({ role: "assistant", content: data.answer, sources: data.sources || [] });
    } catch (error) {
      console.error("Failed to fetch from API:", error);
      if (chatBox.contains(loadingMessageEl)) chatBox.removeChild(loadingMessageEl);
      const errorMessage = `I apologize, but I'm experiencing technical difficulties.`;
      appendMessage(errorMessage, "bot", [], "error");
    }
  }
  function updateHistory(message) {
    conversationHistory.push(message);
    localStorage.setItem("jasperChatHistory", JSON.stringify(conversationHistory));
  }
  function createQuickActions() {
    const container = document.createElement("div");
    container.classList.add("quick-actions");
    const title = document.createElement("div");
    title.classList.add("quick-actions-title");
    title.textContent = "Quick questions:";
    const grid = document.createElement("div");
    grid.classList.add("quick-actions-grid");
    container.appendChild(title);
    container.appendChild(grid);
    quickActions.forEach((action, index) => {
      const actionBtn = document.createElement("button");
      actionBtn.classList.add("quick-action");
      actionBtn.textContent = action;
      actionBtn.style.animationDelay = `${index * 0.1}s`;
      actionBtn.addEventListener("click", () => {
        userInput.value = action;
        handleSendMessage();
      });
      grid.appendChild(actionBtn);
    });
    return container;
  }
  function appendMessage(text, sender, sources = [], messageType = "normal") {
    const messageDiv = document.createElement("div");
    messageDiv.classList.add("message", `${sender}-message`);
    if (messageType === "error") messageDiv.classList.add("error-message");
    const p = document.createElement("p");
    p.textContent = text;
    messageDiv.appendChild(p);
    messageDiv.appendChild(createEnhancedSourcesContainer(sources));
    chatBox.appendChild(messageDiv);
    scrollToBottom();
  }
  function appendEnhancedMessage(text, sources = []) {
    const messageDiv = document.createElement("div");
    messageDiv.classList.add("message", "bot-message");
    const p = document.createElement("p");
    p.innerHTML = formatBotResponse(text);
    messageDiv.appendChild(p);
    messageDiv.appendChild(createEnhancedSourcesContainer(sources));
    chatBox.appendChild(messageDiv);
    scrollToBottom();
  }
  
  // <--- CHANGE: Added a rule to handle **bold** markdown --->
  function formatBotResponse(text) {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Converts **bold** to <strong>bold</strong>
      .replace(/(\d+\.\s)/g, "<br><strong>$1</strong>")
      .replace(/Based on the provided context,/g, "")
      .replace(/the following (documents|services|information) (are|is) mentioned:/gi,"<strong>Here's what I found:</strong>")
      .replace(/Additionally,/g, "<br><br><strong>Additionally,</strong>")
      .replace(/The provided (documents|information) do not contain/gi,"<br><br><em>Note: I don't have specific information about</em>");
  }

  function createEnhancedSourcesContainer(sources) {
    return document.createDocumentFragment();
  }
  function showLoadingIndicator() {
    const loadingDiv = document.createElement("div");
    loadingDiv.classList.add("message", "loading-message");
    loadingDiv.innerHTML = `<p><span class="typing-text">Thinking</span><span class="loading-dots"><span class="loading-dot"></span><span class="loading-dot"></span><span class="loading-dot"></span></span></p>`;
    chatBox.appendChild(loadingDiv);
    scrollToBottom();
    return loadingDiv;
  }
  function scrollToBottom() {
    chatBox.scrollTop = chatBox.scrollHeight;
  }
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && chatWindow.classList.contains("open")) {
      chatWindow.classList.remove("open");
    }
  });
});