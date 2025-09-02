async function sendMessage() {
  const input = document.getElementById("user-input");
  const chat = document.getElementById("chat-box");
  const btn = document.getElementById("send-btn");
  const text = input.value.trim();
  if (!text) return;
  input.value = "";
  btn.disabled = true;

  chat.insertAdjacentHTML("beforeend", `<p class="message"><span class="who">You:</span> ${escapeHtml(text)}</p>`);
  chat.scrollTop = chat.scrollHeight;

  try {
    const res = await fetch("/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text })
    });
    const data = await res.json();
    const reply = data.reply ?? "(no reply)";
    chat.insertAdjacentHTML("beforeend", `<p class="message"><span class="who">Bot:</span> ${escapeHtml(reply)}</p>`);
  } catch (err) {
    chat.insertAdjacentHTML("beforeend", `<p class="message"><span class="who">Bot:</span> Error: ${escapeHtml(String(err))}</p>`);
  } finally {
    btn.disabled = false;
  }
}

function escapeHtml(str) {
  return str.replace(/[&<>"']/g, s => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[s]);
}

document.getElementById("user-input").addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    sendMessage();
  }
});
