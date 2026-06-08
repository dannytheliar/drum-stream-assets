const container = document.getElementById('background')!;

function showEmote(emoteURL: string) {
  container.style.backgroundImage = `url(${emoteURL})`;
  container.classList.remove('animating');
  void container.offsetHeight;
  container.classList.add('animating');
}

window.ipcRenderer.on('emote_used', (_, { emoteURLs }: { emoteURLs: string[] }) => {
  const emoteURL = emoteURLs[0];
  if (!emoteURL) return;
  showEmote(emoteURL);
});
