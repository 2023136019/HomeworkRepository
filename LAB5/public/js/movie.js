// public/js/movie.js

document.addEventListener('DOMContentLoaded', async () => {
    const pathParts = window.location.pathname.split('/');
    const movieId = pathParts[pathParts.length - 1];

    const moviePoster = document.getElementById('movie-poster');
    const movieTitle = document.getElementById('movie-title');
    const movieInfoId = document.getElementById('movie-info-id');
    const movieInfoReleaseDate = document.getElementById('movie-info-release-date');
    const movieInfoRate = document.getElementById('movie-info-rate');
    const movieInfoOverview = document.getElementById('movie-info-overview');
    const commentList = document.getElementById('comment-list');
    const commentForm = document.getElementById('comment-form');
    const commentInput = document.getElementById('comment-input');

    // 영화 상세 정보 및 후기 로드
    try {
        const response = await fetch(`/api/movies/${movieId}`);
        if (!response.ok) {
            throw new Error('영화 정보를 가져오는 데 실패했습니다.');
        }
        const movie = await response.json();

        document.title = `${movie.movie_title} - 영화 정보`;
        moviePoster.innerHTML = `<img src="${movie.movie_image}" alt="${movie.movie_title} 포스터">`;
        movieTitle.textContent = movie.movie_title;
        movieInfoId.textContent = `영화 ID: ${movie.movie_id}`;
        movieInfoReleaseDate.textContent = `개봉일: ${movie.movie_release_date}`;
        movieInfoRate.textContent = `⭐ 평점: ${movie.movie_rate}`;
        movieInfoOverview.textContent = movie.movie_overview;

        renderComments(movie.comments);

    } catch (error) {
        console.error(error);
        document.getElementById('movie-detail-container').innerHTML = '<p>정보를 불러오는 중 오류가 발생했습니다.</p>';
    }

    // 후기 렌더링 함수
    function renderComments(comments) {
        commentList.innerHTML = '';
        if (comments && comments.length > 0) {
            comments.forEach(comment => {
                const li = document.createElement('li');
                li.textContent = comment;
                commentList.appendChild(li);
            });
        } else {
            commentList.innerHTML = '<li>작성된 후기가 없습니다.</li>';
        }
    }

    // 후기 제출 이벤트 리스너
    commentForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const commentText = commentInput.value.trim();
        if (!commentText) {
            alert('후기 내용을 입력해주세요.');
            return;
        }

        try {
            const response = await fetch(`/api/movies/${movieId}/comments`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ comment: commentText }),
            });

            if (!response.ok) {
                throw new Error('후기 등록에 실패했습니다.');
            }

            const result = await response.json();
            
            // 후기 목록 다시 로드 대신, 성공적으로 추가된 후기만 목록에 추가 (UX 개선)
            if (commentList.querySelector('li').textContent === '작성된 후기가 없습니다.') {
                commentList.innerHTML = '';
            }
            const newCommentLi = document.createElement('li');
            newCommentLi.textContent = result.comment;
            commentList.appendChild(newCommentLi);
            
            commentInput.value = ''; // 입력창 초기화

        } catch (error) {
            console.error(error);
            alert('후기를 등록하는 중 오류가 발생했습니다.');
        }
    });
});