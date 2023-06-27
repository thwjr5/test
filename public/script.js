//script.js

const videoGrid = document.getElementById('video-grid');
const sentinel = document.createElement('div');
const searchBar = document.getElementById('search-bar');
const overlay = document.getElementById('overlay');
videoGrid.appendChild(sentinel);

let videoStart = 0;
const videoBatchSize = 10;
let isInTheaterMode = false;
let searchTerm = '';

function playVideo(event) {
  if (!isInTheaterMode) {
    event.target.play();
  }
}

function pauseVideo(event) {
  if (!isInTheaterMode) {
    event.target.pause();
  }
}

async function createVideoElement(videoFile) {
  const videoContainer = document.createElement('div');
  videoContainer.classList.add('video-container');

  const videoElement = document.createElement('video');
  videoElement.classList.add('video');
  videoElement.src = `/videos/${videoFile.url.split('/').pop()}`;
  videoElement.controls = false;
  videoElement.muted = true;
  videoElement.loop = true;
  videoElement.setAttribute('preload', 'metadata');

  videoContainer.appendChild(videoElement);
  videoGrid.appendChild(videoContainer);

  videoElement.addEventListener('mouseenter', playVideo);
  videoElement.addEventListener('mouseleave', pauseVideo);

  videoElement.addEventListener('click', () => {
    toggleTheaterMode(videoElement);
  });

  return videoContainer;
}

// Fetch videos function
async function fetchVideos(start = 0, search = '') {
  try {
    const response = await fetch(`/videos?start=${start}&search=${search}`);
    if (!response.ok) {
      throw new Error('Error fetching video list');
    }
    const videoFiles = await response.json();
    for (const videoFile of videoFiles) {
      const videoElement = await createVideoElement(videoFile);
      videoGrid.appendChild(videoElement);
    }
  } catch (error) {
    console.error(error);
  }
}

function toggleTheaterMode(video) {
  if (video.classList.contains('theater-mode')) {
    video.classList.remove('theater-mode');
    overlay.style.display = 'none';
    video.muted = true;
    video.controls = false;
    isInTheaterMode = false;
    video.addEventListener('mouseover', playVideo);
    video.addEventListener('mouseout', pauseVideo);
  } else {
    video.classList.add('theater-mode');
    overlay.style.display = 'block';
    video.muted = false;
    video.controls = false;
    video.play();
    isInTheaterMode = true;
    video.removeEventListener('mouseover', playVideo);
    video.removeEventListener('mouseout', pauseVideo);
  }
}

function observerCallback(entries, observer) {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      videoStart += videoBatchSize;
      fetchVideos(videoStart, searchTerm);
      observer.disconnect();
      videoGrid.removeChild(sentinel);
      videoGrid.appendChild(sentinel);
      observer.observe(sentinel);
    }
  });
}

const observer = new IntersectionObserver(observerCallback, {
  root: null,
  rootMargin: '0px',
  threshold: 0,
});

observer.observe(sentinel);

fetchVideos(videoStart, searchTerm);
