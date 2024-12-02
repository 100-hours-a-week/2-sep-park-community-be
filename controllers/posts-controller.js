import path from 'path';
import { promises as fsPromises } from 'fs'; // 비동기 파일 작업용
import { fileURLToPath } from 'url';

// __dirname 설정

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 데이터 경로 설정
const likePath = path.join(__dirname, '../..//2-sep-park-community-be/models/likes.json');
const userPath = path.join(__dirname, "../../2-sep-park-community-be/models/users.json");
const postPath = path.join(__dirname, '../../2-sep-park-community-be/models/posts.json');
const commentsPath = path.join(__dirname, '../../2-sep-park-community-be/models/comments.json');
//const fileSystem = require("fs");
// 게시글 데이터 읽기 함수
const readPosts = async () => {
    try {
        const data = await fsPromises.readFile(postPath, "utf-8");
        return JSON.parse(data || "[]");
    } catch (error) {
        if (error.code === "ENOENT") {
            // 파일이 없을 경우 초기화
            await fsPromises.writeFile(postPath, JSON.stringify([], null, 2), "utf-8");
            return [];
        }
        throw error;
    }
};

// 게시글 데이터 쓰기 함수
const writePosts = async (posts) => {
    await fsPromises.writeFile(postPath, JSON.stringify(posts, null, 2), "utf-8");
};

//게시글 목록조회
const getPosts = async (req, res) => {
    //세선정보 없을때(로그인이 안됨)
    if(!req.session.user){
        return res.status(401).json({ message: 'Unauthorized' }); // 로그인이 필요함
    }

    try {
        //json파일경로 읽어오기
        const rawPosts =await fsPromises.readFile(postPath, 'utf-8');
        const rawUsers =await fsPromises.readFile(userPath, 'utf-8');
        //파싱
        const posts = JSON.parse(rawPosts);
        const users = JSON.parse(rawUsers);
        //id 대조해서 정보저장
        const formattedPosts = posts.map(post => {
            const user = users.find(u => u.userId === post.userId) || {};
            return {
                postId: post.postId,
                title: post.title,
                content: post.content,
                postImagePath: post.postImagePath,
                dateAt: post.DateAt,
                author: user.name || "Unknown",
                profileImage: user.profileImagePath || null,
                likeCount: post.likeCount || 0,
                commentCount: post.commentCount || 0,
                viewCount: post.viewCount || 0,
            };
        });

        res.status(200).json({
            message: "데이터 목록 조회 성공",
            data: {posts: formattedPosts},
        });
    } catch (error) {
        res.status(500).json({
            message: "데이터 목록 조회 실패",
            error: error.message,
        });
    }
};


//게시글상세조회
const getPost = async (req, res) => {
    try {
        const {postId} =req.params;
        console.log('Received postId:', postId);
        // 파일 읽기
        const rawPosts =await fsPromises.readFile(postPath, 'utf-8');
        const rawUsers =await fsPromises.readFile(userPath, 'utf-8');
        const posts = JSON.parse(rawPosts);
        const users = JSON.parse(rawUsers);

        // 특정 게시글 찾기
        const post = posts.find((post) => post.postId === Number(postId));
        if (!post) {
            return res.status(404).json({
                message: "게시글을 찾을 수 없습니다2.",
            });
        }
        // 조회수 증가
        post.viewCount = (post.viewCount || 0) + 1;

        // 파일 업데이트
        await fsPromises.writeFile(postPath, JSON.stringify(posts, null, 2));
        // 작성자 정보 매핑
        const user = users.find((u) => u.userId === post.userId) || {};

        // 상세 게시글 데이터 구성
        const formattedPost = {
            postId: post.postId,
            title: post.title,
            content: post.content,
            postImagePath: post.postImagePath,
            dateAt: post.DateAt,
            author: user.name || "Unknown",
            profileImage: user.profileImagePath || null,
            likeCount: post.likeCount || 0,
            commentCount: post.commentCount || 0,
            viewCount: post.viewCount || 0
        };

        res.status(200).json({
            message: "Post retrieved successfully",
            data: {post: formattedPost},
        });
    } catch (error) {
        res.status(500).json({
            message: "Failed to retrieve post",
            error: error.message,
        });
    }
};
// 게시글 작성
const postPost = async (req, res) => {
    try {
        const { title, content } = req.body;
        const user = req.session?.user?.userId;
        console.log("바디내용", title, content);
        console.log("유저",user);
        // 사용자 확인
        if (!req.session.user) {
            return res.status(401).json({ message: "로그인이 필요합니다." });
        }

        const { userId: userId } = user; // 사용자 ID 추출

        // 유효성 검사
        if (!title || !content) {
            return res.status(400).json({ message: "제목과 내용을 입력해주세요." });
        }

        // 게시글 데이터 읽기
        const posts = await readPosts();

        // 이미지 경로 설정
        const postImagePath = req.file ? `/img/posts/${req.file.filename}` : null;

        // 날짜와 시간 포맷팅
        const now = new Date();
        const formattedDate = now.toISOString().slice(0, 10); // YYYY-MM-DD
        const formattedTime = now.toTimeString().slice(0, 8); // HH:MM:SS
        const DateAt = `${formattedDate} ${formattedTime}`;

        // 새 게시글 ID 생성
        const newPostId = posts.length > 0 ? Math.max(...posts.map((post) => post.postId)) + 1 : 1;

        // 게시글 객체 생성
        const newPost = {
            userId:user,
            postId: newPostId,
            title,
            content,
            postImagePath,
            DateAt,
            likeCount: 0,
            commentCount: 0,
            viewCount: 0,
        };

        // 게시글 추가
        posts.push(newPost);

        // 게시글 저장
        await writePosts(posts);

        // 로그로 게시글 정보 확인
        console.log("게시글 저장:", newPost);
        res.status(201).json({ message: "게시글이 생성되었습니다.", post: newPost });
    } catch (error) {
        console.error("게시글 작성 중 오류 발생:", error);
        res.status(500).json({ message: "서버에서 문제가 발생했습니다." });
    }
};

//// PUT: 게시글 수정
const editPost = async (req, res) => {
    try {
    const { postId } = req.params;
    const updatedData = req.body;
    const uploadedFile = req.file || null;

    console.log(`postId: ${postId}`);
    console.log('수정할 데이터:', updatedData);
    console.log('업로드된 파일:', uploadedFile);

    // 데이터 유효성 검사
    if (!updatedData.editTitle || !updatedData.editContent) {
        return res.status(400).json({ message: "제목과 내용을 모두 입력해주세요." });
    }


        // posts.json 읽기
        const data = await fsPromises.readFile(postPath, 'utf8');
        const posts = JSON.parse(data);
        const userId = req.session?.user?.userId; // 세션에서 사용자 ID 추출

        // 게시글 찾기
        const postIndex = posts.findIndex((post) => post.postId === Number(postId));
        if (postIndex === -1) {
            return res.status(404).json({ message: '해당 게시글을 찾을 수 없습니다.' });
        }

        // 권한 확인
        if (posts[postIndex].userId !== userId) {
            return res.status(403).json({ message: '게시글 수정 권한이 없습니다.' });
        }

        // 파일 경로 설정 (새 파일 업로드 여부 확인)
        const postImagePath = uploadedFile ? `/posts/${uploadedFile.filename}` : posts[postIndex].postImagePath;

        // 게시글 데이터 업데이트
        posts[postIndex] = {
            ...posts[postIndex],
            title: updatedData.editTitle,
            content: updatedData.editContent,
            postImagePath,
        };

        console.log('수정된 게시글:', posts[postIndex]);

        // 파일 저장
        await fsPromises.writeFile(postPath, JSON.stringify(posts, null, 2), 'utf8');
        console.log('posts.json 파일이 성공적으로 업데이트되었습니다.');

        // 성공 응답
        res.status(200).json({ message: '게시글이 성공적으로 수정되었습니다.', post: posts[postIndex] });
    } catch (error) {
        console.error('서버 오류 발생:', error);
        res.status(500).json({ message: '서버에서 문제가 발생했습니다.' });
    }
};

// 게시글 삭제 API
const deletePost = async (req, res) => {
    try {
    const { postId } = req.params;
    console.log('Received postId:', postId);

    // 세션에서 사용자 ID 가져오기
    const userId = req.session?.user?.userId;
    if (!userId) {
        return res.status(401).json({ message: '사용자 인증이 필요합니다.' });
    }


        // posts.json 읽기
        const data = await fsPromises.readFile(postPath, 'utf8');
        const posts = JSON.parse(data);

        // 삭제 대상 게시글 찾기
        const postIndex = posts.findIndex((post) => post.postId === Number(postId));
        if (postIndex === -1) {
            return res.status(404).json({ message: '해당 게시글을 찾을 수 없습니다.' });
        }

        // 권한 확인
        if (posts[postIndex].userId !== userId) {
            return res.status(403).json({ message: '게시글 삭제 권한이 없습니다.' });
        }

        // 게시글 삭제
        posts.splice(postIndex, 1); // 해당 인덱스의 게시글 삭제
        await fsPromises.writeFile(postPath, JSON.stringify(posts, null, 2), 'utf8');
        console.log(`게시글 ID ${postId} 삭제 완료`);

        res.status(200).json({ message: '게시글이 성공적으로 삭제되었습니다.' });
    } catch (error) {
        console.error('서버 오류:', error.message);
        res.status(500).json({ message: '서버 오류: 게시글 삭제 실패' });
    }
};
//댓글 목록
// 댓글 조회
const getComments = async (req, res) => {
    try {
    const { postId } = req.params; // 게시글 ID
    if (!req.session.user) {
        return res.status(401).json({ message: 'Unauthorized' }); // 로그인이 필요함
    }


        // 댓글 및 사용자 데이터 읽기
        const rawComments = await fsPromises.readFile(commentsPath, 'utf-8');
        const rawUsers = await fsPromises.readFile(userPath, 'utf-8');
        const comments = JSON.parse(rawComments || '[]');
        const users = JSON.parse(rawUsers || '[]');

        // 댓글 필터링 (해당 게시글 ID에 해당하는 댓글만 추출)
        const filteredComments = comments.filter(comment => comment.postId === Number(postId));

        // 댓글 작성자 정보 매칭 및 포맷팅
        const formattedComments = filteredComments.map(comment => {
            const user = users.find(u => u.userId === comment.userId) || {};
            return {
                commentId: comment.commentId,
                content: comment.content,
                dateAt: comment.dateAt, // 클라이언트와 동일한 필드명 사용
                author: user.name || "Unknown",
                profile_image: user.profileImagePath || "/img/default-profile.png",
            };
        });


        res.status(200).json({
            message: "Comments retrieved successfully",
            data: {
                postId: Number(postId),
                comments: formattedComments,
            },
        });
    } catch (error) {
        console.error('댓글 조회 중 오류:', error);
        res.status(500).json({
            message: "Failed to retrieve comments",
            error: error.message,
        });
    }
};


//댓글작성
const postComments = async (req, res) => {
   try {
    console.log("요청 데이터:", req.body); // 요청 데이터 확인
    const { postId } = req.params;
    const userId = req.session?.user?.userId;// 세션에서 userId 가져오기
    const { text } = req.body;

    console.log("userId:", userId);
    console.log("댓글 내용:", text);

    if (!userId) {
        return res.status(401).json({ message: "로그인이 필요합니다." });
    }

        // 댓글 추가 로직
        const rawComments = await fsPromises.readFile(commentsPath, 'utf-8');
        const rawPosts = await fsPromises.readFile(postPath, 'utf-8');
        const comments = JSON.parse(rawComments);
        const posts = JSON.parse(rawPosts);

        const newCommentId = comments.length > 0
            ? Math.max(...comments.map(comment => comment.commentId)) + 1 : 1;

        const now = new Date();
        const formattedDate = now.toISOString().slice(0, 10); // YYYY-MM-DD
        const formattedTime = now.toTimeString().slice(0, 8); // HH:MM:SS
        const dateAt = `${formattedDate} ${formattedTime}`;

        const newComment = {
            commentId: newCommentId,
            postId: Number(postId),
            userId,
            content: text.trim(),
            dateAt,
        };
        comments.push(newComment);
        // 게시글의 댓글 카운트 업데이트
        console.log("게시글id 체크: ",postId);
        const post = posts.find((p) => p.postId === Number(postId));
        if (post) {
         post.commentCount = (post.commentCount || 0) + 1;
        }
        await fsPromises.writeFile(commentsPath, JSON.stringify(comments, null, 2), 'utf-8');
        await fsPromises.writeFile(postPath, JSON.stringify(posts, null, 2));
        res.status(201).json({
            message: '댓글이 성공적으로 작성되었습니다.',
            comment: newComment,
        });
    } catch (error) {
        console.error('서버 오류 발생:', error.message);
        res.status(500).json({ message: '서버 오류: 댓글 작성 실패' });
    }
};


//댓글수정
const putComments = async (req, res) => {
    try {
    console.log("요청 URL:", req.originalUrl); // 요청된 URL 확인
    console.log("req.params:", req.params); // 모든 params 확인
    const { postId, commentId } = req.params;
    const userId = req.session?.user?.userId; // 세션에서 userId 가져오기
    const {text} = req.body;
    console.log("userId:", userId);
    console.log("게시글 정보:", postId);
    console.log("댓글 정보:", commentId);
    console.log("수정 댓글내용:", text);
    // 1. 유저 인증 확인
    if (!userId) {
        return res.status(401).json({ message: "로그인이 필요합니다." });
    }


        // 2. 파일에서 댓글 데이터 읽기
        const commentsData = await fsPromises.readFile(commentsPath, 'utf-8');
        const comments = JSON.parse(commentsData); // JSON 파일 파싱
        console.log(comments);
        // 3. 댓글 찾기
        const comment = comments.find(
            (c) => c.commentId === Number(commentId) && c.postId === Number(postId)
        );

        if (!comment) {
            // 댓글이 존재하지 않는 경우
            return res.status(404).json({ message: "해당 댓글을 찾을 수 없습니다." });
        }
        console.log("댓글 작성자 아이디 비교",comment.userId);
        console.log("유저 아이디 비교",userId);
        // 4. 댓글 작성자와 현재 유저 비교
        if (comment.userId !== userId) {
            console.log("403 반환 조건 충족");
            return res.status(403).json({ message: "댓글 수정 권한이 없습니다." });
        }
        // 5. 댓글 수정
        const updatedComments = comments.map((c) => {
            if (c.commentId === Number(commentId) && c.postId === Number(postId)) {
                return { ...c, content: text }; // 기존 데이터를 유지하며 content만 수정
            }
            return c;
        });

        // 6. 변경된 데이터 다시 저장
        await fsPromises.writeFile(commentsPath, JSON.stringify(updatedComments, null, 2), 'utf-8');

        return res.status(200).json({ message: "댓글이 성공적으로 수정되었습니다." });
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
    const { postId, commentId } = req.params;
    const userId = req.session?.user?.userId; // 세션에서 userId 가져오기

    console.log("게시글 정보:", postId);
    console.log("댓글 정보:", commentId);

    // 1. 유저 인증 확인
    if (!userId) {
        return res.status(401).json({ message: "로그인이 필요합니다." });
    }


        // 2. 파일에서 댓글 데이터 읽기
        const rawPosts = await fsPromises.readFile(postPath, 'utf-8');
        const rawComments = await fsPromises.readFile(commentsPath, 'utf-8');
        const comments = JSON.parse(rawComments); // JSON 파일 파싱
        const posts = JSON.parse(rawPosts);
        console.log(comments);
        // 3. 댓글 찾기
        const comment = comments.find(
            (c) => c.commentId === Number(commentId) && c.postId === Number(postId)
        );

        if (!comment) {
            // 댓글이 존재하지 않는 경우
            return res.status(404).json({ message: "해당 댓글을 찾을 수 없습니다." });
        }

        // 4. 댓글 작성자와 현재 유저 비교
        if (comment.userId !== userId) {
            return res.status(403).json({ message: "댓글 삭제 권한이 없습니다." });
        }

        // 5. 댓글 삭제 (댓글 제외한 데이터 새로 작성)
        const updatedComments = comments.filter((c) => c.commentId !== Number(commentId));
        // 게시글 댓글 카운트 감소 (0 이하 방지)
        const post = posts.find((p) => p.postId === Number(postId));
        if (post) {
            post.commentCount = Math.max((post.commentCount || 0) - 1, 0);
        }

        await fsPromises.writeFile(postPath, JSON.stringify(posts, null, 2));
        await fsPromises.writeFile(commentsPath, JSON.stringify(updatedComments, null, 2), 'utf-8');

        return res.status(200).json({ message: "댓글이 성공적으로 삭제되었습니다." });
    } catch (error) {
        console.error("댓글 삭제 중 오류 발생:", error);
        return res.status(500).json({ message: "댓글 삭제 중 문제가 발생했습니다." });
    }
};
const getLikeCheck = async (req, res) => {
    const userId = req.session?.user?.userId;
    const { postId } = req.params;

    if (!userId) {
        return res.status(401).json({ message: '사용자 인증이 필요합니다.' });
    }

    try {
        // likes.json 파일 읽기
        let rawLikes;
        try {
            rawLikes = await fsPromises.readFile(likePath, 'utf-8');
        } catch (err) {
            if (err.code === 'ENOENT') {
                // 파일이 없을 경우 초기화
                await fsPromises.writeFile(likePath, JSON.stringify([], null, 2), 'utf-8');
                rawLikes = '[]';
            } else {
                throw err; // 다른 오류는 그대로 던짐
            }
        }

        console.log('likes.json 파일 내용:', rawLikes); // 디버깅 로그

        // JSON 파싱
        let likes;
        try {
            likes = rawLikes.trim() ? JSON.parse(rawLikes) : []; // 빈 문자열 처리
        } catch (err) {
            console.error('likes.json 파일 파싱 중 오류 발생:', err);
            return res.status(500).json({ message: '좋아요 데이터를 처리할 수 없습니다.' });
        }

        // 좋아요 여부 확인
        const isLiked = likes.some(like => like.userId === userId && like.postId === parseInt(postId));

        res.status(200).json({ isLiked });
    } catch (error) {
        console.error('좋아요 상태 조회 중 오류 발생:', error);
        res.status(500).json({ message: '좋아요 상태를 확인할 수 없습니다.' });
    }
};

// 좋아요 버튼
const getLike = async (req, res) => {
    const userId = req.session?.user?.userId;
    const { postId } = req.params;

    try {

        // JSON 파일 읽기
        const rawPosts = await fsPromises.readFile(postPath, 'utf-8');
        const rawLikes = await fsPromises.readFile(likePath, 'utf-8');

        const posts = JSON.parse(rawPosts || '[]');
        const likes = JSON.parse(rawLikes || '[]');

        // 게시글 존재 여부 확인
        const post = posts.find(post => post.postId === Number(postId));


        // 중복 좋아요 확인
        const existingLike = likes.find(like => like.userId === userId && like.postId === Number(postId));
        if (existingLike) {
            return res.status(400).json({ message: '이미 좋아요를 누르셨습니다.' });
        }

        // 좋아요 추가
        likes.push({ userId, postId: Number(postId) });
        post.likeCount = (post.likeCount || 0) + 1;

        // JSON 파일 저장
        await fsPromises.writeFile(likePath, JSON.stringify(likes, null, 2), 'utf-8');
        await fsPromises.writeFile(postPath, JSON.stringify(posts, null, 2), 'utf-8');

        res.status(201).json({ message: '좋아요가 추가되었습니다.', likeCount: post.likeCount });
    } catch (error) {
        console.error('좋아요 추가 중 오류 발생:', error);
        res.status(500).json({ message: '좋아요 추가 중 오류가 발생했습니다.' });
    }
};

// 좋아요 취소
const DeleteLike = async (req, res) => {
    const userId = req.session?.user?.userId;
    const { postId } = req.params;

    try {
        // 기존 데이터 읽기
        const rawPosts = await fsPromises.readFile(postPath, 'utf-8');
        const rawLikes = await fsPromises.readFile(likePath, 'utf-8');
        const posts = JSON.parse(rawPosts);
        const likes = JSON.parse(rawLikes);

        // 좋아요 삭제
        const newLikes = likes.filter(like => !(like.userId === userId && like.postId === Number(postId)));

        // 좋아요가 없을 경우
        if (newLikes.length === likes.length) {
            return res.status(400).json({ message: '좋아요 기록이 없습니다.' });
        }

        // 해당 게시물의 likeCount 감소
        const post = posts.find(post => post.postId === Number(postId));
        post.likeCount -= 1;

        // 데이터 저장
        await fsPromises.writeFile(likePath, JSON.stringify(newLikes, null, 2), 'utf-8');
        await fsPromises.writeFile(postPath, JSON.stringify(posts, null, 2), 'utf-8');

        res.status(200).json({ message: '좋아요가 취소되었습니다.', likeCount: post.likeCount });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: '좋아요 취소 중 오류가 발생했습니다.' });
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
    DeleteLike
};

export default postsController;