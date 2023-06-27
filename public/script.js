//script.js

const videoGrid = document.getElementById('video-grid');
const sentinel = document.createElement('div');
const searchBar = document.getElementById('search-bar');
const categories = document.getElementById('categories');
const overlay = document.getElementById('overlay');
videoGrid.appendChild(sentinel);

let videoStart = 0;
const videoBatchSize = 10;
let isInTheaterMode = false;
let currentCategory = 'all';
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

async function fetchCategories() {
  try {
    const response = await fetch('/categories');
    if (!response.ok) {
      throw new Error('Error fetching categories');
    }
    return response.json();
  } catch (error) {
    console.error(error);
  }
}

async function createCategorySelect() {
  try {
    const categories = await fetchCategories();
    const select = document.createElement('select');

    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'Select Category';
    select.appendChild(defaultOption);

    categories.forEach((category) => {
      const option = document.createElement('option');
      option.value = category;
      option.textContent = category;
      select.appendChild(option);
    });

    return select;
  } catch (error) {
    console.error(error);
  }
}

function moveVideoToCategory(videoElement, videoUrl, category) {
  fetch(`/move-video?videoUrl=${videoUrl}&category=${category}`, {
    method: 'POST',
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error('Error moving video');
      }
      videoElement.remove();
    })
    .catch((error) => {
      console.error(error);
    });
}

// Create the category elements
function createCategoryElement(category) {
  const categoryElement = document.createElement('div');
  categoryElement.classList.add('category');
  categoryElement.textContent = category;
  categoryElement.dataset.category = category;

  if (category === 'all') {
    categoryElement.classList.add('active');
  }

  return categoryElement;
}

// Initialize categories
async function initializeCategories() {
    const categoryList = await fetchCategories();
    categoryList.unshift('all'); // Add 'all' category to the beginning of the array
  
    categoryList.forEach((category) => {
      const categoryElement = createCategoryElement(category);
      categories.appendChild(categoryElement);
    });
  }
  
  initializeCategories();
  
  categories.addEventListener('click', (event) => {
    const categoryElement = event.target.closest('.category');
    if (categoryElement) {
      const category = categoryElement.dataset.category;
      if (currentCategory !== category) {
        currentCategory = category;
        videoStart = 0;
        videoGrid.innerHTML = ''; // Clear the current video grid
        fetchVideos(videoStart, currentCategory, searchTerm);
        Array.from(categories.children).forEach((el) =>
          el.classList.remove('active')
        );
        categoryElement.classList.add('active');
      }
    }
  });
  
  async function createVideoElement(videoFile) {
    const videoContainer = document.createElement('div');
    videoContainer.classList.add('video-container');
  
    const videoElement = document.createElement('video');
    videoElement.classList.add('video');
    videoElement.src = videoFile.url;
    videoElement.controls = false;
    videoElement.muted = true;
    videoElement.loop = true;
    videoElement.setAttribute('preload', 'metadata');
  
    const categorySelect = await createCategorySelect();
    categorySelect.addEventListener('change', () => {
      moveVideoToCategory(
        videoContainer,
        videoFile.url,
        categorySelect.value
      );
    });
  
    videoContainer.appendChild(videoElement);
    videoContainer.appendChild(categorySelect);
  
    const videoSelectCheckbox = document.createElement('input');
    videoSelectCheckbox.type = 'checkbox';
    videoSelectCheckbox.classList.add('video-select-checkbox');
    videoContainer.appendChild(videoSelectCheckbox);
  
    videoElement.addEventListener('mouseenter', playVideo);
    videoElement.addEventListener('mouseleave', pauseVideo);
  
    videoElement.addEventListener('click', () => {
      toggleTheaterMode(videoElement);
    });
  
    return videoContainer;
  }
  
  // Fetch videos function
  async function fetchVideos(start = 0, category = 'all', search = '') {
    try {
      const response = await fetch(`/videos?start=${start}&category=${category}&search=${search}`);
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
        fetchVideos(videoStart, currentCategory, searchTerm);
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
  
  fetchVideos(videoStart, currentCategory, searchTerm);
  
  searchBar.addEventListener(
    'input',
    debounce((event) => {
      searchTerm = event.target.value.trim();
      videoStart = 0;
      videoGrid.innerHTML = '';
      fetchVideos(videoStart, currentCategory, searchTerm);
    }, 500)
  );
  
  