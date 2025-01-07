import path from 'path';
import { promises as fsPromises } from 'fs'; // 비동기 파일 작업용
import { fileURLToPath } from 'url';
import bcrypt from 'bcrypt';
import db from '../config/db.js'; // 데이터베이스 연결 불러오기
// __dirname 설정
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const postLogout = (req,res)=>{
    req.session.destroy(err => {
        if (err) {
            console.error("세션 삭제 오류:", err);
            return res.status(500).json({message: "로그아웃에 실패했습니다."});
        }
        res.clearCookie('connect.sid'); // 세션 쿠키 삭제
        res.status(200).json({message: "로그아웃 성공"});
    });
};
// info 수정기능
const putInfo = async (req, res) => {
    try {
        const userId = req.session.user.userId;

        if (!userId) {
            return res.status(401).json({ message: "로그인이 필요합니다." });
        }

        // 유저 조회
        const  [userResults] = await db.execute(
            "SELECT * FROM users WHERE id = ? ",
            [userId]
        );
        const user = userResults[0];

        if (!user) {
            return res.status(404).json({ message: "해당 유저를 찾을 수 없습니다." });
        }

        if(req.body.name){
            const newName = req.body.name;
            // 현재 닉네임과 동일한지 확인
            if (user.name === newName) {
                return res.status(409).json({ message: "현재 닉네임과 동일한 이름입니다." });
            }
            //닉네임 중복 체크
            const [nameCheckResult] = await db.execute(
                "SELECT * FROM users WHERE name = ? AND id != ?" ,
                [newName,userId]
            );
            if(nameCheckResult.length>0){
                return res.status(409).json({message:"닉네임 중복"});
            }
            user.name=newName
        }

        // 프로필 사진 변경 (파일이 업로드된 경우에만 업데이트)
        if (req.file) {
            const profileImagePath = `/img/profile/${req.file.filename}`;
            user.profile_image = profileImagePath;
        }



        await db.execute(
            "UPDATE users SET name = ?, profile_image =? WHERE id = ?",
            [user.name, user.profile_image, userId],
        );
        req.session.user.profileImg=user.profile_image;
        req.session.user.nickname = user.name;
        // 클라이언트에 응답 반환
        return res.status(200).json({
            message: "이름이 성공적으로 변경되었습니다.",
            user: {
                id: userId,
                name: user.name,
                profileImage: user.profile_image,
            },
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: "서버 오류가 발생했습니다." });
    }
};

const putPassword = async (req, res) => {
    try {
        const userId = req.session.user.userId;
        const password = req.body.password;

        if (!userId) {
            return res.status(401).json({ message: "로그인이 필요합니다." });
        }

        if (!password || typeof password !== 'string' || password.trim().length < 8) {
            return res.status(400).json({ message: "유효한 비밀번호를 입력해주세요. (최소 8자)" });
        }

        // 새 비밀번호 해싱 (비동기 방식)
        const newPassword = await bcrypt.hash(password, 10);

        // 유저 조회
        const [userResults] = await db.execute(
            "SELECT * FROM users WHERE id = ? ",
            [userId]
        )
        //유저 조회 못할경우
        if (userResults.length === 0) {
            return res.status(404).json({ message: "유저를 찾을 수 없습니다." });
        }


        // 비번 업데이트
        await db.execute(
            "UPDATE users SET password = ? WHERE id =?",
            [newPassword,userId]
        )
        // 클라이언트에 성공 응답
        return res.status(200).json({ message: "비밀번호가 성공적으로 변경되었습니다." });
    } catch (err) {
        console.error("비밀번호 변경 중 오류 발생:", err);
        return res.status(500).json({ message: "서버 오류가 발생했습니다." });
    }
};
const deleteInfo = async (req, res) => {
    try {
        // userid 세션을 통해 가져오기
        const userId = req.session.user.userId;
        if (!userId) {
            return res.status(404).json({message: "해당 유저를 찾을 수 없습니다."});
        }
        const [userResults] = await db.execute(
            "SELECT * FROM users WHERE id = ? ",
            [userId]
        );
        const user = userResults[0];
        res.clearCookie('connect.sid'); // 세션 쿠키 삭제
        // 데이터베이스에서 관련 데이터 삭제 (댓글 -> 게시글 -> 유저 순서)
        await db.execute("DELETE FROM comments WHERE user_id = ?", [userId]);
        await db.execute("DELETE FROM posts WHERE user_id = ?", [userId]);
        await db.execute("DELETE FROM users WHERE id = ?", [userId]);


        // 이미지도 지워야하네 생각해보니(안지워도 작동은 되지만)
        return res.status(204).json({message: "회원정보가 정상적으로 삭제되었습니다."});
    }
    catch (err) {
    console.error("회원정보 삭제 중 오류 발생:", err);
    return res.status(500).json({ message: "서버 오류가 발생했습니다." });
}
};
const usersController ={
    postLogout,
    putInfo,
    putPassword,
    deleteInfo
}
export default usersController;
