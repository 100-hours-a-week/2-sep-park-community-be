import express from "express";
import uploadController from "../controllers/upload-controller.js";
// Router 생성
const uploadRouter = express.Router();

uploadRouter.get('/presigned-url',uploadController. getPresigned);


export default uploadRouter;