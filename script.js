

//resize
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