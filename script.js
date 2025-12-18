
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