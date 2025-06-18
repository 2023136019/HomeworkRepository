// public/js/main.js

document.addEventListener('DOMContentLoaded', () => {
    const movieGrid = document.getElementById('movie-grid');
    const searchInput = document.getElementById('search-input');
    const sortSelect = document.getElementById('sort-select');

    // 영화 목록을 가져와서 화면에 렌더링하는 함수
    const fetchAndDisplayMovies = async (query = '', sort = 'rate_desc') => {
        try {
            const response = await fetch(`/api/movies?q=${encodeURIComponent(query)}&sort=${sort}`);
            if (!response.ok) {
                throw new Error('서버에서 영화 정보를 가져오는 데 실패했습니다.');
            }
            const movies = await response.json();
            renderMovies(movies);
        } catch (error) {
            console.error(error);
            movieGrid.innerHTML = '<p>영화 정보를 불러오는 중 오류가 발생했습니다.</p>';
        }
    };

    // 영화 데이터를 HTML로 변환하여 그리드에 삽입하는 함수
    const renderMovies = (movies) => {
        movieGrid.innerHTML = ''; // 기존 목록 초기화
        if (movies.length === 0) {
            movieGrid.innerHTML = '<p>표시할 영화가 없습니다.</p>';
            return;
        }
        movies.forEach(movie => {
            const movieCard = `
                <div class="movie-card">
                    <a href="/movies/${movie.movie_id}">
                        <img src="${movie.movie_image}" alt="${movie.movie_title} 포스터">
                        <div class="movie-card-info">
                            <h3>${movie.movie_title}</h3>
                            <p>${movie.movie_release_date}</p>
                            <p>⭐ ${movie.movie_rate}</p>
                        </div>
                    </a>
                </div>
            `;
            movieGrid.insertAdjacentHTML('beforeend', movieCard);
        });
    };

    // 검색 입력 이벤트 리스너
    searchInput.addEventListener('input', () => {
        fetchAndDisplayMovies(searchInput.value, sortSelect.value);
    });

    // 정렬 변경 이벤트 리스너
    sortSelect.addEventListener('change', () => {
        fetchAndDisplayMovies(searchInput.value, sortSelect.value);
    });

    // 초기 영화 목록 로드
    fetchAndDisplayMovies();
});