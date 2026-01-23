const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 3000;
const NAMES_FILE = path.join(__dirname, 'names.txt');
const LEADERBOARD_FILE = path.join(__dirname, 'leaderboard.txt');
const WEB_ROOT = __dirname; // Serve files from current directory

// Helper to append to Names file
function logName(name) {
    const timestamp = new Date().toISOString();
    const entry = `${timestamp}: ${name}\n`;
    fs.appendFile(NAMES_FILE, entry, (err) => {
        if (err) console.error('Error writing to names.txt:', err);
    });
}

// Helper to update Leaderboard
function updateLeaderboard(game, name, score) {
    // Read current leaderboard
    fs.readFile(LEADERBOARD_FILE, 'utf8', (err, data) => {
        let scores = [];
        if (!err && data) {
            // Parse existing file (Simple format: GAME|NAME|SCORE)
            scores = data.split('\n').filter(line => line.trim() !== '').map(line => {
                const parts = line.split('|');
                if (parts.length === 3) {
                    return { game: parts[0], name: parts[1], score: parseInt(parts[2]) };
                }
                return null;
            }).filter(s => s !== null);
        }

        // Add new score
        scores.push({ game, name, score });

        // Sort by score (descending)
        scores.sort((a, b) => b.score - a.score);

        // Keep top 50 global? Or per game?
        // Let's keep top 100 global for now, filtering can happen on display
        scores = scores.slice(0, 100);

        // serialize
        const newContent = scores.map(s => `${s.game}|${s.name}|${s.score}`).join('\n');

        fs.writeFile(LEADERBOARD_FILE, newContent, (err) => {
            if (err) console.error('Error writing leaderboard:', err);
        });
    });
}

// Helper to get Leaderboard for a game
function getLeaderboard(game, callback) {
    fs.readFile(LEADERBOARD_FILE, 'utf8', (err, data) => {
        if (err || !data) {
            callback([]);
            return;
        }
        const scores = data.split('\n').filter(line => line.trim() !== '').map(line => {
            const parts = line.split('|');
            return { game: parts[0], name: parts[1], score: parseInt(parts[2]) };
        }).filter(s => s.game === game);

        callback(scores.slice(0, 5)); // Return Top 5 for the game
    });
}

const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const method = req.method;

    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    // API ENDPOINTS
    if (parsedUrl.pathname === '/api/save-name' && method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', () => {
            try {
                const { name } = JSON.parse(body);
                if (name) {
                    logName(name);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true }));
                } else {
                    res.writeHead(400); // Bad Request
                    res.end();
                }
            } catch (e) {
                res.writeHead(400);
                res.end();
            }
        });
        return;
    }

    if (parsedUrl.pathname === '/api/save-score' && method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', () => {
            try {
                const { game, name, score } = JSON.parse(body);
                if (game && name && score !== undefined) {
                    updateLeaderboard(game, name, parseInt(score));
                    // Also log name as a visitor if not already?
                    logName(name + " (Played " + game + ")");
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true }));
                } else {
                    res.writeHead(400);
                    res.end();
                }
            } catch (e) {
                res.writeHead(400);
                res.end();
            }
        });
        return;
    }

    if (parsedUrl.pathname === '/api/leaderboard' && method === 'GET') {
        const game = parsedUrl.query.game;
        if (game) {
            getLeaderboard(game, (data) => {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(data));
            });
        } else {
            res.writeHead(400);
            res.end();
        }
        return;
    }

    // STATIC FILE SERVER (Fallback)
    // This allows playing via localhost:3000
    let filePath = path.join(WEB_ROOT, parsedUrl.pathname === '/' ? 'index.html' : parsedUrl.pathname);

    // Prevent directory traversal
    if (!filePath.startsWith(WEB_ROOT)) {
        res.writeHead(403);
        res.end();
        return;
    }

    const extname = path.extname(filePath);
    let contentType = 'text/html';
    switch (extname) {
        case '.js': contentType = 'text/javascript'; break;
        case '.css': contentType = 'text/css'; break;
        case '.json': contentType = 'application/json'; break;
        case '.png': contentType = 'image/png'; break;
        case '.jpg': contentType = 'image/jpg'; break;
    }

    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code == 'ENOENT') {
                res.writeHead(404);
                res.end('404 Not Found');
            }
            else {
                res.writeHead(500);
                res.end('Server Error: ' + error.code);
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });

});

server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}/`);
    console.log(`Data will be saved to:`);
    console.log(` - ${NAMES_FILE}`);
    console.log(` - ${LEADERBOARD_FILE}`);
});
