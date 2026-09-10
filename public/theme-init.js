(() => {
  try {
    const storedTheme = window.localStorage.getItem("secure-client-portal-theme");
    const systemPrefersDark = typeof window.matchMedia === "function"
      && window.matchMedia("(prefers-color-scheme: dark)").matches;
    const theme = storedTheme === "dark" || storedTheme === "light"
      ? storedTheme : systemPrefersDark ? "dark" : "light";
    const isDark = theme === "dark";
    document.documentElement.classList.toggle("theme-dark", isDark);
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", isDark ? "#090909" : "#eef1f4");
  } catch {
    // The React theme provider applies the default when storage is unavailable.
  }
})();
