document.addEventListener("DOMContentLoaded", () => {
  // --- DOM Element References ---
  const chatBubble = document.getElementById("chat-bubble")
  const chatWindow = document.getElementById("chat-window")
  const closeBtn = document.getElementById("close-btn")
  const chatBox = document.getElementById("chat-box")
  const userInput = document.getElementById("user-input")
  const sendBtn = document.getElementById("send-btn")

  // --- API Configuration ---
  const API_URL = "https://making-chatbot.fly.dev/api/ask"

  // --- Warmup Backend on Page Load ---
  warmupBackend()

  // --- Quick Actions Data ---
  const quickActions = [
    "What services do you offer?",
    "Tell me about your company",
    "How can I get started?",
    "What technologies do you use?",
    "Contact information",
  ]

  // --- Warmup Function ---
  async function warmupBackend() {
    try {
      console.log("🔥 Warming up backend...")
      updateChatBubbleStatus(true)

      // Make a lightweight request to wake up the server
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 15000) // 15 second timeout for cold starts

      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: "ping" }), // Simple ping message
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (response.ok) {
        console.log("✅ Backend warmed up successfully")
      } else {
        console.log("⚠️ Backend warmup completed with status:", response.status)
      }
    } catch (error) {
      if (error.name === "AbortError") {
        console.log("⏱️ Backend warmup timed out (this is normal for cold starts)")
      } else {
        console.log("🔄 Backend warmup failed, will retry on first user interaction:", error.message)
      }
    } finally {
      // Reset chat bubble to normal state after warmup attempt
      setTimeout(() => {
        updateChatBubbleStatus(false)
      }, 1000)
    }
  }

  // Add warmup status indicator to chat bubble
  function updateChatBubbleStatus(isWarming = false) {
    if (isWarming) {
      chatBubble.classList.add("warming")
      chatBubble.setAttribute("title", "Warming up chatbot...")
    } else {
      chatBubble.classList.remove("warming")
      chatBubble.setAttribute("title", "Chat with Jasper IT Assistant")
    }
  }

  // --- Event Listeners for UI ---
  chatBubble.addEventListener("click", () => {
    chatWindow.classList.toggle("open")
    if (chatWindow.classList.contains("open")) {
      userInput.focus()
      // Add a subtle entrance animation to messages
      setTimeout(() => {
        const messages = chatBox.querySelectorAll(".message")
        messages.forEach((msg, index) => {
          msg.style.animationDelay = `${index * 0.1}s`
        })
      }, 100)
    }
  })

  closeBtn.addEventListener("click", () => {
    chatWindow.classList.remove("open")
  })

  sendBtn.addEventListener("click", sendMessage)

  userInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault()
      sendMessage()
    }
  })

  // Initialize chat with welcome message
  initializeChat()

  function initializeChat() {
    // Clear any existing messages first
    chatBox.innerHTML = ""

    const welcomeMessage = `
      <div class="welcome-message">
        <p>👋 Hello! I'm your Jasper IT Solutions assistant. I can help you with information about our services, policies, and processes.</p>
      </div>
    `

    const messageDiv = document.createElement("div")
    messageDiv.classList.add("message", "bot-message")
    messageDiv.innerHTML = welcomeMessage

    // Add quick actions
    const quickActionsDiv = createQuickActions()
    messageDiv.appendChild(quickActionsDiv)

    chatBox.appendChild(messageDiv)
    scrollToBottom()
  }

  function createQuickActions() {
    const container = document.createElement("div")
    container.classList.add("quick-actions")

    const title = document.createElement("div")
    title.classList.add("quick-actions-title")
    title.textContent = "Quick questions you can ask:"

    const grid = document.createElement("div")
    grid.classList.add("quick-actions-grid")

    container.appendChild(title)
    container.appendChild(grid)

    quickActions.forEach((action, index) => {
      const actionBtn = document.createElement("button")
      actionBtn.classList.add("quick-action")
      actionBtn.textContent = action
      actionBtn.style.animationDelay = `${index * 0.1}s`
      actionBtn.addEventListener("click", () => {
        userInput.value = action
        sendMessage()
      })
      grid.appendChild(actionBtn)
    })

    return container
  }

  // --- Core Functions ---
  async function sendMessage() {
    const question = userInput.value.trim()
    if (!question) return

    appendMessage(question, "user")
    userInput.value = ""
    userInput.focus()

    const loadingMessageEl = showLoadingIndicator()

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      })

      chatBox.removeChild(loadingMessageEl)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || `Server error: ${response.status}`)
      }

      const data = await response.json()
      appendEnhancedMessage(data.answer, data.sources)
    } catch (error) {
      console.error("Failed to fetch from API:", error)
      if (chatBox.contains(loadingMessageEl)) {
        chatBox.removeChild(loadingMessageEl)
      }
      const errorMessage = `I apologize, but I'm experiencing technical difficulties. Please try again in a moment, or contact our Jasper IT Solutions support team at info@jasperitinc.com if the issue persists.`
      appendMessage(errorMessage, "bot", [], "error")
    }
  }

  function appendMessage(text, sender, sources = [], messageType = "normal") {
    const messageDiv = document.createElement("div")
    messageDiv.classList.add("message", `${sender}-message`)

    if (messageType === "error") {
      messageDiv.classList.add("error-message")
    } else if (messageType === "success") {
      messageDiv.classList.add("success-message")
    }

    const p = document.createElement("p")
    p.textContent = text
    messageDiv.appendChild(p)

    if (sources && sources.length > 0) {
      const sourcesContainer = createEnhancedSourcesContainer(sources)
      messageDiv.appendChild(sourcesContainer)
    }

    chatBox.appendChild(messageDiv)
    scrollToBottom()
  }

  function appendEnhancedMessage(text, sources = []) {
    const messageDiv = document.createElement("div")
    messageDiv.classList.add("message", "bot-message")

    // Enhanced message formatting
    const formattedText = formatBotResponse(text)
    const p = document.createElement("p")
    p.innerHTML = formattedText
    messageDiv.appendChild(p)

    // Check if this is a document list response
    if (text.toLowerCase().includes("following documents") || text.toLowerCase().includes("document")) {
      const documentList = extractDocumentList(text)
      if (documentList.length > 0) {
        const docListContainer = createDocumentList(documentList)
        messageDiv.appendChild(docListContainer)
      }
    }

    if (sources && sources.length > 0) {
      const sourcesContainer = createEnhancedSourcesContainer(sources)
      messageDiv.appendChild(sourcesContainer)
    }

    chatBox.appendChild(messageDiv)
    scrollToBottom()
  }

  function formatBotResponse(text) {
    // Clean up the response and make it more readable
    const formatted = text
      .replace(/(\d+\.\s)/g, "<br><strong>$1</strong>")
      .replace(/Based on the provided context,/g, "")
      .replace(
        /the following (documents|services|information) (are|is) mentioned:/gi,
        "<strong>Here's what I found:</strong>",
      )
      .replace(/Additionally,/g, "<br><br><strong>Additionally,</strong>")
      .replace(
        /The provided (documents|information) do not contain/gi,
        "<br><br><em>Note: I don't have specific information about</em>",
      )

    return formatted
  }

  function extractDocumentList(text) {
    const documents = []
    const lines = text.split("\n")

    lines.forEach((line) => {
      const trimmed = line.trim()
      if (trimmed.match(/^\d+\.\s/)) {
        const docName = trimmed.replace(/^\d+\.\s/, "").trim()
        if (docName && !docName.toLowerCase().includes("the following")) {
          documents.push(docName)
        }
      }
    })

    return documents
  }

  function createDocumentList(documents) {
    const container = document.createElement("div")
    container.classList.add("document-list")

    const header = document.createElement("h4")
    header.textContent = "Available Documents"
    container.appendChild(header)

    documents.forEach((doc) => {
      const docItem = document.createElement("div")
      docItem.classList.add("document-item")
      docItem.textContent = doc
      container.appendChild(docItem)
    })

    return container
  }

  function createEnhancedSourcesContainer(sources) {
    const container = document.createElement("div")
    container.classList.add("sources-container")

    const header = document.createElement("h4")
    header.textContent = "Source References"
    container.appendChild(header)

    sources.forEach((source, index) => {
      const sourceDiv = document.createElement("div")
      sourceDiv.classList.add("source")

      const sourceName = document.createElement("strong")
      sourceName.textContent = `📄 ${source.source_document || "Document"} (Reference ${index + 1})`

      const sourceContent = document.createElement("div")
      sourceContent.classList.add("source-content")

      // Truncate long content and add "read more" functionality
      const content = source.content
      if (content.length > 200) {
        const truncated = content.substring(0, 200) + "..."
        const readMore = document.createElement("span")
        readMore.style.color = "#6366f1"
        readMore.style.cursor = "pointer"
        readMore.style.fontWeight = "600"
        readMore.textContent = " Read more"

        sourceContent.textContent = truncated
        sourceContent.appendChild(readMore)

        readMore.addEventListener("click", () => {
          sourceContent.textContent = content
        })
      } else {
        sourceContent.textContent = content
      }

      sourceDiv.appendChild(sourceName)
      sourceDiv.appendChild(sourceContent)
      container.appendChild(sourceDiv)
    })

    return container
  }

  function showLoadingIndicator() {
    const loadingDiv = document.createElement("div")
    loadingDiv.classList.add("message", "loading-message")

    const loadingContent = `
    <p>
      <span class="typing-text">Thinking</span>
      <span class="loading-dots">
        <span class="loading-dot"></span>
        <span class="loading-dot"></span>
        <span class="loading-dot"></span>
      </span>
    </p>
  `

    loadingDiv.innerHTML = loadingContent

    chatBox.appendChild(loadingDiv)
    scrollToBottom()
    return loadingDiv
  }

  function scrollToBottom() {
    chatBox.scrollTop = chatBox.scrollHeight
  }

  // Add some helpful keyboard shortcuts
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && chatWindow.classList.contains("open")) {
      chatWindow.classList.remove("open")
    }
  })
})
