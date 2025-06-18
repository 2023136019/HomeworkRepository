// index.js

const express = require('express');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs').promises;

const app = express();
const port = 3000;

const dbFile = path.join(__dirname, 'product.db');
const commentFile = path.join(__dirname, 'comment.json');

// 미들웨어 설정
app.use(express.json()); // JSON 요청 본문 파싱
app.use(express.static(path.join(__dirname, 'public'))); // 정적 파일 제공

// 데이터베이스 연결
const db = new sqlite3.Database(dbFile, (err) => {
    if (err) {
        console.error('데이터베이스 연결 실패:', err.message);
    } else {
        console.log('데이터베이스에 성공적으로 연결되었습니다.');
    }
});

// --- 페이지 제공 라우트 ---

// 메인 페이지
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 로그인 페이지
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// 회원가입 페이지
app.get('/signup', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'signup.html'));
});

// 영화 상세 페이지
app.get('/movies/:id', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'movie.html'));
});


// --- API 라우트 ---

// 모든 영화 정보 가져오기 (검색 및 정렬 기능 포함)
app.get('/api/movies', (req, res) => {
    const keyword = req.query.q;
    const sort = req.query.sort;

    let sql = 'SELECT * FROM movies';
    const params = [];

    if (keyword) {
        sql += ' WHERE movie_title LIKE ?';
        params.push(`%${keyword}%`);
    }

    if (sort) {
        switch (sort) {
            case 'rate_desc':
                sql += ' ORDER BY movie_rate DESC';
                break;
            case 'rate_asc':
                sql += ' ORDER BY movie_rate ASC';
                break;
            case 'date_desc':
                sql += ' ORDER BY movie_release_date DESC';
                break;
            case 'date_asc':
                sql += ' ORDER BY movie_release_date ASC';
                break;
        }
    }

    db.all(sql, params, (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// 특정 영화 정보 및 후기 가져오기
app.get('/api/movies/:id', async (req, res) => {
    const movieId = req.params.id;
    const sql = 'SELECT * FROM movies WHERE movie_id =?';

    db.get(sql, [movieId], async (err, movie) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (!movie) {
            return res.status(404).json({ error: '영화를 찾을 수 없습니다.' });
        }

        try {
            const data = await fs.readFile(commentFile, 'utf8');
            const allComments = JSON.parse(data);
            const comments = allComments[movieId] || [];
            res.json({...movie, comments });
        } catch (fileErr) {
            // 파일이 없거나 읽기 오류 발생 시 빈 후기 배열 반환
            res.json({...movie, comments: [] });
        }
    });
});

// 새로운 후기 추가하기
app.post('/api/movies/:id/comments', async (req, res) => {
    const movieId = req.params.id;
    const { comment } = req.body;

    if (!comment) {
        return res.status(400).json({ error: '후기 내용이 없습니다.' });
    }

    try {
        let allComments;
        try {
            const data = await fs.readFile(commentFile, 'utf8');
            allComments = JSON.parse(data);
        } catch (readErr) {
            // 파일이 존재하지 않을 경우 새로운 객체로 시작
            allComments = {};
        }

        if (!allComments[movieId]) {
            allComments[movieId] = [];
        }
        allComments[movieId].push(comment);

        await fs.writeFile(commentFile, JSON.stringify(allComments, null, 2), 'utf8');
        res.status(201).json({ message: '후기가 성공적으로 등록되었습니다.', comment });
    } catch (writeErr) {
        res.status(500).json({ error: '후기를 저장하는 중 오류가 발생했습니다.' });
    }
});


// 서버 시작
app.listen(port, () => {
    console.log(`서버가 http://localhost:${port} 에서 실행 중입니다.`);
});

// 어플리케이션 종료 시 데이터베이스 연결 종료
process.on('SIGINT', () => {
    db.close((err) => {
        if (err) {
            return console.error(err.message);
        }
        console.log('데이터베이스 연결이 종료되었습니다.');
        process.exit(0);
    });
});