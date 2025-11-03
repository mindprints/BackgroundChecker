// Simple scrub-controlled video without autoplay
(function(){
  const video = document.getElementById('heroVideo');
  const slider = document.getElementById('timeSlider');
  const currentEl = document.getElementById('currentTime');
  const durationEl = document.getElementById('duration');
  const yearEl = document.getElementById('year');

  yearEl.textContent = new Date().getFullYear();

  // Load source dynamically to avoid accidental autoplay policies
  const source = document.createElement('source');
  source.src = 'museum_video.mp4';
  source.type = 'video/mp4';
  video.appendChild(source);

  // Never autoplay. Keep paused. Hide native controls.
  video.controls = false;
  let duration = 0;
  let isSeeking = false;

  function formatTime(sec){
    if (!isFinite(sec)) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return m + ':' + (s < 10 ? '0' + s : s);
  }

  video.addEventListener('loadedmetadata', () => {
    duration = video.duration || 0;
    durationEl.textContent = formatTime(duration);
    slider.value = '0';
  });

  // When user moves slider, set currentTime proportionally.
  slider.addEventListener('input', () => {
    if (!duration || duration === Infinity) return;
    isSeeking = true;
    const ratio = Number(slider.value) / Number(slider.max);
    video.currentTime = ratio * duration;
  });

  slider.addEventListener('change', () => {
    isSeeking = false;
  });

  // Update slider position when currentTime changes (if not seeking)
  video.addEventListener('timeupdate', () => {
    if (!duration || isSeeking) return;
    const ratio = video.currentTime / duration;
    slider.value = String(Math.round(ratio * Number(slider.max)));
    currentEl.textContent = formatTime(video.currentTime);
  });

  // Also update readout on slider input
  slider.addEventListener('input', () => {
    if (!duration || duration === Infinity) {
      currentEl.textContent = '0:00';
      return;
    }
    const ratio = Number(slider.value) / Number(slider.max);
    const t = ratio * duration;
    currentEl.textContent = formatTime(t);
  });

  // Prevent play on click
  video.addEventListener('click', (e) => {
    e.preventDefault();
    // Optionally toggle mute on click
    video.muted = !video.muted;
  });
})();
