import { spawn } from 'node:child_process';
import { access, mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export async function startBrowser() {
  const paths = [process.env.TEST_BROWSER, 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe'].filter(Boolean);
  let executable;
  for (const path of paths) { try { await access(path); executable = path; break; } catch {} }
  if (!executable) throw new Error('Set TEST_BROWSER to an Edge/Chrome executable');
  const profile = await mkdtemp(join(tmpdir(), 'polling-ui-'));
  const browser = spawn(executable, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], { windowsHide: true, stdio: 'ignore' });
  const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
  let socket;
  async function close() {
    if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ id: 999999, method: 'Browser.close' }));
    await pause(500); socket?.close(); browser.kill();
    if (profile.startsWith(join(tmpdir(), 'polling-ui-'))) await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }).catch(error => console.warn(`Temporary browser cleanup: ${error.code}`));
  }
  try {
    let port;
    for (let i = 0; i < 100; i++) {
      try { port = Number((await readFile(join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]); break; } catch { await pause(100); }
    }
    if (!port) throw new Error('Browser debugging endpoint unavailable');
    const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
    socket = new WebSocket(targets.find(t => t.type === 'page').webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
    const pending = new Map(); const errors = []; const networkFailures = []; let sequence = 0;
    socket.onmessage = event => {
      const message = JSON.parse(event.data);
      if (message.id) {
        const p = pending.get(message.id); pending.delete(message.id);
        if (!p) return;
        message.error ? p.reject(message.error) : p.resolve(message.result);
      } else if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
      else if (message.method === 'Network.loadingFailed') networkFailures.push(message.params.errorText);
    };
    const send = (method, params = {}) => new Promise((resolve, reject) => {
      const id = ++sequence; pending.set(id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params }));
    });
    async function evaluate(expression) {
      const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
      if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
      return result.result.value;
    }
    async function waitFor(expression) {
      for (let i = 0; i < 100; i++) { if (await evaluate(`Boolean(${expression})`)) return; await pause(100); }
      throw new Error(`Timeout: ${expression}`);
    }
    async function click(label) {
      await evaluate(`(() => { const el = [...document.querySelectorAll('button')].find(e => e.textContent.trim() === ${JSON.stringify(label)}); if (!el || el.disabled) throw new Error('Unavailable button: '+${JSON.stringify(label)}); el.click(); })()`);
      await pause(100);
    }
    async function field(selector, value) {
      await evaluate(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (!el) throw new Error('Missing field: '+${JSON.stringify(selector)}); const proto=el.tagName==='SELECT'?HTMLSelectElement.prototype:HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(proto,'value').set.call(el,${JSON.stringify(value)}); el.dispatchEvent(new Event(el.tagName==='SELECT'?'change':'input',{bubbles:true})); })()`);
      await pause(100);
    }
    async function screenshot(name) {
      const { data } = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
      const path = join(tmpdir(), name); await writeFile(path, Buffer.from(data, 'base64')); console.log(`Screenshot: ${path}`);
    }
    await send('Runtime.enable'); await send('Page.enable'); await send('Network.enable');
    return { send, evaluate, waitFor, click, field, screenshot, close, errors, networkFailures };
  } catch (error) { await close(); throw error; }
}
