const divider = document.querySelector(".divider");
const left = document.querySelector(".left");
const right = document.querySelector(".right");
const container = document.querySelector(".container");
let isResizing = false;

divider.addEventListener("mousedown", () => {
    isResizing = true;
});

document.addEventListener("mousemove", (e) => {
    if (!isResizing) return;

    const containerRect = container.getBoundingClientRect();
    const newLeftWidth = e.clientX - containerRect.left;
    
    if (newLeftWidth > 100 && newLeftWidth < containerRect.width - 100) {
        left.style.flex = `0 0 ${newLeftWidth}px`;
        right.style.flex = `1 1 auto`;
    }
});

document.addEventListener("mouseup", () => {
    isResizing = false;
});

const infoBtn = document.querySelector("#infoBtn");
const infoModal = document.querySelector("#infoModal");
const closeModal = document.querySelector("#closeModal");

if (infoBtn && infoModal && closeModal) {
    infoBtn.addEventListener("click", () => {
        infoModal.classList.add("show");
    });

    closeModal.addEventListener("click", () => {
        infoModal.classList.remove("show");
    });

    infoModal.addEventListener("click", (e) => {
        if (e.target === infoModal) {
            infoModal.classList.remove("show");
        }
    });
}

const modelTabs = document.querySelectorAll(".model-tab");

modelTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
        modelTabs.forEach((t) => t.classList.remove("active"));
        tab.classList.add("active");
    });
});

// Global state
let chats = [];
let activeChatIndex = -1;
let currentContext = {}

// Elements
const addModelBtn = document.getElementById("addModelBtn");
const modelModal = document.getElementById("modelModal");
const closeModelModal = document.getElementById("closeModelModal");
const modelTabsContainer = document.getElementById("modelTabs");
const modelOptions = document.querySelectorAll(".btn-model-option");
const chatLabel = document.getElementById("chatLabel");
const chatInput = document.querySelector(".chat-input");
const sourcesList = document.getElementById("sourcesList");
const sendBtn = document.getElementById("sendBtn");
const responseBox = document.querySelector(".response-box");


if (addModelBtn && modelModal) {
    addModelBtn.addEventListener("click", () => {
        if (chats.length >= 4) {
            alert("Maximum limit of 4 conversations reached.");
            return;
        }
        modelModal.classList.add("show");
    });
}

if (closeModelModal && modelModal) {
    closeModelModal.addEventListener("click", () => {
        modelModal.classList.remove("show");
    });
    
    modelModal.addEventListener("click", (e) => {
        if (e.target === modelModal) {
            modelModal.classList.remove("show");
        }
    });
}

modelOptions.forEach(option => {
    option.addEventListener("click", () => {
        const modelId = parseInt(option.getAttribute("data-id"));
        const modelName = option.getAttribute("data-name");
        
        addNewChat(modelId, modelName);
        modelModal.classList.remove("show");
    });
});

if (sendBtn) {
    sendBtn.addEventListener("click", async () => {
        if (activeChatIndex === -1) {
            alert("Please select or add a model first!");
            return;
        }
        
        const text = chatInput.value;
        if (!text.trim()) {
            alert("Please enter a message.");
            return;
        }

        const currentChat = chats[activeChatIndex];

        // Convert currentContext (which is a JSON object) into an array of strings (expected by the API)
        const sourcesArray = Object.values(currentContext);

        const payload = {
            model_id: currentChat.model_id,
            prompt: text,
            sources_list: sourcesArray
        };

        // chatInput.value = ""; // clear input box after sending a request?
        responseBox.innerHTML = `<p><em>Thinking...</em></p>`;

        sendBtn.disabled = true;
        sendBtn.textContent = "Wait before sending another request";
        sendBtn.style.cursor = "not-allowed";

        try {
            const res = await fetch('/api/v1/chat/submit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                throw new Error(`Server error: ${res.statusText}`);
            }

            const data = await res.json();

            currentChat.messages.push({
                role: 0,
                content: text,
                tokens_used: data.prompt_tokens,
                highlights: []
            });

            currentChat.messages.push({
                role: 1,
                content: data.response_text,
                tokens_used: data.completion_tokens,
                highlights: []
            });

            renderLastResponse(activeChatIndex);
            renderSources(activeChatIndex);
            renderTimeline(activeChatIndex);

        } catch (error) {
            console.error("Chat submission failed! Reason:", error);
            responseBox.innerHTML = `<p style="color:red;">Error communicating with API: ${error.message}</p>`;
        } finally {
            sendBtn.disabled = false;
            sendBtn.textContent = "Send Message";
            sendBtn.style.cursor = "pointer";
        }
    });
}

function getMostCommonWord(text) {
    if (!text) return "none";
    // Match words, ignoring case and punctuation
    const words = text.toLowerCase().match(/\b\w+\b/g);
    if (!words) return "none";

    const frequency = {};
    let maxWord = words[0];
    let maxCount = 0;

    for (const w of words) {
        if (w.length < 4) continue; // skip common words such as "the", "is", "as", etc
        
        frequency[w] = (frequency[w] || 0) + 1;
        if (frequency[w] > maxCount) {
            maxCount = frequency[w];
            maxWord = w;
        }
    }
    return maxWord;
}

function addNewChat(modelId, prettyName) {
    const newChat = {
        model_id: modelId,
        pretty_name: prettyName,
        messages: []
    };

    chats.push(newChat);

    const newIndex = chats.length - 1;

    createModelTab(newIndex, prettyName);

    switchChat(newIndex);
}

function createModelTab(index, name) {
    const newTab = document.createElement("button");
    newTab.className = "model-tab";
    newTab.textContent = name;
    
    // The model button is binded to the index of its corresponding chat in 'chats'
    newTab.addEventListener("click", () => {
        switchChat(index);
    });

    modelTabsContainer.insertBefore(newTab, addModelBtn);
}

function renderSources(chatIndex) {
    if (!sourcesList) return;
    
    sourcesList.innerHTML = "";
    
    currentContext = {}; 

    const chat = chats[chatIndex];
    if (!chat || !chat.messages) return;

    chat.messages.forEach((msg, index) => {
        // Role 1 corresponds to the model (role 0 is user)
        if (msg.role === 1) {
            const label = document.createElement("label");
            
            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.dataset.index = index;
            
            checkbox.addEventListener("change", (e) => {
                if (e.target.checked) {
                    currentContext[index] = msg.content;
                } else {
                    delete currentContext[index];
                }
                console.log("Current Context:", currentContext);
            });

            halfIndex = Math.ceil(index / 2);
            
            const textSpan = document.createTextNode(` Response #${halfIndex}`);

            label.appendChild(checkbox);
            label.appendChild(textSpan);
            sourcesList.appendChild(label);
        }
    });
}

function renderLastResponse(index) {
    const chat = chats[index];
    if (!chat || !responseBox) return;

    const lastModelMsg = chat.messages.slice().reverse().find(m => m.role === 1);

    if (lastModelMsg) {
        responseBox.innerHTML = lastModelMsg.content
    } else {
        // Default placeholder if no model response yet
        responseBox.innerHTML = `<p><em>Model responses appear here...</em></p>`;
    }
}

function renderTimeline(chatIndex) {
    const container = document.querySelector(".chat-flow");
    if (!container) return;

    container.innerHTML = ""; // clear existing timeline
    
    const chat = chats[chatIndex];
    if (!chat || !chat.messages) return;

    chat.messages.forEach((msg, index) => {
        const isUser = msg.role === 0;
        const iteration = Math.ceil((index + 1) / 2);

        if (isUser) {
            const header = document.createElement("div");
            header.className = "flow-connector";
            header.textContent = `Iteration ${iteration}`;
            container.appendChild(header);
        }

        const flowItem = document.createElement("div");
        flowItem.className = "flow-item";
        flowItem.classList.add(isUser ? "initial" : "response");

        const label = document.createElement("div");
        label.className = "flow-label";
        label.textContent = isUser ? `Question #${iteration}` : `Response #${iteration}`;

        const box = document.createElement("div");
        box.className = "flow-box";
        box.textContent = msg.content;

        const stats = document.createElement("div");
        stats.className = "flow-label";
        const tokens = msg.tokens_used !== null ? msg.tokens_used : "Pending";
        const commonWord = getMostCommonWord(msg.content);
        stats.textContent = `Tokens used: ${tokens} - Most common word: ${commonWord}`;

        flowItem.appendChild(label);
        flowItem.appendChild(box);
        flowItem.appendChild(stats);

        container.appendChild(flowItem);

        if (isUser) {
            const connector = document.createElement("div");
            connector.className = "flow-connector";
            connector.textContent = "|";
            container.appendChild(connector);
        } else {
            container.appendChild(document.createElement("br"));
        }
    });
}

function switchChat(index) {
    activeChatIndex = index;
    const currentChat = chats[index];

    const tabs = document.querySelectorAll(".model-tab"); 
    tabs.forEach((tab, i) => {
        if (i === index) {
            tab.classList.add("active");
        } else {
            tab.classList.remove("active");
        }
    });


    if (chatLabel) {
        chatLabel.textContent = `Ask your question to ${currentChat.pretty_name}:`;
    }
    if (chatInput) {
        // chatInput.value = ""; // clear the input box?
        chatInput.focus();
    }
    renderSources(index);
    renderLastResponse(index);
    renderTimeline(index);

    console.log("Switched to chat:", activeChatIndex);
}