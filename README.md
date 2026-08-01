# Stream Mix

Stream Mix is a free browser-based multistream viewer for watching Twitch,
YouTube, and Kick streams together in a customizable workspace. No account or
download is required.

[Open Stream Mix](https://streammix.app) ·
[Setup guide](https://streammix.app/guides/watch-multiple-streams/) ·
[FAQ](https://streammix.app/faq/)

[![Stream Mix demo showing streams being added, resized, arranged, and shared](docs/assets/stream-mix-demo.webp)](https://streammix.app)

[Watch the full-quality MP4 demo](docs/assets/stream-mix-demo.mp4)

## Features

- Mix Twitch, YouTube, and Kick embeds in one workspace.
- Show a stream with chat, video only, or chat only.
- Drag and resize windows in an expanding, automatically compacted grid.
- Use compact mode to hide the site and embed headers while watching.
- Open an embed in a fullscreen workspace view.
- Minimize embeds to an auto-hiding shelf and restore them later.
- Copy a link that recreates the current streams and grid layout.
- Preserve streams, positions, sizes, minimized state, and interface preferences
  in browser `localStorage`.
- Fill available grid space automatically when adding or restoring windows.

Stream Mix uses each platform's official embedded player and chat. Playback,
authentication, advertisements, and chat are provided by the respective
platform rather than proxied by Stream Mix.

## Using the app

1. Paste a Twitch, YouTube, or Kick URL. The platform is detected automatically.
2. Alternatively, select a platform and enter its channel name or video ID.
3. Choose **Stream + Chat**, **Stream**, or **Chat**.
4. Select **Add**.
5. Drag a window by its header and resize it using either bottom corner.
6. Use the share button to copy a link to the current workspace.

The window controls follow the familiar desktop convention:

- Red removes the embed.
- Yellow minimizes it to the bottom shelf.
- Green opens and closes the fullscreen workspace view.

Move the pointer to the bottom edge to reveal minimized windows. In compact
mode, move the pointer to the top edge to reveal the button that restores the
site header.

## Guides

- [Watch multiple Twitch streams](https://streammix.app/guides/watch-multiple-twitch-streams/)
- [Watch multiple YouTube live streams](https://streammix.app/guides/watch-multiple-youtube-streams/)
- [Watch multiple Kick streams](https://streammix.app/guides/watch-multiple-kick-streams/)
- [Read the complete setup guide](https://streammix.app/guides/watch-multiple-streams/)

## Local development

Requirements:

- Node.js 20 or newer
- [pnpm](https://pnpm.io/)

Install dependencies and start the development server:

```sh
pnpm install
pnpm dev
```

The app is served at `http://localhost:4321` by default. Twitch and YouTube
embed URLs use the active hostname, so embeds work both locally and on the
production domain.

Create a production build with:

```sh
pnpm build
```

To regenerate the README demo, leave the local server running and use:

```sh
pnpm capture:demo
```

The capture command requires Google Chrome and FFmpeg. Set `CHROME_BIN`,
`FFMPEG_BIN`, or `STREAM_MIX_DEMO_URL` to override their default commands or
the local app URL.

## Tech stack

- [Astro](https://astro.build)
- [React](https://react.dev)
- [GridStack](https://gridstackjs.com)
- [Tailwind CSS](https://tailwindcss.com)
- [DaisyUI](https://daisyui.com)
- [Nanostores](https://github.com/nanostores/nanostores)

## Data and privacy

Layouts and preferences stay in the current browser's `localStorage`. Shared
workspace links encode stream identifiers, display modes, and positions in the
URL fragment; Stream Mix does not upload that data to a server. Stream Mix does
not provide accounts or automatic synchronization between devices. Clearing
site data resets the workspace.
