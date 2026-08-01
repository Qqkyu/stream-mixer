import { execFileSync, spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const WIDTH = 1440;
const HEIGHT = 810;
const FRAME_RATE = 10;
const APP_URL = process.env.STREAM_MIX_DEMO_URL ?? "http://localhost:4321/";
const WINDOWS_CHROME =
  "/mnt/c/Program Files/Google/Chrome/Application/chrome.exe";
const CHROME_BIN =
  process.env.CHROME_BIN ??
  (existsSync(WINDOWS_CHROME) ? WINDOWS_CHROME : "google-chrome");
const USING_WINDOWS_CHROME = CHROME_BIN.toLowerCase().endsWith(".exe");
const DEBUG_HOST = USING_WINDOWS_CHROME
  ? execFileSync("ip", ["route", "show", "default"], {
      encoding: "utf8",
    }).match(/\bvia\s+(\S+)/)?.[1]
  : "127.0.0.1";
const FFMPEG_BIN = process.env.FFMPEG_BIN ?? "ffmpeg";
const OUTPUT_DIRECTORY = resolve("docs/assets");
const MP4_OUTPUT = join(OUTPUT_DIRECTORY, "stream-mix-demo.mp4");
const WEBP_OUTPUT = join(OUTPUT_DIRECTORY, "stream-mix-demo.webp");

const sleep = (milliseconds) =>
  new Promise((resolveSleep) => setTimeout(resolveSleep, milliseconds));

class DevToolsClient {
  constructor(socket) {
    this.socket = socket;
    this.nextId = 1;
    this.pending = new Map();

    socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (!message.id) return;

      const pendingCall = this.pending.get(message.id);
      if (!pendingCall) return;

      this.pending.delete(message.id);
      clearTimeout(pendingCall.timeout);
      if (message.error) {
        pendingCall.reject(new Error(message.error.message));
      } else {
        pendingCall.resolve(message.result ?? {});
      }
    });

    const rejectPendingCalls = () => {
      for (const pendingCall of this.pending.values()) {
        clearTimeout(pendingCall.timeout);
        pendingCall.reject(new Error("Chrome DevTools connection closed"));
      }
      this.pending.clear();
    };
    socket.addEventListener("close", rejectPendingCalls);
    socket.addEventListener("error", rejectPendingCalls);
  }

  static async connect(url) {
    const socket = new WebSocket(url);
    await new Promise((resolveConnection, rejectConnection) => {
      socket.addEventListener("open", resolveConnection, { once: true });
      socket.addEventListener("error", rejectConnection, { once: true });
    });
    return new DevToolsClient(socket);
  }

  call(method, params = {}, timeoutMilliseconds = 15_000) {
    const id = this.nextId++;
    return new Promise((resolveCall, rejectCall) => {
      const timeout = setTimeout(() => {
        this.pending.delete(id);
        rejectCall(new Error(`Chrome timed out while running ${method}`));
      }, timeoutMilliseconds);
      this.pending.set(id, {
        resolve: resolveCall,
        reject: rejectCall,
        timeout,
      });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  close() {
    this.socket.close();
  }
}

async function findAvailablePort() {
  const server = createServer();
  await new Promise((resolveListen, rejectListen) => {
    server.once("error", rejectListen);
    server.listen(0, "127.0.0.1", resolveListen);
  });
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : null;
  await new Promise((resolveClose) => server.close(resolveClose));
  if (!port) throw new Error("Could not reserve a Chrome debugging port");
  return port;
}

async function waitForChrome(host, port, chromeProcess, getDiagnostics) {
  const deadline = Date.now() + 15_000;

  while (Date.now() < deadline) {
    if (chromeProcess.exitCode != null) {
      throw new Error(`Chrome exited with code ${chromeProcess.exitCode}`);
    }

    try {
      const response = await fetch(`http://${host}:${port}/json/list`);
      const targets = await response.json();
      const page = targets.find(({ type }) => type === "page");
      if (page?.webSocketDebuggerUrl) {
        const webSocketUrl = new URL(page.webSocketDebuggerUrl);
        webSocketUrl.hostname = host;
        webSocketUrl.port = String(port);
        return webSocketUrl.toString();
      }
    } catch {
      // Chrome is still starting.
    }

    await sleep(100);
  }

  const diagnostics = getDiagnostics().trim();
  throw new Error(
    `Timed out while starting Chrome${diagnostics ? `\n${diagnostics}` : ""}`,
  );
}

function startWindowsDebugProxy(listenPort, targetPort) {
  const source = `
using System;
using System.Net;
using System.Net.Sockets;
using System.Threading.Tasks;

public static class StreamMixTcpProxy
{
    public static void Run(int listenPort, int targetPort)
    {
        var listener = new TcpListener(IPAddress.Any, listenPort);
        listener.Start();
        while (true)
        {
            Handle(listener.AcceptTcpClient(), targetPort);
        }
    }

    private static async void Handle(TcpClient client, int targetPort)
    {
        var target = new TcpClient();
        try
        {
            await target.ConnectAsync(IPAddress.Loopback, targetPort);
            var clientStream = client.GetStream();
            var targetStream = target.GetStream();
            await Task.WhenAny(
                clientStream.CopyToAsync(targetStream),
                targetStream.CopyToAsync(clientStream)
            );
        }
        catch
        {
        }
        finally
        {
            client.Close();
            target.Close();
        }
    }
}
`;
  const command = `Add-Type -TypeDefinition @'\n${source}\n'@\n[StreamMixTcpProxy]::Run(${listenPort}, ${targetPort})`;
  const encodedCommand = Buffer.from(command, "utf16le").toString("base64");
  return spawn(
    "powershell.exe",
    ["-NoProfile", "-EncodedCommand", encodedCommand],
    { stdio: ["ignore", "ignore", "pipe"] },
  );
}

function runCommand(command, args) {
  return new Promise((resolveCommand, rejectCommand) => {
    const child = spawn(command, args, { stdio: "inherit" });
    child.once("error", rejectCommand);
    child.once("exit", (code) => {
      if (code === 0) resolveCommand();
      else rejectCommand(new Error(`${command} exited with code ${code}`));
    });
  });
}

async function main() {
  const response = await fetch(APP_URL);
  if (!response.ok) {
    throw new Error(`${APP_URL} responded with HTTP ${response.status}`);
  }

  const debugPort = await findAvailablePort();
  const connectionPort = USING_WINDOWS_CHROME
    ? await findAvailablePort()
    : debugPort;
  if (!DEBUG_HOST) throw new Error("Could not determine the Chrome host");
  const captureDirectory = await mkdtemp(join(tmpdir(), "stream-mix-demo-"));
  const frameDirectory = join(captureDirectory, "frames");
  let profileDirectory = join(captureDirectory, "chrome-profile");
  let chromeProfileDirectory = profileDirectory;

  if (USING_WINDOWS_CHROME) {
    const windowsTempDirectory = execFileSync(
      "powershell.exe",
      ["-NoProfile", "-Command", "[System.IO.Path]::GetTempPath()"],
      { encoding: "utf8" },
    ).trim();
    const wslTempDirectory = execFileSync(
      "wslpath",
      ["-u", windowsTempDirectory],
      { encoding: "utf8" },
    ).trim();
    profileDirectory = await mkdtemp(
      join(wslTempDirectory, "stream-mix-demo-chrome-"),
    );
    chromeProfileDirectory = execFileSync("wslpath", ["-w", profileDirectory], {
      encoding: "utf8",
    }).trim();
  }

  await mkdir(frameDirectory, { recursive: true });
  await mkdir(OUTPUT_DIRECTORY, { recursive: true });

  const chromeProcess = spawn(
    CHROME_BIN,
    [
      "--headless=new",
      "--disable-background-networking",
      "--disable-default-apps",
      "--disable-extensions",
      "--disable-features=Translate",
      "--disable-popup-blocking",
      "--hide-scrollbars",
      "--mute-audio",
      "--no-first-run",
      "--no-default-browser-check",
      "--autoplay-policy=no-user-gesture-required",
      `--remote-debugging-address=${DEBUG_HOST}`,
      `--remote-debugging-port=${debugPort}`,
      "--remote-allow-origins=*",
      `--user-data-dir=${chromeProfileDirectory}`,
      `--window-size=${WIDTH},${HEIGHT}`,
      "about:blank",
    ],
    { stdio: ["ignore", "ignore", "pipe"] },
  );
  let chromeDiagnostics = "";
  chromeProcess.stderr.on("data", (data) => {
    chromeDiagnostics = `${chromeDiagnostics}${data}`.slice(-4_000);
  });
  const debugProxy = USING_WINDOWS_CHROME
    ? startWindowsDebugProxy(connectionPort, debugPort)
    : undefined;

  let client;
  let frameNumber = 0;

  try {
    const webSocketUrl = await waitForChrome(
      DEBUG_HOST,
      connectionPort,
      chromeProcess,
      () => chromeDiagnostics,
    );
    client = await DevToolsClient.connect(webSocketUrl);

    await client.call("Page.enable");
    await client.call("Runtime.enable");
    await client.call("Emulation.setDeviceMetricsOverride", {
      width: WIDTH,
      height: HEIGHT,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await client.call("Emulation.setEmulatedMedia", {
      media: "screen",
      features: [{ name: "prefers-color-scheme", value: "dark" }],
    });
    await client.call("Page.navigate", { url: APP_URL });

    const evaluate = async (expression) => {
      const result = await client.call("Runtime.evaluate", {
        expression,
        awaitPromise: true,
        returnByValue: true,
      });
      if (result.exceptionDetails) {
        throw new Error(
          result.exceptionDetails.text ?? "Browser evaluation failed",
        );
      }
      return result.result?.value;
    };

    const waitFor = async (expression, timeout = 15_000) => {
      const deadline = Date.now() + timeout;
      while (Date.now() < deadline) {
        if (await evaluate(`Boolean(${expression})`)) return;
        await sleep(100);
      }
      throw new Error(`Timed out waiting for: ${expression}`);
    };

    const inputSelector = '[placeholder="Channel, video ID, or URL"]';
    await waitFor(`document.querySelector(${JSON.stringify(inputSelector)})`);
    await evaluate("localStorage.clear(); location.reload()");
    await waitFor(`document.querySelector(${JSON.stringify(inputSelector)})`);
    await waitFor("document.querySelector('h1')");

    await evaluate(`(() => {
      const cursor = document.createElement("div");
      cursor.id = "demo-cursor";
      Object.assign(cursor.style, {
        position: "fixed",
        left: "0",
        top: "0",
        width: "18px",
        height: "18px",
        border: "2px solid white",
        borderRadius: "999px",
        background: "rgba(99, 102, 241, 0.78)",
        boxShadow: "0 2px 10px rgba(0, 0, 0, 0.7)",
        transform: "translate(-50%, -50%)",
        pointerEvents: "none",
        zIndex: "2147483647",
      });
      document.body.append(cursor);

    })()`);

    const captureFrame = async () => {
      let screenshot;
      try {
        screenshot = await client.call("Page.captureScreenshot", {
          format: "jpeg",
          quality: 78,
          fromSurface: true,
          captureBeyondViewport: false,
        });
      } catch (error) {
        throw new Error(`Failed to capture frame ${frameNumber + 1}`, {
          cause: error,
        });
      }
      frameNumber += 1;
      const filename = `frame-${String(frameNumber).padStart(5, "0")}.jpg`;
      await writeFile(
        join(frameDirectory, filename),
        Buffer.from(screenshot.data, "base64"),
      );
    };

    const hold = async (milliseconds) => {
      const frames = Math.max(
        1,
        Math.round((milliseconds / 1000) * FRAME_RATE),
      );
      const frameDuration = 1000 / FRAME_RATE;
      for (let frame = 0; frame < frames; frame += 1) {
        const startedAt = Date.now();
        await captureFrame();
        await sleep(Math.max(0, frameDuration - (Date.now() - startedAt)));
      }
    };

    const getRect = async (elementExpression) => {
      const rect = await evaluate(`(() => {
        const element = ${elementExpression};
        if (!element) return null;
        const { x, y, width, height } = element.getBoundingClientRect();
        return { x, y, width, height };
      })()`);
      if (!rect) throw new Error(`Element not found: ${elementExpression}`);
      return rect;
    };

    const setCursor = async (x, y, active = false) => {
      await evaluate(`(() => {
        const cursor = document.querySelector("#demo-cursor");
        if (!cursor) return;
        cursor.style.left = ${JSON.stringify(`${x}px`)};
        cursor.style.top = ${JSON.stringify(`${y}px`)};
        cursor.style.width = ${JSON.stringify(active ? "26px" : "18px")};
        cursor.style.height = ${JSON.stringify(active ? "26px" : "18px")};
      })()`);
    };

    const moveTo = async (x, y, duration = 350) => {
      const current = await evaluate(`(() => {
        const cursor = document.querySelector("#demo-cursor");
        return {
          x: Number.parseFloat(cursor?.style.left || "${WIDTH / 2}"),
          y: Number.parseFloat(cursor?.style.top || "${HEIGHT / 2}"),
        };
      })()`);
      const steps = Math.max(2, Math.round((duration / 1000) * FRAME_RATE));
      for (let step = 1; step <= steps; step += 1) {
        const progress = step / steps;
        const nextX = current.x + (x - current.x) * progress;
        const nextY = current.y + (y - current.y) * progress;
        await setCursor(nextX, nextY);
        await captureFrame();
      }
    };

    const clickAt = async (x, y, animateTravel = true) => {
      if (animateTravel) {
        await moveTo(x, y);
      } else {
        await setCursor(x, y);
        await captureFrame();
      }
      await client.call("Input.dispatchMouseEvent", {
        type: "mouseMoved",
        x,
        y,
      });
      await setCursor(x, y, true);
      await client.call("Input.dispatchMouseEvent", {
        type: "mousePressed",
        x,
        y,
        button: "left",
        clickCount: 1,
      });
      await captureFrame();
      await client.call("Input.dispatchMouseEvent", {
        type: "mouseReleased",
        x,
        y,
        button: "left",
        clickCount: 1,
      });
      await setCursor(x, y);
      await captureFrame();
    };

    const clickElement = async (elementExpression, animateTravel = true) => {
      const rect = await getRect(elementExpression);
      await clickAt(
        rect.x + rect.width / 2,
        rect.y + rect.height / 2,
        animateTravel,
      );
    };

    const replaceInput = async (text, animateTyping = true) => {
      await clickElement(
        `document.querySelector(${JSON.stringify(inputSelector)})`,
      );
      await evaluate(`(() => {
        const input = document.querySelector(${JSON.stringify(inputSelector)});
        const setValue = Object.getOwnPropertyDescriptor(
          HTMLInputElement.prototype,
          "value",
        ).set;
        setValue.call(input, "");
        input.dispatchEvent(new Event("input", { bubbles: true }));
      })()`);
      const chunks = animateTyping ? [...text] : [text];
      for (const chunk of chunks) {
        await client.call("Input.insertText", { text: chunk });
        await captureFrame();
      }
    };

    const chooseSelectValue = async (index, value) => {
      const elementExpression = `document.querySelectorAll("select")[${index}]`;
      const rect = await getRect(elementExpression);
      await moveTo(rect.x + rect.width / 2, rect.y + rect.height / 2);
      await evaluate(`(() => {
        const select = ${elementExpression};
        const setValue = Object.getOwnPropertyDescriptor(
          HTMLSelectElement.prototype,
          "value",
        ).set;
        setValue.call(select, ${JSON.stringify(value)});
        select.dispatchEvent(new Event("change", { bubbles: true }));
      })()`);
      await captureFrame();
    };

    const drag = async (
      elementExpression,
      offsetX,
      offsetY,
      duration = 900,
      anchor = {},
    ) => {
      const rect = await getRect(elementExpression);
      const startX = rect.x + rect.width * (anchor.xRatio ?? 0.5);
      const startY =
        anchor.yOffset == null
          ? rect.y + rect.height * (anchor.yRatio ?? 0.5)
          : rect.y + anchor.yOffset;
      const endX = startX + offsetX;
      const endY = startY + offsetY;
      const steps = Math.max(4, Math.round((duration / 1000) * FRAME_RATE));

      await moveTo(startX, startY);
      await client.call("Input.dispatchMouseEvent", {
        type: "mouseMoved",
        x: startX,
        y: startY,
      });
      await client.call("Input.dispatchMouseEvent", {
        type: "mousePressed",
        x: startX,
        y: startY,
        button: "left",
        clickCount: 1,
      });
      await setCursor(startX, startY, true);

      for (let step = 1; step <= steps; step += 1) {
        const progress = step / steps;
        const x = startX + (endX - startX) * progress;
        const y = startY + (endY - startY) * progress;
        await client.call("Input.dispatchMouseEvent", {
          type: "mouseMoved",
          x,
          y,
          button: "left",
          buttons: 1,
        });
        await setCursor(x, y, true);
        await captureFrame();
      }

      await client.call("Input.dispatchMouseEvent", {
        type: "mouseReleased",
        x: endX,
        y: endY,
        button: "left",
        clickCount: 1,
      });
      await setCursor(endX, endY);
      await captureFrame();
      await evaluate("window.getSelection()?.removeAllRanges()");
    };

    const addButton = `Array.from(document.querySelectorAll("button")).find((button) => button.textContent.trim() === "Add")`;
    await setCursor(WIDTH / 2, HEIGHT / 2);
    await hold(1_200);

    await replaceInput("LCK");
    await clickElement(addButton);
    await waitFor("document.querySelectorAll('.grid-stack-item').length === 1");
    await hold(3_000);

    await replaceInput("https://www.youtube.com/watch?v=aqz-KE-bpKQ", false);
    await waitFor('document.querySelectorAll("select")[0].value === "youtube"');
    await chooseSelectValue(1, "video");
    await clickElement(addButton);
    await waitFor("document.querySelectorAll('.grid-stack-item').length === 2");
    await hold(3_000);

    await drag(
      `document.querySelectorAll(".grid-stack-item")[0]?.querySelector(".ui-resizable-se")`,
      0,
      96,
      1_000,
    );
    await hold(700);

    await drag(
      `document.querySelectorAll(".grid-stack-item")[1]?.querySelector(".grid-stack-item-drag-handle")`,
      -600,
      0,
      1_100,
      { yOffset: 6 },
    );
    await hold(700);

    await clickElement(`document.querySelector('input.toggle')`);
    await hold(1_100);
    await setCursor(WIDTH / 2, 6);
    await captureFrame();
    await client.call("Input.dispatchMouseEvent", {
      type: "mouseMoved",
      x: WIDTH / 2,
      y: 6,
    });
    await hold(700);
    await waitFor(
      "document.querySelector('[aria-label=\"Exit compact mode\"]')",
    );
    await clickElement(
      `document.querySelector('[aria-label="Exit compact mode"]')`,
    );
    await hold(700);

    await clickElement(
      `document.querySelector('[aria-label="Copy workspace share link"]')`,
    );
    await hold(1_500);

    console.log(`Captured ${frameNumber} frames. Encoding MP4...`);
    await runCommand(FFMPEG_BIN, [
      "-y",
      "-hide_banner",
      "-loglevel",
      "warning",
      "-framerate",
      String(FRAME_RATE),
      "-i",
      join(frameDirectory, "frame-%05d.jpg"),
      "-c:v",
      "libx264",
      "-preset",
      "medium",
      "-crf",
      "23",
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart",
      MP4_OUTPUT,
    ]);

    console.log("Encoding README-friendly animated WebP...");
    await runCommand(FFMPEG_BIN, [
      "-y",
      "-hide_banner",
      "-loglevel",
      "warning",
      "-i",
      MP4_OUTPUT,
      "-vf",
      "fps=8,scale=960:-2:flags=lanczos",
      "-loop",
      "0",
      "-c:v",
      "libwebp",
      "-lossless",
      "0",
      "-quality",
      "55",
      "-compression_level",
      "6",
      WEBP_OUTPUT,
    ]);

    console.log(`Created ${MP4_OUTPUT}`);
    console.log(`Created ${WEBP_OUTPUT}`);
  } finally {
    client?.close();
    debugProxy?.kill("SIGTERM");
    if (chromeProcess.exitCode == null) {
      chromeProcess.kill("SIGTERM");
      await Promise.race([
        new Promise((resolveExit) => chromeProcess.once("exit", resolveExit)),
        sleep(2_000),
      ]);
    }
    if (chromeProcess.exitCode == null) {
      chromeProcess.kill("SIGKILL");
    }

    if (USING_WINDOWS_CHROME) {
      const profileName = profileDirectory.split("/").at(-1);
      try {
        execFileSync(
          "powershell.exe",
          [
            "-NoProfile",
            "-Command",
            `Get-CimInstance Win32_Process -Filter \"Name = 'chrome.exe'\" | Where-Object { $_.CommandLine -like '*${profileName}*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }`,
          ],
          { stdio: "ignore" },
        );
      } catch {
        // The browser may already have exited.
      }
      await sleep(500);
    }

    const cleanupOptions = {
      recursive: true,
      force: true,
      maxRetries: 5,
      retryDelay: 200,
    };
    try {
      await rm(profileDirectory, cleanupOptions);
    } catch (error) {
      console.warn(`Could not remove ${profileDirectory}: ${error.message}`);
    }
    try {
      await rm(captureDirectory, cleanupOptions);
    } catch (error) {
      console.warn(`Could not remove ${captureDirectory}: ${error.message}`);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
