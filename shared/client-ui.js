(function () {
  function ensureToastStack() {
    let stack = document.querySelector(".ui-toast-stack");
    if (!stack) {
      stack = document.createElement("div");
      stack.className = "ui-toast-stack";
      document.body.appendChild(stack);
    }
    return stack;
  }

  function toast(message, type) {
    const stack = ensureToastStack();
    const item = document.createElement("div");
    item.className = `ui-toast ${type || "info"}`;
    item.textContent = message;
    stack.appendChild(item);
    setTimeout(() => {
      item.remove();
    }, 2800);
  }

  function setLoading(button, isLoading, loadingText) {
    if (!button) return;
    if (!button.dataset.origText) {
      button.dataset.origText = button.textContent || "";
    }
    button.disabled = Boolean(isLoading);
    button.textContent = isLoading ? (loadingText || "Please wait...") : button.dataset.origText;
  }

  function inlineMessage(el, text, kind) {
    if (!el) return;
    el.textContent = text || "";
    el.classList.remove("success", "error", "info");
    el.classList.add(kind || "info");
  }

  function withSorting(items, key, dir) {
    const copy = [...items];
    copy.sort((a, b) => {
      const left = (a[key] || "").toString().toLowerCase();
      const right = (b[key] || "").toString().toLowerCase();
      if (left < right) return dir === "desc" ? 1 : -1;
      if (left > right) return dir === "desc" ? -1 : 1;
      return 0;
    });
    return copy;
  }

  window.ClientUI = {
    toast,
    setLoading,
    inlineMessage,
    withSorting,
  };
})();
