import path from 'path';
import {promises as fsPromises} from 'fs'; // 비동기 파일 작업용
import {fileURLToPath} from 'url';
import db from '../config/db.js';
// __dirname 설정
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 데이터 경로 설정
const likePath = path.join(__dirname, '../models/likes.json');
const postPath = path.join(__dirname, '../models/posts.json');



const getPosts = async (req, res) => {
    // 세션 정보 확인 (로그인 여부)
    if (!req.session.user) {
        return res.status(401).json({message: 'Unauthorized'}); // 로그인이 필요함
    }
    try {
        // SQL 쿼리 실행
        const [posts] = await db.execute(`
            SELECT
                posts.id AS postId,
                posts.title AS title, 
                posts.body AS content,
                posts.post_image AS postImagePath,
                DATE_FORMAT(posts.created_at, '%Y-%m-%d %H:%i:%s') AS dateAt,
                posts.like_count AS likeCount,
                posts.comment_count AS commentCount,
                posts.view_count AS viewCount,
                users.name AS author,
                users.profile_image AS profileImage
            FROM posts
            JOIN users ON posts.user_id = users.id
            ORDER BY posts.created_at DESC
        `);

        // 성공 응답
        res.status(200).json({
            message: "데이터 목록 조회 성공",
            data: posts,
        });
    } catch (error) {
        // 에러 처리
        res.status(500).json({
            message: "데이터 목록 조회 실패",
            error: error.message,
        });
    }
};

// 게시글 조회
const getPost = async (req, res) => {
    // 세션 정보 확인
    if (!req.session.user) {
        return res.status(401).json({message: 'Unauthorized'}); // 로그인이 필요함
    }
    try {
        const {postId} = req.params;
        console.log('Received postId:', postId);
        await db.execute(`
            UPDATE posts
            SET view_count = view_count + 1
            WHERE id = ?
        `, [postId]);

        // DB 조회 및 JOIN
        const [postResults] = await db.execute(`
            SELECT 
                posts.id AS postId,
                posts.title AS title,
                posts.body AS content,
                posts.user_id AS userId,
                posts.post_image AS postImagePath,
                DATE_FORMAT(posts.created_at, '%Y-%m-%d %H:%i:%s') AS dateAt,
                posts.like_count AS likeCount,
                posts.comment_count AS commentCount,
                posts.view_count AS viewCount,
                users.name AS author,
                users.profile_image AS profileImage
            FROM posts
            JOIN users ON posts.user_id = users.id
            WHERE posts.id = ?
        `, [postId]);

        // 게시글이 없는 경우 처리
        if (postResults.length === 0) {
            return res.status(404).json({
                message: "게시글을 찾을 수 없습니다.",
            });
        }

        // 성공적으로 게시글 반환
        res.status(200).json({
            message: "게시글 조회 성공",
            post: postResults[0], // 첫 번째 게시글 반환
        });

    } catch (error) {
        // 에러 처리
        console.error('Error fetching post:', error);
        res.status(500).json({
            message: "게시글 조회 실패",
            error: error.message,
        });
    }
};
// 게시글 작성
const postPost = async (req, res) => {
    try {
        const {title, content} = req.body;
        const user = req.session?.user?.userId;
        console.log("바디내용", title, content);
        console.log("유저", user);
        // 사용자 확인
        if (!req.session.user) {
            return res.status(401).json({message: "로그인이 필요합니다."});
        }
        // 유효성 검사(이것도 사실 필요없음)
        if (!title || !content) {
            return res.status(400).json({message: "제목과 내용을 입력해주세요."});
        }
        // 이미지 경로 설정
        const postImagePath = req.file ? `/img/posts/${req.file.filename}` : null;

        // 데이터베이스에 게시글 삽입
        const [result] = await db.execute(
            "INSERT INTO posts (title, body, user_id, post_image, created_at) VALUES (?, ?, ?, ?, NOW())",
            [title, content, user, postImagePath]
        );
        //post id 체크
        const newPostId = result.insertId;
        console.log("새 게시글 ID:", newPostId);
        res.status(201).json({
            message: "게시글이 생성되었습니다.",
            post: {
                id: newPostId,
                title,
                content,
                userId: user.userId,
                postImagePath,
                createdAt: new Date().toISOString(), // 서버에서 현재 시간
                likeCount: 0,
                commentCount: 0,
                viewCount: 0,
            },
        });
    } catch (error) {
        console.error("게시글 작성 중 오류 발생:", error);
        res.status(500).json({message: "서버에서 문제가 발생했습니다."});
    }
};

//// PUT: 게시글 수정
const editPost = async (req, res) => {
    try {
        const {postId} = req.params;
        const updatedData = req.body;
        const uploadedFile = req.file || null;
        const userId = req.session?.user?.userId; // 세션에서 사용자 ID 추출
        const { imageStatus } = updatedData; // 클라이언트에서 전달된 이미지 상태

        console.log(`postId: ${postId}`);
        console.log('수정할 데이터:', updatedData);
        console.log('업로드된 파일:', uploadedFile);

        // 데이터 유효성 검사
        if (!updatedData.editTitle || !updatedData.editContent) {
            return res.status(400).json({message: "제목과 내용을 모두 입력해주세요."});
        }
        // 게시글 가져오기
        const [postResults] = await db.execute(
            "SELECT * FROM posts WHERE id = ?",
            [postId]
        );
        const post = postResults[0];
        // 권한 확인
        if (post.user_id !== userId) {
            return res.status(403).json({message: '게시글 수정 권한이 없습니다.'});
        }

        // 파일 경로 설정 (이미지 상태에 따라 처리)
        let postImagePath = post.post_image;

        if (imageStatus === "new" && uploadedFile) {
            // 새 파일이 업로드된 경우
            postImagePath = `/img/posts/${uploadedFile.filename}`;
        } else if (imageStatus === "null") {
            // 이미지 삭제 요청
            postImagePath = null;
        }

        await db.execute(
            "UPDATE posts SET title = ?, body = ?, post_image = ? WHERE id = ?",
            [updatedData.editTitle, updatedData.editContent, postImagePath, postId]
        );
        // 성공 응답
        res.status(200).json({
            message: '게시글이 성공적으로 수정되었습니다.', post: {
                postId,
                title: updatedData.editTitle,
                content: updatedData.editContent,
                postImagePath,
            },
        });
    } catch (error) {
        console.error('서버 오류 발생:', error);
        res.status(500).json({message: '서버에서 문제가 발생했습니다.'});
    }
};

// 게시글 삭제 API
const deletePost = async (req, res) => {
    try {
        const {postId} = req.params;
        console.log('Received postId:', postId);
        // 세션에서 사용자 ID 가져오기
        const userId = req.session?.user?.userId;
        if (!userId) {
            return res.status(401).json({message: '사용자 인증이 필요합니다.'});
        }

        // 게시글 조회
        const [postResults] = await db.execute(
            "SELECT * FROM posts WHERE id = ?",
            [postId]
        );
        const post = postResults[0];

        // 삭제 권한 확인
        if (post.user_id !== userId) {
            return res.status(403).json({message: "게시글 삭제 권한이 없습니다."});
        }

        // 게시글 삭제
        await db.execute("DELETE FROM posts WHERE id = ?", [postId]);
        console.log(`게시글 ID ${postId} 삭제 완료`);

        res.status(200).json({message: '게시글이 성공적으로 삭제되었습니다.'});
    } catch (error) {
        console.error('서버 오류:', error.message);
        res.status(500).json({message: '서버 오류: 게시글 삭제 실패'});
    }
};
//댓글 목록
// 댓글 조회
const getComments = async (req, res) => {
    try {
        const {postId} = req.params; // 게시글 ID
        if (!req.session.user) {
            return res.status(401).json({message: '로그인이 필요합니다.'}); // 로그인이 필요함
        }


        // 댓글 및 사용자 데이터 읽기 (DB 쿼리 사용)
        const [commentsResults] = await db.execute(`
            SELECT 
                comments.id AS commentId,
                comments.content AS content,
                comments.user_id AS userId,
                DATE_FORMAT(comments.created_at, '%Y-%m-%d %H:%i:%s') AS dateAt,
                users.name AS author,
                users.profile_image AS profile_image
            FROM comments
            JOIN users ON comments.user_id = users.id
            WHERE comments.post_id = ?
            ORDER BY comments.created_at DESC
        `, [postId]);


        // 성공 응답
        res.status(200).json({
            message: "댓글 조회 성공",
            data: {
                postId: Number(postId),
                comments: commentsResults,
            },
        });
    } catch (error) {
        // 오류 처리
        console.error('댓글 조회 중 오류:', error);
        res.status(500).json({
            message: "댓글 조회 중 서버 오류 발생",
            error: error.message,
        });
    }
};


const postComments = async (req, res) => {
    const connection = await db.getConnection(); // 트랜잭션 객체 생성
    try {
        console.log("요청 데이터:", req.body);

        const { postId } = req.params;
        const userId = req.session?.user?.userId;
        const { text } = req.body;

        if (!userId) {
            return res.status(401).json({ message: "로그인이 필요합니다." });
        }

        if (!text || text.trim() === '') {
            return res.status(400).json({ message: "댓글 내용이 비어있습니다." });
        }

        await connection.beginTransaction(); // 트랜잭션 시작

        // 1. 댓글 삽입
        const [insertResult] = await connection.execute(
            `
            INSERT INTO comments (post_id, user_id, content, created_at)
            VALUES (?, ?, ?, NOW())
            `,
            [postId, userId, text.trim()]
        );

        // 2. 댓글 카운트 업데이트
        await connection.execute(
            `
            UPDATE posts
            SET comment_count = comment_count + 1
            WHERE id = ?
            `,
            [postId]
        );

        // 3. 삽입된 댓글 데이터 가져오기
        const [commentData] = await connection.execute(
            `
            SELECT c.id AS commentId, c.post_id AS postId, c.user_id AS userId, 
            c.content, c.created_at AS dateAt,u.profile_image, u.name AS author
            FROM comments c
            JOIN users u ON c.user_id = u.id
            WHERE c.id = ?
            `,
            [insertResult.insertId]
        );

        await connection.commit(); // 트랜잭션 커밋

        const newComment = commentData[0]; // 삽입된 댓글 데이터
        console.log("백에서 생성된 댓글 데이터:", newComment); // 로그로 확인
        res.status(201).json({
            message: '댓글이 성공적으로 작성되었습니다.',
            comment: newComment,
        });
    } catch (error) {
        await connection.rollback(); // 오류 발생 시 트랜잭션 롤백
        console.error('서버 오류 발생:', error.message);
        res.status(500).json({ message: '서버 오류: 댓글 작성 실패' });
    } finally {
        connection.release(); // 연결 반환
    }
};



//댓글수정
const putComments = async (req, res) => {
    try {
        console.log("요청 URL:", req.originalUrl);
        console.log("req.params:", req.params);
        const { postId, commentId } = req.params;
        const userId = req.session?.user?.userId; // 세션에서 userId 가져오기
        const { text } = req.body;

        console.log("userId:", userId);
        console.log("게시글 정보:", postId);
        console.log("댓글 정보:", commentId);
        console.log("수정 댓글내용:", text);

        // 1. 유저 인증 확인
        if (!userId) {
            return res.status(401).json({ message: "로그인이 필요합니다." });
        }

        // 2. 댓글 존재 여부 확인
        const [commentResults] = await db.execute(
            "SELECT * FROM comments WHERE id = ? AND post_id = ?",
            [commentId, postId]
        );
        const comment = commentResults[0];

        if (!comment) {
            return res.status(404).json({ message: "해당 댓글을 찾을 수 없습니다." });
        }

        console.log("댓글 작성자 아이디 비교", comment.user_id);
        console.log("유저 아이디 비교", userId);

        // 3. 댓글 작성자와 현재 유저 비교
        if (comment.user_id !== userId) {
            return res.status(403).json({ message: "댓글 수정 권한이 없습니다." });
        }

        // 4. 댓글 수정
        await db.execute(
            "UPDATE comments SET content = ? WHERE id = ? AND post_id = ?",
            [text, commentId, postId]
        );

        // 5. 수정된 댓글 데이터 조회 (users와 조인)
        const [updatedCommentResults] = await db.execute(
            `
            SELECT c.id AS commentId, c.post_id AS postId, c.user_id AS userId, 
                   c.content, u.profile_image, u.name AS author
            FROM comments c
            JOIN users u ON c.user_id = u.id
            WHERE c.id = ?
            `,
            [commentId]
        );

        const updatedComment = updatedCommentResults[0];

        if (!updatedComment) {
            return res.status(404).json({ message: "수정된 댓글 데이터를 찾을 수 없습니다." });
        }

        console.log("수정된 댓글 데이터:", updatedComment);

        return res.status(200).json({
            message: "댓글이 성공적으로 수정되었습니다.",
            comment: updatedComment,
        });
    } catch (error) {
        console.error("댓글 수정 중 오류 발생:", error);
        return res.status(500).json({ message: "댓글 수정 중 문제가 발생했습니다." });
    }
};




//댓글삭제
const deleteComments = async (req, res) => {
    try {
        console.log("요청 URL:", req.originalUrl); // 요청된 URL 확인
        console.log("req.params:", req.params); // 모든 params 확인
        const {postId, commentId} = req.params;
        const userId = req.session?.user?.userId; // 세션에서 userId 가져오기

        console.log("게시글 정보:", postId);
        console.log("댓글 정보:", commentId);

        // 1. 유저 인증 확인
        if (!userId) {
            return res.status(401).json({message: "로그인이 필요합니다."});
        }


        // 2. 파일에서 댓글 데이터 읽기
        const [commentResults] = await db.execute(
            "SELECT * FROM comments WHERE id =? AND post_id = ? ",
            [commentId,postId]
        );
        const comment = commentResults[0];
        console.log(comment);

        if (!comment) {
            // 댓글이 존재하지 않는 경우
            return res.status(404).json({message: "해당 댓글을 찾을 수 없습니다."});
        }

        // 4. 댓글 작성자와 현재 유저 비교
        if (comment.user_id !== userId) {
            return res.status(403).json({message: "댓글 삭제 권한이 없습니다."});
        }
        await db.execute(
            "DELETE FROM comments WHERE id = ? AND post_id = ?",
            [commentId,postId]
        );
        await db.execute(
            "UPDATE posts SET comment_count = GREATEST(comment_count-1,0) WHERE id =?",
            [postId]
        )
        return res.status(200).json({message: "댓글이 성공적으로 삭제되었습니다."});
    } catch (error) {
        console.error("댓글 삭제 중 오류 발생:", error);
        return res.status(500).json({message: "댓글 삭제 중 문제가 발생했습니다."});
    }
};
const getLikeCheck = async (req, res) => {
    const userId = req.session?.user?.userId;
    const {postId} = req.params;

    if (!userId) {
        return res.status(401).json({message: '사용자 인증이 필요합니다.'});
    }

    try {
        const [likeResults] = await db.execute(
            "SELECT * FROM likes WHERE user_id = ? AND post_id = ?",
            [userId,postId]
        );

        const isLiked = likeResults.length>0;

        res.status(200).json({isLiked});
    } catch (error) {
        console.error('좋아요 상태 조회 중 오류 발생:', error);
        res.status(500).json({message: '좋아요 상태를 확인할 수 없습니다.'});
    }
};

// 좋아요 버튼
const getLike = async (req, res) => {
    const userId = req.session?.user?.userId;
    const {postId} = req.params;

    try {
        // 게시글 존재 여부 확인
        const [postResults] = await db.execute(
            "SELECT * FROM posts WHERE id = ?",
            [postId]
            );

        if (postResults.length === 0) {
            return res.status(404).json({ message: "해당 게시글을 찾을 수 없습니다." });
        }


        // 중복 좋아요 확인
        const [likeResults] = await db.execute(
            "SELECT * FROM likes WHERE user_id = ? AND post_id = ?",
            [userId, postId]
        );
        if (likeResults.length > 0) {
            return res.status(400).json({ message: "이미 좋아요를 누르셨습니다." });
        }

        // 좋아요 추가
        await db.execute(
            "INSERT INTO likes (user_id, post_id) VALUES (?, ?)",
            [userId, postId]
        );

        // 게시글 좋아요 수 증가
        await db.execute(
            "UPDATE posts SET like_count = like_count + 1 WHERE id = ?",
            [postId]
        );

        res.status(201).json({message: '좋아요가 추가되었습니다.'});
    } catch (error) {
        console.error('좋아요 추가 중 오류 발생:', error);
        res.status(500).json({message: '좋아요 추가 중 오류가 발생했습니다.'});
    }
};

// 좋아요 취소
const DeleteLike = async (req, res) => {
    const userId = req.session?.user?.userId;
    const {postId} = req.params;

    try {
        if (!userId) {
            return res.status(401).json({ message: "사용자 인증이 필요합니다." });
        }
        // 좋아요 여부 확인
        const [likeResults] = await db.execute(
            "SELECT * FROM likes WHERE user_id = ? AND post_id = ?",
            [userId, postId]
        );
        // 좋아요가 없을 경우
        if (likeResults.length === 0) {
            return res.status(400).json({ message: "좋아요 기록이 없습니다." });
        }

        // 해당 게시물의 likeCount 감소
        await db.execute(
            "DELETE FROM likes WHERE user_id = ? AND post_id = ?",
            [userId, postId]
        );

        // 게시글 좋아요 수 감소
        await db.execute(
            "UPDATE posts SET like_count = GREATEST(like_count - 1, 0) WHERE id = ?",
            [postId,]
        );

        res.status(200).json({message: '좋아요가 취소되었습니다.'});
    } catch (error) {
        console.error(error);
        res.status(500).json({message: '좋아요 취소 중 오류가 발생했습니다.'});
    }
};
const getPostImg = async (req, res) => {
    const { postId } = req.params;

    try {
        // 데이터베이스에서 이미지 경로만 조회
        const [postResults] = await db.execute(
            "SELECT post_image AS postImagePath, title, body FROM posts WHERE id = ?",
            [postId]
        );

        if (postResults.length === 0) {
            return res.status(404).json({ message: "게시글을 찾을 수 없습니다." });
        }

        const { postImagePath, title, body } = postResults[0];

        res.status(200).json({ postImagePath, title, body });

    } catch (error) {
        console.error("이미지 데이터 조회 중 오류 발생:", error);
        res.status(500).json({ message: "서버 오류가 발생했습니다." });
    }
};


const postsController = {
    postPost,
    getPosts,
    getPost,
    editPost,
    deletePost,
    getComments,
    postComments,
    putComments,
    getLikeCheck,
    deleteComments,
    getLike,
    DeleteLike,
    getPostImg
};

export default postsController;