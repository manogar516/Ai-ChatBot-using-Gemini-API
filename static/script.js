/* script.js — client behavior for the enhanced chat UI
   - Posts to form action (fallback /chat)
   - Handles JSON or text responses
   - Typing animation + message entry animations (anime.js)
   - Auto-scroll + session log export
*/

(function () {
  // Utilities
  const el = (sel, root = document) => root.querySelector(sel);
  const elAll = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  // DOM
  const chatWindow = el('#chat-window');
  const form = el('#chat-form');
  const input = el('#message-input');
  const sendBtn = el('#send-btn');
  const clearBtn = el('#clear-btn');
  const downloadBtn = el('#download-log');
  const themeToggle = el('#theme-toggle');
  const themeIcon = el('#theme-icon');

  // Session log
  let session = [];

  // Auto-size textarea
  function autosize(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = (textarea.scrollHeight) + 'px';
  }
  input.addEventListener('input', () => autosize(input));
  window.addEventListener('load', () => autosize(input));

  // Theme toggle (light/dark)
  function setTheme(dark) {
    if (dark) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    // swap icon (simple)
    themeIcon.innerHTML = dark ? '<path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" stroke="currentColor" stroke-width="1.5" fill="none"/>' : '<path d="M12 3v2M12 19v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"></path><circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.5"></circle>';
  }
  themeToggle.addEventListener('click', () => {
    const dark = !document.documentElement.classList.contains('dark');
    setTheme(dark);
    localStorage.setItem('theme_dark', dark ? '1' : '0');
  });
  // load preference
  if (localStorage.getItem('theme_dark') === '1') setTheme(true);

  // Helper to scroll to bottom with little easing
  function scrollBottom() {
    chatWindow.scrollTo({ top: chatWindow.scrollHeight + 300, behavior: 'smooth' });
  }

  // Create message node
  function makeMessageNode({ who = 'bot', content = '', meta = {} } = {}) {
    const row = document.createElement('div');
    row.className = 'msg-row';

    const wrapper = document.createElement('div');
    wrapper.className = 'msg ' + (who === 'user' ? 'user' : 'bot');

    const inner = document.createElement('div');
    inner.className = 'msg-inner';
    inner.innerHTML = content;

    // avatar
    const avatar = document.createElement('div');
    avatar.className = 'avatar';
    avatar.style.background = who === 'user' ? 'linear-gradient(90deg,#06b6d4,#7c3aed)' : 'linear-gradient(90deg,#6366f1,#ec4899)';
    avatar.textContent = who === 'user' ? 'You' : 'G';

    if (who === 'user') {
      // user aligns right
      wrapper.appendChild(inner);
      row.appendChild(wrapper);
    } else {
      row.appendChild(avatar);
      wrapper.appendChild(inner);
      row.appendChild(wrapper);
    }
    return { row, inner };
  }

  // Tiny animation: fade/slide in
  function animateIn(node) {
    node.style.opacity = '0';
    node.style.transform = 'translateY(8px)';
    chatWindow.appendChild(node);
    // animate with anime.js if available
    if (window.anime) {
      anime({
        targets: node,
        translateY: [8, 0],
        opacity: [0, 1],
        duration: 360,
        easing: 'easeOutCubic'
      });
    } else {
      node.style.transition = 'all .28s ease';
      requestAnimationFrame(() => { node.style.opacity = '1'; node.style.transform = 'translateY(0)'; });
    }
    scrollBottom();
  }

  // Append assistant typing placeholder
  function appendTyping() {
    const row = document.createElement('div');
    row.className = 'msg-row';
    const avatar = document.createElement('div');
    avatar.className = 'avatar';
    avatar.style.background = 'linear-gradient(90deg,#6366f1,#ec4899)';
    avatar.textContent = 'G';
    const wrapper = document.createElement('div');
    wrapper.className = 'msg bot';
    const typing = document.createElement('div');
    typing.className = 'typing';
    wrapper.appendChild(typing);
    row.appendChild(avatar);
    row.appendChild(wrapper);
    chatWindow.appendChild(row);
    scrollBottom();
    return row;
  }

  // Replace typing node with final content
  function replaceTypingNode(typingRow, contentHtml) {
    if (!typingRow) return;
    const newRow = document.createElement('div');
    newRow.className = 'msg-row';
    const avatar = document.createElement('div');
    avatar.className = 'avatar';
    avatar.style.background = 'linear-gradient(90deg,#6366f1,#ec4899)';
    avatar.textContent = 'G';
    const wrapper = document.createElement('div');
    wrapper.className = 'msg bot';
    const inner = document.createElement('div');
    inner.className = 'msg-inner';
    inner.innerHTML = contentHtml;
    wrapper.appendChild(inner);
    newRow.appendChild(avatar);
    newRow.appendChild(wrapper);

    typingRow.replaceWith(newRow);

    // animate
    animateIn(newRow);
  }

  // Core: send message
  async function sendMessage(text) {
    if (!text || !text.trim()) return;
    const trimmed = text.trim();

    // Append user's bubble
    const userNode = makeMessageNode({ who: 'user', content: `<div>${escapeHtml(trimmed)}</div>` });
    animateIn(userNode.row);
    session.push({ who: 'user', text: trimmed, t: Date.now() });

    // clear input
    input.value = '';
    autosize(input);

    // add typing placeholder
    const typingRow = appendTyping();

    // find endpoint from form action OR fallback to /chat
    const endpoint = (form && form.getAttribute('action')) ? form.getAttribute('action') : '/chat';
    const fieldName = (input && input.getAttribute('name')) ? input.getAttribute('name') : 'message';

    // prepare fetch
    const body = {};
    body[fieldName] = trimmed;

    // attempt JSON POST (common for APIs)
    let responseText = '';
    try {
      const res = await fetch(endpoint, {
        method: form.getAttribute('method') || 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      // If backend returns JSON
      const ct = res.headers.get('content-type') || '';
      if (ct.includes('application/json')) {
        const data = await res.json();
        // try common keys
        responseText = (data.reply || data.message || data.response || data.text || JSON.stringify(data));
      } else {
        // fallback to text
        responseText = await res.text();
      }

      // show final
      if (!responseText) responseText = '<i>(no content)</i>';
      replaceTypingNode(typingRow, formatResponse(responseText));
      session.push({ who: 'bot', text: responseText, t: Date.now() });
    } catch (err) {
      // If fetch fails (maybe backend expects form data) -> try form-encoded fallback
      try {
        const params = new URLSearchParams();
        params.append(fieldName, trimmed);
        const res2 = await fetch(endpoint, {
          method: form.getAttribute('method') || 'POST',
          headers: {
            'Accept': 'text/plain',
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: params.toString()
        });
        const text2 = await res2.text();
        const finalText = text2 || err.toString();
        replaceTypingNode(typingRow, formatResponse(finalText));
        session.push({ who: 'bot', text: finalText, t: Date.now() });
      } catch (err2) {
        replaceTypingNode(typingRow, formatResponse('Error: could not reach server. See console.'));
        console.error('sendMessage errors:', err, err2);
      }
    }
  }

  // Format simple text into HTML (preserve line breaks)
  function formatResponse(text) {
    // If looks like JSON string, try to pretty print
    try {
      const maybeJson = typeof text === 'string' && (text.trim().startsWith('{') || text.trim().startsWith('['));
      if (maybeJson) {
        const parsed = JSON.parse(text);
        // pretty-print JSON
        return `<pre style="white-space:pre-wrap; font-family:ui-monospace, SFMono-Regular, Menlo, Monaco, 'Roboto Mono', monospace; font-size:0.9rem;">${escapeHtml(JSON.stringify(parsed, null, 2))}</pre>`;
      }
    } catch (e) { /* not JSON */ }

    // plain text -> preserve newlines
    return escapeHtml(text).replace(/\n/g, '<br/>');
  }

  // Escape HTML
  function escapeHtml(str) {
    if (!str && str !== 0) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  // Form submit handler
  form.addEventListener('submit', function (ev) {
    ev.preventDefault();
    const val = input.value;
    sendMessage(val);
  });

  // Keyboard: Enter to send unless Shift pressed
  input.addEventListener('keydown', function (ev) {
    if (ev.key === 'Enter' && !ev.shiftKey) {
      ev.preventDefault();
      sendBtn.click();
    }
  });

  // Clear conversation
  clearBtn.addEventListener('click', function () {
    chatWindow.innerHTML = '<div class="system-msg text-sm text-slate-500">Conversation cleared.</div>';
    session = [];
  });

  // Export session
  downloadBtn.addEventListener('click', function (ev) {
    ev.preventDefault();
    if (!session.length) return alert('No messages yet.');
    const blob = new Blob([JSON.stringify(session, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `session-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });

  // Tiny entrance animation for initial system message
  document.addEventListener('DOMContentLoaded', function () {
    const sys = el('.system-msg');
    if (sys && window.anime) {
      anime({
        targets: sys,
        opacity: [0,1],
        translateY: [-6,0],
        duration: 600,
        easing: 'easeOutCubic'
      });
    }
  });

  // Smooth append helper to ensure node is attached and animated nicely
  function appendNode(node) {
    chatWindow.appendChild(node);
    scrollBottom();
  }

  // If the user clicks the voice button, show a friendly not-implemented tooltip
  const voiceBtn = el('#voice-btn');
  if (voiceBtn) voiceBtn.addEventListener('click', () => {
    const pop = document.createElement('div');
    pop.className = 'system-msg';
    pop.textContent = 'Voice is not implemented in this UI — but you can integrate Web Speech API if desired.';
    chatWindow.appendChild(pop);
    setTimeout(() => pop.remove(), 2800);
    scrollBottom();
  });

  // Auto-scroll observe (keeps input in view if keyboard opens on mobile)
  const ro = new ResizeObserver(scrollBottom);
  ro.observe(chatWindow);

})();
