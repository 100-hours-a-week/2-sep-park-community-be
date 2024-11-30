import express from "express";
import expressSession from "express-session";
import multer from "multer";
import postsController from '../controllers/posts-controller.js';
import { fileURLToPath } from 'url';
import path from "path";
// __dirname 설정
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
//Router 생성
const postsRouter = express.Router();


// Multer: 게시글 이미지 저장 설정
const postStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        // 프로젝트 루트 기준으로 img/profile 디렉토리 설정
        const dir = path.join(__dirname, "../../img/posts");
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8'); // 인코딩 변환
        const sanitizedName = originalName.replace(/\s+/g, '_'); // 공백 제거 및 치환
        cb(null, sanitizedName);
    },
});
const uploadPostImg = multer({storage: postStorage});
//게시글 목록 조회
postsRouter.get("/",postsController.getPosts);
//게시글 상세 조회
postsRouter.get("/:postId",postsController.getPost);
//게시글 작성
postsRouter.post("/",uploadPostImg.single("postImg"),postsController.postPost);
//게시글 수정
postsRouter.put("/:postId",uploadPostImg.single("editPostImg"),postsController.editPost);
//게시글 삭제
postsRouter.delete("/:postId",postsController.deletePost);
//댓글 작성
postsRouter.post("/:postId/comments",postsController.postComments);
//댓글 조회
postsRouter.get("/:postId/comments",postsController.getComments);
//댓글 수정
postsRouter.put("/:postId/comments/:commentId",postsController.putComments);
//댓글 삭제
postsRouter.delete("/:postId/comments/:commentId",postsController.deleteComments);
// 좋아요 누르기
postsRouter.get("/:postId/like",postsController.getLike);
//좋아요 취소하기
postsRouter.delete("/:postId/like",postsController.DeleteLike);
//댓글 목록 조회
postsRouter.get("/:postId/like/likeCheck",postsController.getLikeCheck);
// ES6 방식으로 내보내기
export default postsRouter;
