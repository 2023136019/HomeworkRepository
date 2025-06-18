// setup_database.js (완전히 새로 작성된 버전)

const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const dbFile = path.join(__dirname, 'product.db');
const csvFile = path.join(__dirname, 'movies_data.csv');

// 데이터베이스 파일이 이미 존재하면 삭제하여 매번 새로 생성하도록 함
if (fs.existsSync(dbFile)) {
    fs.unlinkSync(dbFile);
}

// 데이터베이스 연결
const db = new sqlite3.Database(dbFile, (err) => {
    if (err) {
        return console.error('데이터베이스 연결 실패:', err.message);
    }
    console.log('SQLite 데이터베이스에 성공적으로 연결되었습니다.');
});

/**
 * CSV 파일을 안정적으로 파싱하는 새로운 함수.
 * 따옴표, 줄바꿈, 쉼표가 포함된 데이터를 정확하게 처리합니다.
 * @param {string} filePath - CSV 파일 경로
 * @returns {Array<Object>} - 파싱된 데이터 객체의 배열
 */
function robustCSVParser(filePath) {
    try {
        const text = fs.readFileSync(filePath, 'utf8');
        const rows = [];
        let currentRow = [];
        let currentField = '';
        let inQuotes = false;

        // 파일을 한 글자씩 순회하며 파싱
        for (let i = 0; i < text.length; i++) {
            const char = text[i];

            if (inQuotes) {
                if (char === '"') {
                    // 다음 글자가 큰따옴표이면, 이는 이스케이프된 따옴표("")입니다.
                    if (i + 1 < text.length && text[i + 1] === '"') {
                        currentField += '"';
                        i++; // 따옴표 하나를 건너뜁니다.
                    } else {
                        // 필드를 감싸는 따옴표가 끝났습니다.
                        inQuotes = false;
                    }
                } else {
                    currentField += char;
                }
            } else {
                if (char === '"') {
                    inQuotes = true;
                } else if (char === ',') {
                    currentRow.push(currentField);
                    currentField = '';
                } else if (char === '\n' || char === '\r') {
                    currentRow.push(currentField);
                    rows.push(currentRow);
                    currentRow = [];
                    currentField = '';
                    // 윈도우(CRLF)와 맥/리눅스(LF) 줄바꿈을 모두 처리
                    if (char === '\r' && i + 1 < text.length && text[i + 1] === '\n') {
                        i++;
                    }
                } else {
                    currentField += char;
                }
            }
        }

        // 파일의 마지막 줄 처리
        if (currentField || currentRow.length > 0) {
            currentRow.push(currentField);
            rows.push(currentRow);
        }
        
        // 헤더와 데이터 분리
        const [headerRow, ...dataRows] = rows;
        if (!headerRow || dataRows.length === 0) {
            console.log('CSV 파일에 헤더 또는 데이터가 없습니다.');
            return [];
        }
        
        const headers = headerRow.map(h => h.trim());

        // 데이터를 객체 배열로 변환
        return dataRows.map((row, index) => {
            if (row.length !== headers.length) {
                console.warn(`경고: ${index + 2}번째 줄의 데이터 파싱에 실패했습니다. 건너뜁니다.`);
                return null;
            }
            const record = {};
            headers.forEach((header, i) => {
                record[header] = row[i];
            });
            return record;
        }).filter(r => r !== null); // 파싱에 실패한 줄은 제외

    } catch (error) {
        console.error('CSV 파일을 읽거나 파싱하는 중 오류가 발생했습니다:', error);
        return [];
    }
}


// 데이터베이스 작업을 순차적으로 실행
db.serialize(() => {
    const createTableSql = `
        CREATE TABLE movies (
            movie_id INTEGER PRIMARY KEY,
            movie_image TEXT NOT NULL,
            movie_title TEXT NOT NULL,
            movie_overview TEXT NOT NULL,
            movie_release_date TEXT,
            movie_rate REAL
        );
    `;
    db.run(createTableSql, (err) => {
        if (err) {
            return console.error('테이블 생성 실패:', err.message);
        }
        console.log("'movies' 테이블이 성공적으로 생성되었습니다.");

        // 새로운 파서 함수를 사용하여 영화 데이터 로드
        const movies = robustCSVParser(csvFile);
        if (movies.length === 0) {
            console.log('삽입할 영화 데이터가 없습니다.');
            db.close();
            return;
        }

        const insertSql = `INSERT INTO movies (movie_id, movie_image, movie_title, movie_overview, movie_release_date, movie_rate) VALUES (?,?,?,?,?,?)`;
        const stmt = db.prepare(insertSql);

        let insertedCount = 0;
        movies.forEach(movie => {
            const id = parseInt(movie.id, 10);
            // 데이터 유효성 검사 강화
            if (movie.id && !isNaN(id) && movie.title && movie.poster_path) {
                const imageUrl = `http://image.tmdb.org/t/p/w185${movie.poster_path}`;
                const rate = parseFloat(movie.vote_average) || 0;
                
                stmt.run(id, imageUrl, movie.title, movie.overview, movie.release_date, rate, function(err) {
                    if (err) {
                        console.error(`데이터 삽입 실패 (ID: ${movie.id}):`, err.message);
                    } else {
                        insertedCount++;
                    }
                });
            } else {
                console.warn(`경고: 유효하지 않은 데이터입니다. 건너뜁니다 (ID: ${movie.id || '없음'})`);
            }
        });

        stmt.finalize((err) => {
            if (err) {
                console.error('Statement finalize 실패:', err.message);
            }
            console.log(`${insertedCount}개의 영화 데이터가 성공적으로 삽입되었습니다.`);
            
            db.close((err) => {
                if (err) {
                    return console.error('데이터베이스 연결 종료 실패:', err.message);
                }
                console.log('SQLite 데이터베이스 연결이 종료되었습니다.');
            });
        });
    });
});