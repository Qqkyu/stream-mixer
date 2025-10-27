# Stream Mix

A web application for watching multiple live streams simultaneously in a customizable, draggable grid layout. Mix and match streams from different platforms and arrange them however you like.

## Features

- **Multi-Platform Support**: Watch streams from Twitch, YouTube, and Kick simultaneously
- **Flexible Content Display**: For each stream, choose to display:
  - Stream + Chat (Everything)
  - Stream Only (Video)
  - Chat Only
- **Drag-and-Drop Grid Layout**: Freely arrange streams using a dynamic grid powered by GridStack
- **Resizable Stream Windows**: Adjust the size of each stream to your preference
- **Mac-Style Window Controls**: Intuitive close, minimize, and maximize buttons for each stream
- **Persistent State**: Your layout and stream selections are automatically saved to localStorage
- **Responsive Design**: Works across different screen sizes

## Use Cases

- Watch multiple streamers simultaneously
- Monitor esports events with multiple POVs
- Compare different stream sources in real-time
- Create custom multi-stream viewing experiences

## Tech Stack

- [Astro](https://astro.build) - Web framework
- [React](https://react.dev) - UI components
- [GridStack](https://gridstackjs.com) - Drag-and-drop grid layout
- [Tailwind CSS](https://tailwindcss.com) - Styling
- [DaisyUI](https://daisyui.com) - UI components
- [Nanostores](https://github.com/nanostores/nanostores) - State management

## Usage

1. Select a platform (Twitch, YouTube, or Kick) from the dropdown
2. Enter the channel name
3. Choose what to display (Everything, Stream Only, or Chat Only)
4. Click "Add Stream" to add it to your grid
5. Drag streams by their title bar to rearrange
6. Resize streams using the corner handles (↘︎ and ↙︎)
7. Use the red button to remove a stream

Your layout and stream selections are automatically saved and will be restored when you return.
