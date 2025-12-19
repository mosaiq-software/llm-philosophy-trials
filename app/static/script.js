
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
        chatInput.value = ""; 
        chatInput.focus();
    }
    renderSources(index);

    console.log("Switched to chat:", activeChatIndex);
}