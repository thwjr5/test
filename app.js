//app.js

const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.static('public'));
app.use('/videos', express.static('videos')); // Serve video files from the 'videos' folder

app.get('/categories', (req, res) => {
    const videoRootDirectory = path.join(__dirname, 'videos');

    fs.readdir(videoRootDirectory, { withFileTypes: true }, (err, folders) => {
        if (err) {
            res.status(500).send('Error reading categories directory');
            return;
        }

        const categories = folders.filter(folder => folder.isDirectory())
                                  .map(folder => folder.name);
        res.json(categories);
    });
});

app.get('/videos', (req, res) => {
    const videoRootDirectory = path.join(__dirname, 'videos');
    const start = parseInt(req.query.start) || 0;
    const batchSize = 10;
    const category = req.query.category || 'all';
    const search = req.query.search || '';

    fs.readdir(videoRootDirectory, { withFileTypes: true }, (err, folders) => {
        if (err) {
            res.status(500).send('Error reading video directory');
            return;
        }

        const videoDirectories = folders.filter(folder => folder.isDirectory()).map(folder => folder.name);

        const getVideoFiles = (dir, isRoot = false) => {
            return fs.promises.readdir(dir, { withFileTypes: true })
                .then(files => {
                    const videoFiles = files.filter(file => file.isFile() && path.extname(file.name) === '.mp4')
                        .map(file => ({ url: `/videos${isRoot ? '' : '/' + path.basename(dir)}/${file.name}`, name: file.name }));
                    return videoFiles;
                });
        };
        
        const videoPromises = [getVideoFiles(videoRootDirectory, true), ...videoDirectories.map(dir => getVideoFiles(path.join(videoRootDirectory, dir)))];
        
        Promise.all(videoPromises)
            .then((allVideos) => {
                const videos = allVideos.flat();

                let filteredVideos = videos;
                if (category !== 'all') {
                    filteredVideos = videos.filter(video => path.dirname(video.url).includes(category));
                }

                if (search) {
                    const searchRegex = new RegExp(search, 'i');
                    filteredVideos = filteredVideos.filter(video => searchRegex.test(video.name));
                }

                const videoBatch = filteredVideos.slice(start, start + batchSize);
                res.json(videoBatch);
            })
            .catch((error) => {
                res.status(500).send('Error processing video files');
                console.error(error);
            });
    });
});

app.post('/move-video', (req, res) => {
    const videoUrl = req.query.videoUrl;
    const category = req.query.category;

    if (!videoUrl || !category) {
        res.status(400).send('Invalid parameters');
        return;
    }

    const videoPath = path.join(__dirname, videoUrl.substring(1));
    const newPath = path.join(__dirname, 'videos', category, path.basename(videoUrl));

    fs.promises.rename(videoPath, newPath)
        .then(() => {
            res.sendStatus(200);
        })
        .catch(err => {
            console.error(err);
            res.status(500).send('Error moving video');
        });
});

app.listen(port, '0.0.0.0', () => {
    console.log(`Server is running at http://localhost:${port}`);
});
