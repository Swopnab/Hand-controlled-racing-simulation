// Checkbox reflects native fullscreen (including Escape) with an explicit layout fallback.
(() => {
  const app = document.getElementById("app-container"),
    toggle = document.getElementById("fullscreen-toggle"),
    label = document.getElementById("fullscreen-label");
  let fallback = false;
  const current = () =>
    document.fullscreenElement || document.webkitFullscreenElement;
  function resize() {
    window.dispatchEvent(new Event("resize"));
  }
  function sync() {
    const native = current() === app;
    toggle.checked = native || fallback;
    label.textContent = fallback ? "Expanded view" : "Full screen";
    toggle.closest("label").title = fallback
      ? "Browser fullscreen is unavailable. Expanded browser view is active."
      : "Enter or leave fullscreen";
    resize();
  }
  function expanded() {
    fallback = true;
    app.classList.add("expanded");
    document.body.classList.add("expanded-mode");
    sync();
  }
  async function change() {
    const wanted = toggle.checked;
    toggle.disabled = true;
    try {
      if (wanted) {
        if (app.requestFullscreen) await app.requestFullscreen();
        else if (app.webkitRequestFullscreen) app.webkitRequestFullscreen();
        else expanded();
      } else {
        fallback = false;
        app.classList.remove("expanded");
        document.body.classList.remove("expanded-mode");
        if (document.fullscreenElement) await document.exitFullscreen();
        else if (document.webkitFullscreenElement)
          document.webkitExitFullscreen();
      }
    } catch {
      if (wanted) expanded();
    } finally {
      toggle.disabled = false;
      if (
        !app.webkitRequestFullscreen ||
        app.requestFullscreen ||
        fallback ||
        !wanted
      )
        sync();
    }
  }
  toggle.addEventListener("change", change);
  document.addEventListener("fullscreenchange", sync);
  document.addEventListener("webkitfullscreenchange", sync);
  document.addEventListener("keydown", (event) => {
    if (
      event.key === "Escape" &&
      fallback &&
      !document.querySelector("dialog[open]")
    ) {
      event.preventDefault();
      event.stopPropagation();
      fallback = false;
      app.classList.remove("expanded");
      document.body.classList.remove("expanded-mode");
      sync();
    }
  });
})();
