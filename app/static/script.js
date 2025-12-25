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
let isHighlightMode = false;
let viewedMessageIndex = -1;
let pendingHighlightIndices = null;


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
const highlightToggleBtn = document.getElementById("highlightToggleBtn");
const highlightPopover = document.getElementById("highlightPopover");
const highlightCommentInput = document.getElementById("highlightComment");
const postHighlightBtn = document.getElementById("postHighlightBtn");
const cancelHighlightBtn = document.getElementById("cancelHighlightBtn");


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

            viewedMessageIndex = -1;

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

if (highlightToggleBtn) {
    highlightToggleBtn.addEventListener("click", () => {
        // Validation: Can only highlight if we have a valid chat and message
        const chat = chats[activeChatIndex];
        if (!chat || chat.messages.length === 0) return;
        
        // Determine which message we are looking at
        const msgIndex = viewedMessageIndex === -1 ? findLastModelMessageIndex(chat) : viewedMessageIndex;
        if (msgIndex === -1 || chat.messages[msgIndex].role !== 1) {
            alert("No model response available to highlight.");
            return;
        }

        // Toggle state
        isHighlightMode = !isHighlightMode;
        
        // UI Updates
        responseBox.classList.toggle("highlight-mode", isHighlightMode);
        highlightToggleBtn.textContent = isHighlightMode ? "Highlight Mode: ON" : "Highlight Mode: OFF";
        highlightToggleBtn.classList.toggle("btn-primary", isHighlightMode);
        highlightToggleBtn.classList.toggle("btn-secondary", !isHighlightMode);

        // Reset popover if turning off
        if (!isHighlightMode) {
            hidePopover();
        }
    });
}

responseBox.addEventListener("mouseup", () => {
    if (!isHighlightMode) return;

    const selection = window.getSelection();
    if (selection.isCollapsed) {
        hidePopover();
        return;
    }

    // Ensure selection is inside responseBox
    if (!responseBox.contains(selection.anchorNode)) return;

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    
    // Check limit (Max 10)
    const chat = chats[activeChatIndex];
    const msgIndex = viewedMessageIndex === -1 ? findLastModelMessageIndex(chat) : viewedMessageIndex;
    if (chat.messages[msgIndex].highlights.length >= 10) {
        alert("Maximum of 10 highlights reached. Mode toggled off.");
        highlightToggleBtn.click(); // Programmatically turn off
        selection.removeAllRanges();
        return;
    }

    const rawIndices = getHtmlIndices(responseBox, range);
    
    if (!rawIndices) {
        hidePopover();
        return;
    }

    // 2. Adjust for overlaps
    const adjusted = adjustHighlightIndices(
        rawIndices.start, 
        rawIndices.end, 
        chat.messages[msgIndex].highlights
    );

    // 3. If the selection was invalid or fully overlapped, cancel the action
    if (!adjusted) {
        console.warn("Selection overlapped significantly with existing highlights. Action ignored.");
        selection.removeAllRanges();
        hidePopover();
        return;
    }

    // 4. Store the VALIDATED indices and content for the Post button to use
    pendingHighlightIndices = {
        start: adjusted.start,
        end: adjusted.end,
        content: rawIndices.content // Keep the normalized content string
    };

    // Show Popover just below the selection
    // We need to calculate position relative to the container or viewport
    const containerRect = document.querySelector('.container').getBoundingClientRect();
    
    highlightPopover.style.top = `${rect.bottom - containerRect.top + window.scrollY + 10}px`;
    highlightPopover.style.left = `${rect.left - containerRect.left + (rect.width / 2) - 125}px`; // Center it (125 is half popover width)
    highlightPopover.classList.remove("hidden");
    highlightCommentInput.focus();
});

cancelHighlightBtn.addEventListener("click", hidePopover);

postHighlightBtn.addEventListener("click", () => {
    if (!pendingHighlightIndices) return;

    const comment = highlightCommentInput.value.trim();
    
    saveHighlightToState(
        pendingHighlightIndices.start, 
        pendingHighlightIndices.end, 
        comment, 
        pendingHighlightIndices.content
    );

    hidePopover();
});

function hidePopover() {
    highlightPopover.classList.add("hidden");
    highlightCommentInput.value = "";
    pendingHighlightIndices = null;
    window.getSelection().removeAllRanges();
}

function findLastModelMessageIndex(chat) {
    for (let i = chat.messages.length - 1; i >= 0; i--) {
        if (chat.messages[i].role === 1) return i;
    }
    return -1;
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

    let msgIndex = viewedMessageIndex;
    // No message was selected by the user, default to the most recent
    if (msgIndex === -1) {
        msgIndex = findLastModelMessageIndex(chat);
    }

    if (msgIndex !== -1 && chat.messages[msgIndex]) {
        const msg = chat.messages[msgIndex];
        
        const highlightedContent = applyHighlightsToHtml(msg.content, msg.highlights);
        responseBox.innerHTML = highlightedContent;
        
        const label = document.querySelector(".response-section label");
        const displayIndex = Math.ceil((msgIndex + 1) / 2);
        label.textContent = `Model Response - Iteration ${displayIndex}:`;
    } else {
        responseBox.innerHTML = `<p><em>Model responses appear here...</em></p>`; // default placeholder
    }
}

function renderTimeline(chatIndex) {
    const container = document.querySelector(".chat-flow");
    if (!container) return;

    container.innerHTML = ""; // clear existing timeline before re-rendering, as highlights can be applied to any past messages
    
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
        box.innerHTML = msg.content;

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

        if (!isUser) { // separate if block for easier testing purposes
            const controls = document.createElement("div");
            controls.className = "flow-controls";
            controls.style.textAlign = "right";
            controls.style.marginBottom = "5px";

            const viewBtn = document.createElement("button");
            viewBtn.textContent = "Add Highlights";
            viewBtn.className = "btn-secondary";
            viewBtn.style.fontSize = "0.7rem";
            viewBtn.onclick = () => {
                viewedMessageIndex = index; // 'renderLastResponse' below uses this global state
                renderLastResponse(chatIndex);
            };

            // Highlights are viewable from the timeline boxes, but can only be added from response-box
            box.innerHTML = applyHighlightsToHtml(msg.content, msg.highlights);

            controls.appendChild(viewBtn);
            flowItem.insertBefore(controls, box);
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

function getHtmlIndices(container, range) {
    // Using 'Date.now()' to ensure each id is unique, possibly switch in the future to an RNG
    const startId = "highlight-marker-start-" + Date.now();
    const endId = "highlight-marker-end-" + Date.now();

    const startMarker = document.createElement("span");
    startMarker.id = startId;
    startMarker.style.display = "none";

    const endMarker = document.createElement("span");
    endMarker.id = endId;
    endMarker.style.display = "none";

    const safeRange = range.cloneRange();
    safeRange.insertNode(startMarker);
    safeRange.collapse(false);
    safeRange.insertNode(endMarker);

    // Create a clone so that removing <span> highlight elements does not affect what is on the real displayed page
    const clone = container.cloneNode(true);
    const existingHighlights = clone.querySelectorAll('.highlight-span');
    existingHighlights.forEach(span => {
        while (span.firstChild) {
            span.parentNode.insertBefore(span.firstChild, span);
        }
        span.parentNode.removeChild(span);
    });

    const htmlWithMarkers = clone.innerHTML;

    const startRegex = new RegExp(`<span[^>]*id="${startId}"[^>]*>.*?<\/span>`, "i");
    const endRegex = new RegExp(`<span[^>]*id="${endId}"[^>]*>.*?<\/span>`, "i");

    const startMatch = htmlWithMarkers.match(startRegex);
    const endMatch = htmlWithMarkers.match(endRegex);

    let finalStart = -1;
    let finalEnd = -1;

    if (startMatch && endMatch) {
        finalStart = startMatch.index;
        finalEnd = endMatch.index - startMatch[0].length;
    }

    // Remove markers from real DOM
    startMarker.remove();
    endMarker.remove();

    // Remove markers from clone DOM
    const startInClone = clone.querySelector(`[id="${startId}"]`);
    const endInClone = clone.querySelector(`[id="${endId}"]`);
    if (startInClone) startInClone.remove();
    if (endInClone) endInClone.remove();

    const normalizedHtml = clone.innerHTML;

    if (finalStart !== -1 && finalEnd !== -1) {
        return { 
            start: finalStart, 
            end: finalEnd,
            content: normalizedHtml // The clean HTML that should be stored inside of the database (the chats array)
        };
    }

    return null;
}

function saveHighlightToState(start, end, comment, normalizedContent) {
    const chat = chats[activeChatIndex];
    const msgIndex = viewedMessageIndex === -1 ? findLastModelMessageIndex(chat) : viewedMessageIndex;
    
    if (msgIndex !== -1 && chat.messages[msgIndex]) {
        // Update the saved message content with normalized HTML (from 'getHtmlIndicies' function)
        chat.messages[msgIndex].content = normalizedContent;

        chat.messages[msgIndex].highlights.push({
            starting_index: start,
            ending_index: end,
            comment: comment
        });

        renderLastResponse(activeChatIndex);
        renderTimeline(activeChatIndex);
    }
}

function applyHighlightsToHtml(originalHtml, highlights) {
    if (!highlights || highlights.length === 0) return originalHtml;

    // Sort descending to insert highlight <span> tags from end to start (prevents index shifting)
    const sorted = [...highlights].sort((a, b) => b.starting_index - a.starting_index);

    let result = originalHtml;

    sorted.forEach(h => {
        if (h.starting_index < 0 || h.ending_index > result.length) return; // safety checks

        const targetText = result.substring(h.starting_index, h.ending_index);

        const commentAttr = h.comment ? `data-comment="${h.comment.replace(/"/g, '&quot;')}"` : '';
        const openSpan = `<span class="highlight-span" ${commentAttr}>`;
        const closeSpan = `</span>`;

        // Handles when highlight tags cross existing tags (ie. <span></strong></span>)
        // Solution: create a second highlight tag set so no overlapping occurs (ie. <span></span></strong><span></span>)
        const safeTargetText = targetText.replace(/(<[^>]+>)/g, `${closeSpan}$1${openSpan}`);
        const wrapper = `${openSpan}${safeTargetText}${closeSpan}`;

        const before = result.substring(0, h.starting_index);
        const after = result.substring(h.ending_index);

        result = before + wrapper + after;
    });

    return result;
}

// Handles cases of new highlights overlapping existing ones
function adjustHighlightIndices(start, end, existingHighlights) {
    let newStart = start;
    let newEnd = end;

    for (const h of existingHighlights) {
        // Case 1: Existing highlight is INSIDE the new selection.
        if (h.starting_index >= newStart && h.ending_index <= newEnd) {
            window.getSelection().removeAllRanges();
            return null;
        }

        // Case 2: Overlap at the START of new selection
        if (h.starting_index <= newStart && h.ending_index > newStart) {
            newStart = h.ending_index;
        }

        // Case 3: Overlap at the END of new selection
        if (h.starting_index < newEnd && h.ending_index >= newEnd) {
            newEnd = h.starting_index;
        }
    }

    if (newStart >= newEnd) { // safety check
        window.getSelection().removeAllRanges();
        return null;
    }

    return { start: newStart, end: newEnd };
}