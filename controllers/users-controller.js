import path from 'path';
import { promises as fsPromises } from 'fs'; // 비동기 파일 작업용
import { fileURLToPath } from 'url';
import bcrypt from 'bcrypt';

// __dirname 설정
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 데이터 경로 설정
const userPath = path.join(__dirname, '../../users.json');
const postPath = path.join(__dirname, '../../posts.json');
const commentsPath = path.join(__dirname, '../../comments.json'); // 댓글 데이터 경로


//const {postSignup} = require("./auth-controller");

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
// info 수정기능 (우선은 닉네임만 변경 가능)
const putInfo = async (req, res) => {
    try {
        const userId = req.session.user.userId;

        if (!userId) {
            return res.status(401).json({ message: "로그인이 필요합니다." });
        }

        // 파일 읽어오기
        const rawUsers = await fsPromises.readFile(userPath, "utf-8");

        // JSON 파싱
        const users = JSON.parse(rawUsers);

        // 유저 찾기
        console.log(users);
        console.log("userId 타입:", typeof userId, "값:", userId);

        const user = users.find(u => u.userId === Number(userId));
        if (!user) {
            return res.status(404).json({ message: "해당 유저를 찾을 수 없습니다." });
        }

        // 닉네임 변경 (요청에 name이 있으면 업데이트)
        if (req.body.name) {
            user.name = req.body.name;
        }

        // 프로필 사진 변경 (파일이 업로드된 경우에만 업데이트)
        if (req.file) {
            const profileImagePath = `/img/profile/${req.file.filename}`;
            user.profileImagePath = profileImagePath;
        }

        // 변경된 데이터를 파일에 저장
        await fsPromises.writeFile(userPath, JSON.stringify(users, null, 2), "utf-8");

        // 클라이언트에 응답 반환
        return res.status(200).json({
            message: "이름이 성공적으로 변경되었습니다.",
            user, // 변경된 유저 정보 반환
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

        // 새 비밀번호 해싱
        const newPassword = bcrypt.hashSync(password, 10);

        // 파일 읽기
        const rawUsers = await fsPromises.readFile(userPath, "utf-8");

        // JSON 파싱
        const users = JSON.parse(rawUsers);

        // 유저 찾기
        console.log("전체 유저 데이터:", users);
        const user = users.find(u => u.userId === Number(userId));
        if (!user) {
            return res.status(404).json({ message: "해당 유저를 찾을 수 없습니다." });
        }

        // 비밀번호 변경
        user.password = newPassword;

        // 변경 후 데이터 확인
        console.log("변경된 유저 데이터:", user);

        // 변경된 데이터를 파일에 저장
        await fsPromises.writeFile(userPath, JSON.stringify(users, null, 2), "utf-8");

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
        // users,댓글,게시글데이터 가져오기
        const rawUsers = await fsPromises.readFile(userPath, "utf-8");
        const rawPosts = await fsPromises.readFile(postPath, "utf-8");
        const rawComments= await  fsPromises.readFile(commentsPath, 'utf-8');
        // JSON 파싱
        const users = JSON.parse(rawUsers);
        const posts = JSON.parse(rawPosts);
        const comments = JSON.parse(rawComments);

        // 유저id와 관련된 게시글  삭제(특정 유저 제외하고 반환)
        const updatePosts = posts.filter(u => u.userId !== Number(userId));
        const updatedComments = comments.filter(u => u.userId !== Number(userId));
        const updatedUsers = users.filter(u => u.userId !== Number(userId));
        console.log(updatedUsers);
        //데이터 저장
        await fsPromises.writeFile(userPath, JSON.stringify(updatedUsers, null, 2), "utf-8");
        await fsPromises.writeFile(postPath, JSON.stringify(updatePosts, null, 2), "utf-8");
        await fsPromises.writeFile(commentsPath, JSON.stringify(updatedComments, null, 2), "utf-8");
        // 이미지도 지워야하네 생각해보니(안지워도 작동은 되지만)
        return res.status(204).json({message: "회원정보가 정상적으로 삭제되었습니다."});
    }
    catch (err) {
    console.error("회원정보 삭제 중 오류 발생:", err);
    return res.status(500).json({ message: "서버 오류가 발생했습니다." });
}
};
const getCheckName = async (req, res) => {
    const editName = req.query.name; // 쿼리 파라미터에서 값 가져오기
    console.log("닉네임 확인 요청:", editName);
    try {
        // 유저 데이터 가져오기
        const rawUsers = await fsPromises.readFile(userPath, "utf-8");
        const users = JSON.parse(rawUsers || "[]");

        // 닉네임 중복 확인
        const isDuplicate = users.some(user => user.name === editName);

         if (isDuplicate) {
             return res.status(409).json({ message: "이미 사용 중인 닉네임입니다." });
         }
        // 사용 가능한 닉네임
        res.status(200).json({ message: "사용 가능한 닉네임입니다." });

    } catch (error) {
        console.error("유저 데이터 로드중 오류발생:", error);
        res.status(500).json({ message: "서버 오류가 발생했습니다." });
    }
};
const getTest= async (req, res) => {
    console.log("세션 데이터:", req.session.user);
    res.send("확인");
}


const usersController ={
    postLogout,
    putInfo,
    putPassword,
    deleteInfo,
    getCheckName,
    getTest
}
export default usersController;
