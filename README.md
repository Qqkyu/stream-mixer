# Stream Mix

Stream Mix is a browser-based multistream viewer for watching Twitch, YouTube,
and Kick streams together in a customizable workspace.

The production app is available at [streammix.app](https://streammix.app).

## Features

- Mix Twitch, YouTube, and Kick embeds in one workspace.
- Show a stream with chat, video only, or chat only.
- Drag and resize windows in an expanding, automatically compacted grid.
- Use compact mode to hide the site and embed headers while watching.
- Open an embed in a fullscreen workspace view.
- Minimize embeds to an auto-hiding shelf and restore them later.
- Preserve streams, positions, sizes, minimized state, and interface preferences
  in browser `localStorage`.
- Fill available grid space automatically when adding or restoring windows.

Stream Mix uses each platform's official embedded player and chat. Playback,
authentication, advertisements, and chat are provided by the respective
platform rather than proxied by Stream Mix.

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

## Using the app

1. Select Twitch, YouTube, or Kick.
2. Enter a Twitch/Kick channel name or YouTube video ID.
3. Choose **Stream + Chat**, **Stream**, or **Chat**.
4. Select **Add**.
5. Drag a window by its header and resize it using either bottom corner.

The window controls follow the familiar desktop convention:

- Red removes the embed.
- Yellow minimizes it to the bottom shelf.
- Green opens and closes the fullscreen workspace view.

Move the pointer to the bottom edge to reveal minimized windows. In compact
mode, move the pointer to the top edge to reveal the button that restores the
site header.

## Tech stack

- [Astro](https://astro.build)
- [React](https://react.dev)
- [GridStack](https://gridstackjs.com)
- [Tailwind CSS](https://tailwindcss.com)
- [DaisyUI](https://daisyui.com)
- [Nanostores](https://github.com/nanostores/nanostores)

## Data and privacy

Layouts and preferences stay in the current browser's `localStorage`. Stream
Mix does not provide accounts or synchronize layouts between devices. Clearing
site data resets the workspace.
